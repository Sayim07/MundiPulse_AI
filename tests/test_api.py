"""
Test cases for MandiPulse AI FastAPI Endpoints using httpx ASGITransport.
"""

import sys
import os
import pytest
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_check():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


@pytest.mark.anyio
async def test_query_pipeline():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"crop": "Paddy", "district": "Hooghly", "state": "West Bengal", "mode": "demo"}
        response = await client.post("/api/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data
        assert len(data["price_records"]) > 0
        assert data["recommendation"]["requires_approval"] is True
        assert data["status"] == "pending_approval"
        assert data["data_mode"] == "demo"
        assert "dispatch" not in data
        # Python numbers on recommendation match table best row net
        rec = data["recommendation"]
        best = next(p for p in data["price_records"] if p["mandi_name"] == rec["best_mandi"])
        table_net = best["modal_price_per_quintal"] - (best["transport_cost_per_quintal"] or 0)
        assert rec["net_margin_per_quintal"] == pytest.approx(table_net)
        assert rec["alert_english"]
        assert rec["alert_bengali"]


@pytest.mark.anyio
async def test_approve_flow():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"crop": "Potato", "district": "Hooghly", "state": "West Bengal", "mode": "demo"}
        q_resp = await client.post("/api/query", json=payload)
        assert q_resp.status_code == 200
        run_id = q_resp.json()["run_id"]

        app_resp = await client.post(
            "/api/approve",
            json={
                "run_id": run_id,
                "approved": True,
                "approved_by": "organizer_test",
                "recipients": ["sayimmullick2005@gmail.com"],
            },
        )
        assert app_resp.status_code == 200
        app_data = app_resp.json()
        assert app_data["status"] == "success"

        # 3. Check history
        hist_resp = await client.get("/api/history")
        assert hist_resp.status_code == 200
        history = hist_resp.json()["runs"]
        assert any(h["run_id"] == run_id and h["status"] == "approved" for h in history)



@pytest.mark.anyio
async def test_reject_flow():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger query
        payload = {"crop": "Mustard", "district": "Hooghly", "state": "West Bengal", "mode": "demo"}
        q_resp = await client.post("/api/query", json=payload)
        run_id = q_resp.json()["run_id"]

        # 2. Reject
        app_resp = await client.post(
            "/api/approve",
            json={"run_id": run_id, "approved": False},
        )
        assert app_resp.status_code == 200
        assert app_resp.json()["status"] == "rejected"


@pytest.mark.anyio
async def test_approve_nonexistent_run_id():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        app_resp = await client.post(
            "/api/approve",
            json={"run_id": "invalid_id_9999", "approved": True},
        )
        assert app_resp.status_code == 404


@pytest.mark.anyio
async def test_no_dispatch_without_approve():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        q_resp = await client.post(
            "/api/query",
            json={"crop": "Paddy", "district": "Hooghly", "state": "West Bengal", "mode": "demo"},
        )
        run_id = q_resp.json()["run_id"]
        hist = await client.get("/api/history")
        assert all(h.get("run_id") != run_id for h in hist.json()["runs"])
        # Missing run cannot dispatch
        missing = await client.post(
            "/api/approve",
            json={"run_id": "never-approved", "approved": True},
        )
        assert missing.status_code == 404


@pytest.mark.anyio
async def test_approve_valid_run():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        q_resp = await client.post(
            "/api/query",
            json={"crop": "Paddy", "district": "Hooghly", "state": "West Bengal", "mode": "demo"},
        )
        run_id = q_resp.json()["run_id"]
        app_resp = await client.post(
            "/api/approve",
            json={"run_id": run_id, "approved": True, "recipients": ["sayimmullick2005@gmail.com"]},
        )
        assert app_resp.status_code == 200
        assert app_resp.json()["status"] == "success"


@pytest.mark.anyio
async def test_query_stream_demo_labelled():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream(
            "POST",
            "/api/query/stream",
            json={"crop": "Paddy", "district": "Hooghly", "state": "West Bengal", "mode": "demo"},
        ) as response:
            assert response.status_code == 200
            body = ""
            async for chunk in response.aiter_text():
                body += chunk
    assert "DEMO" in body
    assert '"type": "result"' in body or '"type":"result"' in body
    assert "Gemini] Analyzing price differentials" not in body  # old hardcoded money-LLM script

