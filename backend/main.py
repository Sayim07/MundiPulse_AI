"""
MandiPulse AI — FastAPI Backend Entrypoint
Provides endpoints for:
  - /api/query          → Trigger webcmd agent price fetch + Gemini analysis
  - /api/query/stream   → SSE stream of live agent terminal logs
  - /api/approve        → Human-in-the-loop approval gate
  - /api/history        → Past query run history
  - /api/health         → Health check
"""

import asyncio
import json
import uuid
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from models.price_record import PriceRecord, LLMRecommendation, QueryRequest, ApprovalRequest
from services.mock_agent import run_mock_agent
from services.mock_gemini import generate_mock_recommendation

app = FastAPI(
    title="MandiPulse AI",
    description="Autonomous Agri-Arbitrage Agent — Backend API",
    version="1.0.0",
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory stores (replace with SQLite for persistence) ──────────────────
pending_approvals: dict[str, dict] = {}
query_history: list[dict] = []


# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Query: trigger agent + LLM pipeline ────────────────────────────────────
@app.post("/api/query")
async def run_query(req: QueryRequest):
    """
    Runs the full pipeline:
    1. webcmd agent fetches prices from portals
    2. Gemini computes best mandi recommendation
    3. Returns recommendation with requires_approval=True
    """
    run_id = str(uuid.uuid4())[:8]

    # Step 1: Mock webcmd agent scraping
    price_records = await run_mock_agent(
        crop=req.crop,
        district=req.district,
        state=req.state,
    )

    # Step 2: Mock Gemini LLM analysis
    recommendation = await generate_mock_recommendation(
        price_records=price_records,
        home_district=req.district,
    )

    # Step 3: Store as pending approval (HITL gate)
    approval_payload = {
        "run_id": run_id,
        "query": req.model_dump(),
        "price_records": [p.model_dump() for p in price_records],
        "recommendation": recommendation.model_dump(),
        "status": "pending_approval",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    pending_approvals[run_id] = approval_payload

    return approval_payload


# ── Stream: SSE endpoint for live agent terminal logs ──────────────────────
@app.post("/api/query/stream")
async def stream_query(req: QueryRequest):
    """
    Server-Sent Events stream simulating live webcmd agent terminal output.
    The frontend displays this in the Agent Terminal window.
    """

    async def event_generator():
        logs = [
            {"type": "system", "msg": f"[MandiPulse] Initializing agent for {req.crop} in {req.district}, {req.state}..."},
            {"type": "agent", "msg": "[webcmd] Launching headless browser..."},
            {"type": "agent", "msg": "[webcmd] Navigating to https://enam.gov.in/web/dashboard/trade-data..."},
            {"type": "agent", "msg": f"[webcmd] Selecting State: {req.state}"},
            {"type": "agent", "msg": f"[webcmd] Selecting District: {req.district}"},
            {"type": "agent", "msg": f"[webcmd] Selecting Commodity: {req.crop}"},
            {"type": "agent", "msg": "[webcmd] Clicking 'Search' button..."},
            {"type": "agent", "msg": "[webcmd] Waiting for DOM to settle (2.3s)..."},
            {"type": "success", "msg": "[webcmd] ✓ Price table extracted — 4 mandi records found"},
            {"type": "agent", "msg": "[webcmd] Navigating to https://agmarknet.gov.in/..."},
            {"type": "agent", "msg": "[webcmd] Cross-referencing Agmarknet prices..."},
            {"type": "success", "msg": "[webcmd] ✓ Cross-reference complete — data validated"},
            {"type": "system", "msg": "[MandiPulse] Sending structured data to Gemini 1.5 Flash..."},
            {"type": "llm", "msg": "[Gemini] Analyzing price differentials across 4 mandis..."},
            {"type": "llm", "msg": "[Gemini] Computing transport-adjusted net margins..."},
            {"type": "llm", "msg": "[Gemini] Generating Bengali + English localized alert..."},
            {"type": "success", "msg": "[Gemini] ✓ Recommendation ready — best mandi identified"},
            {"type": "system", "msg": "[MandiPulse] ⏸ Awaiting human approval before dispatch..."},
        ]

        for i, log in enumerate(logs):
            await asyncio.sleep(0.4 + (0.2 * (i % 3)))  # staggered timing
            yield f"data: {json.dumps(log)}\n\n"

        # Final event: send the actual data
        price_records = await run_mock_agent(req.crop, req.district, req.state)
        recommendation = await generate_mock_recommendation(price_records, req.district)
        run_id = str(uuid.uuid4())[:8]

        result = {
            "run_id": run_id,
            "query": req.model_dump(),
            "price_records": [p.model_dump() for p in price_records],
            "recommendation": recommendation.model_dump(),
            "status": "pending_approval",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        pending_approvals[run_id] = result

        yield f"data: {json.dumps({'type': 'result', 'payload': result})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ── Approve: HITL gate ─────────────────────────────────────────────────────
@app.post("/api/approve")
async def approve_alert(req: ApprovalRequest):
    """
    Human-in-the-loop approval gate.
    No SMS/WhatsApp dispatch is ever made without explicit approval.
    """
    if req.run_id not in pending_approvals:
        raise HTTPException(status_code=404, detail="Run ID not found")

    entry = pending_approvals[req.run_id]

    if req.approved:
        entry["status"] = "approved"
        entry["approved_at"] = datetime.now(timezone.utc).isoformat()
        entry["approved_by"] = req.approved_by or "organizer"

        # Simulate SMS dispatch
        entry["dispatch"] = {
            "channel": "twilio_sms",
            "recipient_group": "Farmer Group Alpha",
            "message_preview": entry["recommendation"]["alert_english"][:100] + "...",
            "dispatched_at": datetime.now(timezone.utc).isoformat(),
            "delivery_status": "delivered",
        }

        query_history.append(entry)
        del pending_approvals[req.run_id]

        return {
            "status": "approved_and_dispatched",
            "run_id": req.run_id,
            "dispatch": entry["dispatch"],
        }
    else:
        entry["status"] = "rejected"
        entry["rejected_at"] = datetime.now(timezone.utc).isoformat()
        query_history.append(entry)
        del pending_approvals[req.run_id]

        return {"status": "rejected", "run_id": req.run_id}


# ── History ─────────────────────────────────────────────────────────────────
@app.get("/api/history")
async def get_history():
    return {"runs": query_history}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
