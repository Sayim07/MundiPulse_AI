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
        payload = {"crop": "Paddy", "district": "Hooghly", "state": "West Bengal"}
        response = await client.post("/api/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data
        assert len(data["price_records"]) > 0
        assert data["recommendation"]["requires_approval"] is True
        assert data["status"] == "pending_approval"


@pytest.mark.anyio
async def test_approve_flow():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger query
        payload = {"crop": "Potato", "district": "Hooghly", "state": "West Bengal"}
        q_resp = await client.post("/api/query", json=payload)
        assert q_resp.status_code == 200
        run_id = q_resp.json()["run_id"]

        # 2. Approve
        app_resp = await client.post(
            "/api/approve",
            json={"run_id": run_id, "approved": True, "approved_by": "organizer_test"},
        )
        assert app_resp.status_code == 200
        app_data = app_resp.json()
        assert app_data["status"] == "approved_and_dispatched"
        assert app_data["dispatch"]["delivery_status"] == "delivered"

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
        payload = {"crop": "Mustard", "district": "Hooghly", "state": "West Bengal"}
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
