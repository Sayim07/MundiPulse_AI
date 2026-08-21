"""Persisted farmer mobile numbers entered in the UI — not a hardcoded group."""

from __future__ import annotations

import json
import os
from typing import Any

from services.sms_dispatcher import normalize_in_mobile

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_PATH = os.path.join(_REPO_ROOT, "data", "recipients.json")


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


def list_recipients() -> list[dict[str, Any]]:
    return _load()


def add_recipient(mobile: str, label: str = "") -> dict[str, Any]:
    number = normalize_in_mobile(mobile)
    rows = _load()
    for row in rows:
        if row.get("mobile") == number:
            if label:
                row["label"] = label.strip()
                _save(rows)
            return row
    entry = {"mobile": number, "label": (label or "").strip()}
    rows.append(entry)
    _save(rows)
    return entry


def remove_recipient(mobile: str) -> None:
    number = normalize_in_mobile(mobile)
    rows = [r for r in _load() if r.get("mobile") != number]
    _save(rows)
