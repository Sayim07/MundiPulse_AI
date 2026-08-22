"""
MandiPulse AI — FastAPI Backend Entrypoint
Provides endpoints for:
  - /api/query          → Trigger price fetch + Python margins + Gemini wording
  - /api/query/stream   → SSE stream of real agent logs
  - /api/approve        → Human-in-the-loop approval gate
  - /api/history        → Past query run history
  - /api/health         → Health check
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.webcmd_runner import run_price_fetch
from config import settings
from llm.gemini_client import explain_and_localize, recommendation_from_facts, draft_alerts_from_facts
from models.price_record import QueryRequest, ApprovalRequest
from services.margin_calculator import calculate_margins, facts_for_llm
from services.runtime_store import complete_pending, get_pending, get_run, list_history, put_pending
from services.officer_auth import get_current_officer, login_officer, register_officer
from services.officers_store import officer_address
from services.recipients_store import add_recipient, list_recipients, remove_recipient
from services.sms_dispatcher import send_sms
from services.sms_inbox import list_inbox, record_inbound

app = FastAPI(
    title="KrishiDrishti AI",
    description="Autonomous Agri-Arbitrage Agent — Backend API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
async def root():
    return {
        "status": "online",
        "service": "KrishiDrishti AI API",
        "docs": "/docs",
        "timestamp": _now(),
    }



def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def execute_pipeline(req: QueryRequest, log_callback) -> dict:
    """
    live fetch → validate (inside runner) → Python margins → Gemini wording.
    Live zero-rows → labelled DEMO fallback. HITL still required.
    """
    requested = (req.mode or "live").lower()
    data_mode = requested

    records = await run_price_fetch(
        crop=req.crop,
        district=req.district,
        state=req.state,
        mode=requested,
        log_callback=log_callback,
        commodity_id=req.commodity_id,
        district_id=req.district_id,
        state_id=req.state_id,
        market_id=req.market_id,
        market_name=req.market_name,
    )

    catalog_live = bool(req.commodity_id and req.district_id)
    if requested == "live" and not records and catalog_live:
        await log_callback(
            {
                "type": "system",
                "msg": "[KrishiDrishti] Agmarknet has no live rows for this search. Not substituting demo snapshot.",
            }
        )
        data_mode = "live"
    elif requested == "live" and not records and not catalog_live:
        await log_callback(
            {
                "type": "system",
                "msg": "[KrishiDrishti] Live fetch returned 0 valid rows. Falling back to labelled DEMO (not live portal data).",
            }
        )
        records = await run_price_fetch(
            crop=req.crop,
            district=req.district,
            state=req.state,
            mode="demo",
            log_callback=log_callback,
        )
        data_mode = "demo"
    elif requested == "demo":
        data_mode = "demo"
    else:
        data_mode = "live"

    records = [
        r.model_copy(update={"data_mode": data_mode})
        for r in records
    ]

    await log_callback({"type": "system", "msg": "[KrishiDrishti] Calculating transport-adjusted nets in Python (Gemini will not compute money)."})
    margin = calculate_margins(records, home_district=req.district)
    records = margin.records

    fetched_at = next((r.fetched_at for r in records if r.fetched_at), _now())
    date = records[0].date if records else fetched_at[:10]
    facts = facts_for_llm(margin, crop=req.crop, data_mode=data_mode, fetched_at=fetched_at, date=date)

    if margin.confidence == "low":
        await log_callback(
            {
                "type": "error",
                "msg": f"[KrishiDrishti] Low confidence ({margin.confidence_score}). Flags: {', '.join(margin.flags) or 'none'}. Dispatch still blocked until approval.",
            }
        )

    await log_callback({"type": "system", "msg": "[KrishiDrishti] Sending structured facts to Gemini for Bengali/English wording only..."})
    try:
        recommendation = await explain_and_localize(facts, api_key=settings.GEMINI_API_KEY)
        await log_callback({"type": "llm", "msg": "[Gemini] ✓ Wording ready (numbers copied from Python)."})
    except Exception as exc:
        await log_callback({"type": "error", "msg": f"[Gemini] Failed ({exc}); using Python template draft with the same numbers."})
        recommendation = recommendation_from_facts(facts, draft_alerts_from_facts(facts))

    # Belt-and-suspenders: UI/SMS money must match Python
    recommendation = recommendation.model_copy(
        update={
            "best_mandi": margin.best_mandi or "N/A",
            "net_margin_per_quintal": float(margin.best_net_price_per_quintal or 0),
            "home_mandi": margin.home_mandi,
            "home_net_price_per_quintal": margin.home_net_price_per_quintal,
            "additional_margin_per_quintal": margin.additional_margin_per_quintal,
            "data_mode": data_mode,
            "fetched_at": fetched_at,
            "source_portal": margin.best_source_portal,
            "confidence": margin.confidence,
            "confidence_score": margin.confidence_score,
            "requires_approval": True,
        }
    )

    await log_callback(
        {"type": "system", "msg": f"[MandiPulse] ⏸ Awaiting human approval before dispatch. data_mode={data_mode}"}
    )

    run_id = str(uuid.uuid4())[:8]
    payload = {
        "run_id": run_id,
        "query": req.model_dump(),
        "price_records": [p.model_dump() for p in records],
        "recommendation": recommendation.model_dump(),
        "status": "pending_approval",
        "created_at": _now(),
        "data_mode": data_mode,
    }
    put_pending(run_id, payload)
    return payload


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": _now()}


@app.get("/api/catalog/commodities")
async def catalog_commodities(q: str = "", limit: int = 30):
    """Live Agmarknet commodity search — not a hardcoded crop list."""
    from agent.agmarknet_live import HEADERS, get_filters, search_commodities
    import httpx

    try:
        async with httpx.AsyncClient(timeout=25.0, headers=HEADERS) as client:
            filters = await get_filters(client)
        items = search_commodities(filters, q, limit=min(limit, 50))
        return {"source": "agmarknet", "items": items}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not load live commodities: {exc}")


@app.get("/api/catalog/districts")
async def catalog_districts(q: str = "", limit: int = 30):
    """Live Agmarknet district search — not a hardcoded area list."""
    from agent.agmarknet_live import HEADERS, get_filters, search_districts
    import httpx

    try:
        async with httpx.AsyncClient(timeout=25.0, headers=HEADERS) as client:
            filters = await get_filters(client)
        items = search_districts(filters, q, limit=min(limit, 50))
        return {"source": "agmarknet", "items": items}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not load live districts: {exc}")


@app.get("/api/catalog/markets")
async def catalog_markets(district_id: int, q: str = "", limit: int = 40):
    """Live Agmarknet APMC list for a district — not a hardcoded mandi list."""
    from agent.agmarknet_live import HEADERS, get_filters, search_markets
    import httpx

    try:
        async with httpx.AsyncClient(timeout=25.0, headers=HEADERS) as client:
            filters = await get_filters(client)
        items = search_markets(filters, district_id, q, limit=min(limit, 80))
        return {"source": "agmarknet", "items": items}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not load live markets: {exc}")


@app.post("/api/auth/register")
async def auth_register(payload: dict):
    try:
        return register_officer(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/auth/login")
async def auth_login(payload: dict):
    try:
        return login_officer(payload)
    except ValueError as exc:
        msg = str(exc)
        status = 401 if msg == "Invalid email or password." else 400
        raise HTTPException(status_code=status, detail=msg)


@app.get("/api/auth/me")
async def auth_me(officer: dict = Depends(get_current_officer)):
    return {"officer": officer}


@app.get("/api/recipients")
async def get_recipients(officer: dict = Depends(get_current_officer)):
    return {
        "items": list_recipients(
            officer_email=str(officer.get("email") or ""),
        )
    }


@app.post("/api/recipients")
async def post_recipient(payload: dict, officer: dict = Depends(get_current_officer)):
    try:
        entry = add_recipient(
            str(payload.get("mobile") or ""),
            str(payload.get("label") or ""),
            crop=str(payload.get("crop") or ""),
            officer_email=str(officer.get("email") or ""),
            address=officer_address(officer),
            district=str(officer.get("district") or officer_address(officer) or ""),
            district_id=officer.get("district_id"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "item": entry,
        "items": list_recipients(
            officer_email=str(officer.get("email") or ""),
        ),
    }


@app.delete("/api/recipients/{mobile}")
async def delete_recipient(mobile: str, officer: dict = Depends(get_current_officer)):
    try:
        remove_recipient(
            mobile,
            officer_email=str(officer.get("email") or ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "items": list_recipients(
            officer_email=str(officer.get("email") or ""),
        )
    }


@app.post("/api/sms/send")
async def sms_send(payload: dict, officer: dict = Depends(get_current_officer)):
    """HITL SMS: pending or approved run_id required. Does not replace email."""
    run_id = str(payload.get("run_id") or "").strip()
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required.")
    entry = get_run(run_id)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"Run ID '{run_id}' is not pending or approved. Fetch prices, then send SMS from the HITL gate.",
        )
    status = str(entry.get("status") or "")
    if status not in {"pending_approval", "approved"}:
        raise HTTPException(
            status_code=400,
            detail="SMS can only be sent for a pending or approved price run.",
        )
    mobiles = payload.get("mobiles") or payload.get("recipients") or []
    if not isinstance(mobiles, list):
        raise HTTPException(status_code=400, detail="mobiles must be a list of Indian numbers.")
    try:
        result = await send_sms(mobiles, str(payload.get("message") or ""))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    result["run_id"] = run_id
    result["officer"] = officer.get("email")
    return result


@app.get("/api/inbox")
async def get_inbox():
    return {"items": list_inbox()}


@app.post("/api/sms/inbound")
async def sms_inbound(payload: dict):
    """Twilio-style inbound webhook: From + Body."""
    sender = str(payload.get("From") or payload.get("from") or payload.get("sender") or "")
    body = str(payload.get("Body") or payload.get("body") or payload.get("message") or "")
    if not sender and not body:
        raise HTTPException(status_code=400, detail="Inbound SMS needs From/sender and Body/message.")
    entry = record_inbound(sender=sender, body=body, provider=str(payload.get("provider") or "webhook"))
    return {"ok": True, "item": entry}


@app.post("/api/query")
async def run_query(req: QueryRequest):
    logs: list[dict] = []

    async def collect(event: dict):
        logs.append(event)

    payload = await execute_pipeline(req, collect)
    payload["logs"] = logs
    return payload


@app.post("/api/query/stream")
async def stream_query(req: QueryRequest):
    """SSE: real runner/LLM log events, then a result payload."""

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def log_callback(event: dict):
            await queue.put(event)

        async def runner():
            try:
                result = await execute_pipeline(req, log_callback)
                await queue.put({"type": "result", "payload": result})
            except Exception as exc:
                await queue.put({"type": "error", "msg": f"[KrishiDrishti] Pipeline failed: {exc}"})
            finally:
                await queue.put(None)

        task = asyncio.create_task(runner())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
        finally:
            await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/approve")
async def approve_alert(req: ApprovalRequest):
    """HITL gate. Records approval state; actual email dispatch is handled client-side."""
    entry = get_pending(req.run_id)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Run ID '{req.run_id}' is not pending. Fetch prices again, then approve."
            ),
        )

    if req.approved:
        entry["status"] = "approved"
        entry["approved_at"] = _now()
        entry["approved_by"] = req.approved_by or "organizer"
        complete_pending(req.run_id, entry)
        
        return {
            "status": "success",
            "message": "Approval recorded successfully"
        }

    entry["status"] = "rejected"
    entry["rejected_at"] = _now()
    complete_pending(req.run_id, entry)
    return {"status": "rejected", "run_id": req.run_id}


@app.get("/api/history")
async def get_history():
    return {"runs": list_history()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
