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

    print("[MundiPulse] Sending Email via Web3Forms")
    log.info("Web3Forms dispatch")

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(
            WEB3FORMS_URL,
            json={
                "access_key": access_key,
                "subject": "MandiPulse AI: High Price Alert",
                "from_name": "MandiPulse Dispatcher",
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



