"""Inbound SMS log. Point Twilio (or a tunnel) at POST /api/sms/inbound."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_PATH = os.path.join(_REPO_ROOT, "data", "sms_inbox.json")


def _load() -> list[dict[str, Any]]:
    try:
        with open(_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return []


def _save(rows: list[dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(_PATH), exist_ok=True)
    tmp = _PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=2)
    os.replace(tmp, _PATH)


def record_inbound(*, sender: str, body: str, provider: str = "unknown") -> dict[str, Any]:
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "from": sender,
        "body": body,
        "provider": provider,
    }
    rows = _load()
    rows.insert(0, entry)
    _save(rows[:200])
    return entry


def list_inbox(limit: int = 50) -> list[dict[str, Any]]:
    return _load()[:limit]
