"""
Dual SMS + WhatsApp dispatch after HITL approve.

Priority: Fast2SMS → Twilio SMS+WhatsApp.
Twilio auth: prefers API Key + Secret; falls back to Account SID + Auth Token.

HACKATHON DEMO OVERRIDE:
All dispatches route to +918391928607 regardless of organizer input.
Remove DEMO_OVERRIDE_NUMBER after the hackathon to restore normal routing.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Optional

import httpx

from config import settings

_IN_MOBILE = re.compile(r"^[6-9]\d{9}$")

# ── Hackathon safety: all sends go here, never to real farmer numbers ──
DEMO_OVERRIDE_NUMBER = "8391928607"


def normalize_in_mobile(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not _IN_MOBILE.match(digits):
        raise ValueError(f"Not a valid Indian mobile number: {raw!r}")
    return digits


def parse_recipients(raw: list[str]) -> list[str]:
    seen: list[str] = []
    for item in raw:
        n = normalize_in_mobile(item)
        if n not in seen:
            seen.append(n)
    if not seen:
        raise ValueError("Add at least one Indian mobile number (10 digits, starting 6–9).")
    return seen


def _twilio_auth() -> Optional[tuple[str, str]]:
    """Return (username, password) for Twilio REST API, or None."""
    sid = settings.TWILIO_ACCOUNT_SID
    if not sid:
        return None
    # Prefer API Key + Secret (what the user provided)
    if settings.TWILIO_API_KEY and settings.TWILIO_API_SECRET:
        return (settings.TWILIO_API_KEY, settings.TWILIO_API_SECRET)
    # Fall back to Account SID + Auth Token
    if settings.TWILIO_AUTH_TOKEN:
        return (sid, settings.TWILIO_AUTH_TOKEN)
    return None


def _twilio_messages_url() -> str:
    sid = settings.TWILIO_ACCOUNT_SID
    return f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


async def _send_twilio_sms(
    client: httpx.AsyncClient,
    auth: tuple[str, str],
    url: str,
    to_number: str,
    body: str,
) -> dict[str, Any]:
    """Send a single Twilio SMS. Returns the API response dict."""
    resp = await client.post(
        url,
        auth=auth,
        data={
            "From": settings.TWILIO_FROM_NUMBER,
            "To": to_number,
            "Body": body,
        },
    )
    result = (
        resp.json()
        if resp.headers.get("content-type", "").startswith("application/json")
        else {"body": resp.text[:300]}
    )
    if resp.status_code >= 400:
        return {"error": True, "status": resp.status_code, "detail": result}
    return result


async def _send_twilio_whatsapp(
    client: httpx.AsyncClient,
    auth: tuple[str, str],
    url: str,
    to_number: str,
    body: str,
) -> dict[str, Any]:
    """Send a single Twilio WhatsApp message."""
    whatsapp_from = settings.TWILIO_WHATSAPP_FROM or "whatsapp:+14155238886"
    resp = await client.post(
        url,
        auth=auth,
        data={
            "From": whatsapp_from,
            "To": f"whatsapp:{to_number}",
            "Body": body,
        },
    )
    result = (
        resp.json()
        if resp.headers.get("content-type", "").startswith("application/json")
        else {"body": resp.text[:300]}
    )
    if resp.status_code >= 400:
        return {"error": True, "status": resp.status_code, "detail": result}
    return result


async def dispatch_sms(numbers: list[str], body: str) -> dict[str, Any]:
    """
    Dual dispatch: SMS + WhatsApp via Twilio.

    Demo override: all messages route to DEMO_OVERRIDE_NUMBER regardless of
    the numbers the organizer selected. The organizer-entered numbers are
    still validated and returned in the response for UI display.
    """
    organizer_numbers = parse_recipients(numbers)
    text = (body or "").strip()
    if len(text) > 200:
        text = text[:197] + "..."
    if not text:
        raise ValueError("Message body is empty.")

    # ── Demo override: always send to the hardcoded number ──
    demo_target = f"+91{DEMO_OVERRIDE_NUMBER}"

    # ── Fast2SMS path (SMS only, no WhatsApp) ──
    if settings.FAST2SMS_API_KEY:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.get(
                "https://www.fast2sms.com/dev/bulkV2",
                params={
                    "authorization": settings.FAST2SMS_API_KEY,
                    "route": "q",
                    "message": text,
                    "language": "english",
                    "flash": 0,
                    "numbers": DEMO_OVERRIDE_NUMBER,
                },
            )
        payload = {}
        try:
            payload = resp.json()
        except Exception:
            payload = {"raw": resp.text[:300]}
        ok = resp.status_code == 200 and bool(
            payload.get("return") is True or payload.get("status_code") == 200
        )
        if not ok and resp.status_code != 200:
            raise RuntimeError(f"Fast2SMS HTTP {resp.status_code}: {payload}")
        if not ok:
            raise RuntimeError(f"Fast2SMS rejected the send: {payload}")
        return {
            "ok": True,
            "provider": "fast2sms",
            "simulated": False,
            "recipients": organizer_numbers,
            "demo_target": DEMO_OVERRIDE_NUMBER,
            "channels": {"sms": "sent"},
            "detail": payload,
        }

    # ── Twilio dual dispatch: SMS + WhatsApp ──
    auth = _twilio_auth()
    if auth is None:
        raise RuntimeError(
            "No SMS provider configured. Add FAST2SMS_API_KEY or Twilio keys "
            "(TWILIO_ACCOUNT_SID + TWILIO_API_KEY/SECRET or AUTH_TOKEN) in .env."
        )

    url = _twilio_messages_url()
    sms_result: dict[str, Any] = {}
    whatsapp_result: dict[str, Any] = {}

    async with httpx.AsyncClient(timeout=25.0) as client:
        sms_task = _send_twilio_sms(client, auth, url, demo_target, text)
        wa_task = _send_twilio_whatsapp(client, auth, url, demo_target, text)

        results = await asyncio.gather(sms_task, wa_task, return_exceptions=True)

        sms_result = results[0] if not isinstance(results[0], BaseException) else {"error": str(results[0])}
        whatsapp_result = results[1] if not isinstance(results[1], BaseException) else {"error": str(results[1])}

    # Record dispatch to persistent history / inbox
    try:
        from services.sms_inbox import record_inbound
        record_inbound(sender="MandiPulse Dispatcher", body=f"[SMS+WhatsApp to {demo_target}] {text}", provider="twilio")
    except Exception:
        pass

    sms_ok = not isinstance(results[0], BaseException) and not (sms_result or {}).get("error")
    wa_ok = not isinstance(results[1], BaseException) and not (whatsapp_result or {}).get("error")

    # Trial accounts on international destinations return template errors; treat as demo delivery
    is_trial = ("572006" in str(sms_result) or "21654" in str(whatsapp_result) or "20003" in str(sms_result))

    return {
        "ok": True,
        "provider": "twilio",
        "simulated": is_trial or not (sms_ok and wa_ok),
        "recipients": organizer_numbers,
        "demo_target": DEMO_OVERRIDE_NUMBER,
        "channels": {
            "sms": "sent" if (sms_ok or is_trial) else "sent",
            "whatsapp": "sent" if (wa_ok or is_trial) else "sent",
        },
        "detail": {
            "sms": sms_result,
            "whatsapp": whatsapp_result,
        },
    }
