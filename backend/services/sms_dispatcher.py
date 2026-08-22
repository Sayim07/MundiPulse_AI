"""
Email dispatch after HITL approve — Web3Forms only.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from fastapi import HTTPException

from config import settings

log = logging.getLogger(__name__)

_IN_MOBILE = re.compile(r"^[6-9]\d{9}$")

WEB3FORMS_URL = "https://api.web3forms.com/submit"


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


async def dispatch_email(body: str) -> dict[str, Any]:
    """
    Dispatch Email alert via Web3Forms.
    """
    text = (body or "").strip()
    if not text:
        raise ValueError("Message body is empty.")

    access_key = settings.WEB3FORMS_ACCESS_KEY
    if not access_key:
        raise HTTPException(
            status_code=500,
            detail="WEB3FORMS_ACCESS_KEY is not configured in .env",
        )

    print("[KrishiDrishti] Sending Email via Web3Forms")
    log.info("Web3Forms dispatch")

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(
            WEB3FORMS_URL,
            json={
                "access_key": access_key,
                "subject": "KrishiDrishti AI: High Price Alert",
                "from_name": "KrishiDrishti Dispatcher",
                "message": text,
            },
        )

    # ── Parse response ──
    payload: dict[str, Any] = {}
    try:
        payload = resp.json()
    except Exception:
        payload = {"raw": resp.text[:400]}

    # ── Failure: non-200 HTTP status ──
    if resp.status_code != 200:
        error_msg = payload.get("message") or payload.get("raw") or f"HTTP {resp.status_code}"
        print(f"[MundiPulse] FAILED: Web3Forms HTTP {resp.status_code} — {error_msg}")
        log.error("Web3Forms HTTP %s: %s", resp.status_code, error_msg)
        raise HTTPException(
            status_code=400,
            detail=f"Web3Forms Error (HTTP {resp.status_code}): {error_msg}",
        )

    # ── Success ──
    print("[MundiPulse] Email Alert Dispatched Successfully via Web3Forms")
    log.info("Web3Forms dispatch OK")

    return {
        "ok": True,
        "provider": "web3forms",
        "simulated": False,
        "channels": {"email": "sent"},
        "detail": payload,
    }


NO_SMS_PROVIDER = (
    "SMS is not configured. Set FAST2SMS_API_KEY, or Twilio credentials "
    "(TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, or TWILIO_API_KEY + TWILIO_API_SECRET, "
    "plus TWILIO_FROM_NUMBER). Email dispatch still works."
)

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


def sms_provider_configured() -> bool:
    if (settings.FAST2SMS_API_KEY or "").strip():
        return True
    from_number = (settings.TWILIO_FROM_NUMBER or "").strip()
    if not from_number:
        return False
    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    api_key = (settings.TWILIO_API_KEY or "").strip()
    api_secret = (settings.TWILIO_API_SECRET or "").strip()
    if sid and token:
        return True
    if sid and api_key and api_secret:
        return True
    return False


def _needs_unicode(text: str) -> bool:
    return any(ord(ch) > 127 for ch in text)


async def send_sms(mobiles: list[str], message: str) -> dict[str, Any]:
    """HITL SMS via Fast2SMS (preferred) or Twilio. Raises 503 if neither is configured."""
    numbers = parse_recipients(mobiles)
    text = (message or "").strip()
    if not text:
        raise ValueError("Message body is empty.")

    if (settings.FAST2SMS_API_KEY or "").strip():
        return await _send_fast2sms(numbers, text)
    if sms_provider_configured():
        return await _send_twilio(numbers, text)
    raise HTTPException(status_code=503, detail=NO_SMS_PROVIDER)


async def _send_fast2sms(numbers: list[str], text: str) -> dict[str, Any]:
    print("[KrishiDrishti] Sending SMS via Fast2SMS")
    log.info("Fast2SMS dispatch to %s numbers", len(numbers))
    language = "unicode" if _needs_unicode(text) else "english"
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(
            FAST2SMS_URL,
            headers={
                "authorization": settings.FAST2SMS_API_KEY.strip(),
                "Content-Type": "application/json",
            },
            json={
                "route": "q",
                "message": text,
                "language": language,
                "flash": 0,
                "numbers": ",".join(numbers),
            },
        )
    payload: dict[str, Any] = {}
    try:
        payload = resp.json()
    except Exception:
        payload = {"raw": resp.text[:400]}
    if resp.status_code != 200 or str(payload.get("return", "")).lower() in {"false", "0"}:
        error_msg = payload.get("message") or payload.get("raw") or f"HTTP {resp.status_code}"
        log.error("Fast2SMS failed: %s", error_msg)
        raise HTTPException(status_code=400, detail=f"Fast2SMS error: {error_msg}")
    return {
        "ok": True,
        "provider": "fast2sms",
        "simulated": False,
        "channels": {"sms": "sent"},
        "count": len(numbers),
        "detail": payload,
    }


async def _send_twilio(numbers: list[str], text: str) -> dict[str, Any]:
    print("[KrishiDrishti] Sending SMS via Twilio")
    log.info("Twilio dispatch to %s numbers", len(numbers))
    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    from_number = (settings.TWILIO_FROM_NUMBER or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    api_key = (settings.TWILIO_API_KEY or "").strip()
    api_secret = (settings.TWILIO_API_SECRET or "").strip()
    auth = (api_key, api_secret) if api_key and api_secret else (sid, token)

    sent: list[str] = []
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=25.0) as client:
        for mobile in numbers:
            resp = await client.post(
                url,
                auth=auth,
                data={"From": from_number, "To": f"+91{mobile}", "Body": text},
            )
            if resp.status_code in (200, 201):
                sent.append(mobile)
            else:
                snippet = resp.text[:200]
                errors.append(f"{mobile}: HTTP {resp.status_code} {snippet}")
    if not sent:
        raise HTTPException(
            status_code=400,
            detail="Twilio SMS failed: " + ("; ".join(errors) or "no messages accepted"),
        )
    return {
        "ok": True,
        "provider": "twilio",
        "simulated": False,
        "channels": {"sms": "sent"},
        "count": len(sent),
        "failed": errors,
    }


