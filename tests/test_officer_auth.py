"""Officer JWT auth, farmer recipients, and HITL SMS."""

import os
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from config import settings
from main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _reset_officer_files():
    for key in ("MANDIPULSE_OFFICERS_STORE", "MANDIPULSE_RECIPIENTS_STORE"):
        path = Path(os.environ[key])
        if path.exists():
            path.unlink()
    yield


def _officer_payload(email: str, address: str, name: str = "Test Officer") -> dict:
    return {
        "email": email,
        "password": "password1",
        "name": name,
        "address": address,
    }


@pytest.mark.anyio
async def test_register_without_district_id():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post(
            "/api/auth/register",
            json=_officer_payload("a@example.com", "KVK Hooghly office"),
        )
        assert reg.status_code == 200
        body = reg.json()
        assert "token" in body
        assert body["officer"]["email"] == "a@example.com"
        assert body["officer"]["name"] == "Test Officer"
        assert body["officer"]["address"] == "KVK Hooghly office"
        assert "password_hash" not in body["officer"]
        assert "district_id" not in body["officer"] or body["officer"].get("district_id") in (None, "")

        login = await client.post(
            "/api/auth/login",
            json={"email": "a@example.com", "password": "password1"},
        )
        assert login.status_code == 200
        token = login.json()["token"]

        me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["officer"]["address"] == "KVK Hooghly office"


@pytest.mark.anyio
async def test_register_district_alias_for_address():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post(
            "/api/auth/register",
            json={
                "email": "alias@example.com",
                "password": "password1",
                "name": "Alias Officer",
                "district": "Nadia",
            },
        )
        assert reg.status_code == 200
        assert reg.json()["officer"]["address"] == "Nadia"


@pytest.mark.anyio
async def test_duplicate_email_400():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = _officer_payload("dup@example.com", "Hooghly")
        assert (await client.post("/api/auth/register", json=payload)).status_code == 200
        again = await client.post("/api/auth/register", json=payload)
        assert again.status_code == 400


@pytest.mark.anyio
async def test_recipients_401_without_token():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/recipients")).status_code == 401
        post = await client.post("/api/recipients", json={"mobile": "9876543210"})
        assert post.status_code == 401
        delete = await client.delete("/api/recipients/9876543210")
        assert delete.status_code == 401


@pytest.mark.anyio
async def test_crop_stored_and_scoped_to_officer():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        a = (
            await client.post(
                "/api/auth/register",
                json=_officer_payload("hooghly@example.com", "Hooghly"),
            )
        ).json()
        b = (
            await client.post(
                "/api/auth/register",
                json=_officer_payload("nadia@example.com", "Nadia"),
            )
        ).json()
        headers_a = {"Authorization": f"Bearer {a['token']}"}
        headers_b = {"Authorization": f"Bearer {b['token']}"}

        added = await client.post(
            "/api/recipients",
            json={"mobile": "9876543210", "label": "Rina", "crop": "Paddy"},
            headers=headers_a,
        )
        assert added.status_code == 200
        items_a = added.json()["items"]
        assert len(items_a) == 1
        assert items_a[0]["mobile"] == "9876543210"
        assert items_a[0]["crop"] == "Paddy"
        assert items_a[0]["officer_email"] == "hooghly@example.com"
        assert items_a[0]["address"] == "Hooghly"

        listed_b = await client.get("/api/recipients", headers=headers_b)
        assert listed_b.status_code == 200
        assert listed_b.json()["items"] == []

        blocked = await client.delete("/api/recipients/9876543210", headers=headers_b)
        assert blocked.status_code == 400

        listed_a = await client.get("/api/recipients", headers=headers_a)
        assert len(listed_a.json()["items"]) == 1

        removed = await client.delete("/api/recipients/9876543210", headers=headers_a)
        assert removed.status_code == 200
        assert removed.json()["items"] == []


@pytest.mark.anyio
async def test_sms_without_token_401():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/sms/send",
            json={"run_id": "x", "mobiles": ["9876543210"], "message": "hi"},
        )
        assert r.status_code == 401


@pytest.mark.anyio
async def test_sms_without_provider_keys_503(monkeypatch):
    monkeypatch.setattr(settings, "FAST2SMS_API_KEY", "")
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", "")
    monkeypatch.setattr(settings, "TWILIO_AUTH_TOKEN", "")
    monkeypatch.setattr(settings, "TWILIO_API_KEY", "")
    monkeypatch.setattr(settings, "TWILIO_API_SECRET", "")
    monkeypatch.setattr(settings, "TWILIO_FROM_NUMBER", "")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        auth = (
            await client.post(
                "/api/auth/register",
                json=_officer_payload("sms@example.com", "Hooghly"),
            )
        ).json()
        headers = {"Authorization": f"Bearer {auth['token']}"}
        q = await client.post(
            "/api/query",
            json={"crop": "Paddy", "district": "Hooghly", "state": "West Bengal", "mode": "demo"},
        )
        assert q.status_code == 200
        run_id = q.json()["run_id"]
        sms = await client.post(
            "/api/sms/send",
            json={
                "run_id": run_id,
                "mobiles": ["9876543210"],
                "message": "KrishiDrishti AI test",
            },
            headers=headers,
        )
        assert sms.status_code == 503
        assert "FAST2SMS" in str(sms.json()["detail"]) or "not configured" in str(sms.json()["detail"]).lower()
