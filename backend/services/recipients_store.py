"""Persisted farmer mobile numbers entered by authenticated officers."""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Optional

from services.sms_dispatcher import normalize_in_mobile

_LOCK = threading.Lock()
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_PATH = os.path.join(_REPO_ROOT, "data", "recipients.json")


def _path() -> str:
    return os.environ.get("MANDIPULSE_RECIPIENTS_STORE") or _DEFAULT_PATH


def _load() -> list[dict[str, Any]]:
    try:
        with open(_path(), encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return []


def _save(rows: list[dict[str, Any]]) -> None:
    path = _path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=2)
    os.replace(tmp, path)


def _is_scoped(row: dict[str, Any]) -> bool:
    return bool(str(row.get("officer_email") or "").strip())


def list_recipients(
    district: Optional[str] = None,
    officer_email: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Hide legacy unscoped rows. Filter by officer_email when given."""
    _ = district  # kept for call-site compatibility; scoping is by officer_email
    email_n = (officer_email or "").strip().lower()
    out: list[dict[str, Any]] = []
    with _LOCK:
        rows = _load()
    for row in rows:
        if not _is_scoped(row):
            continue
        if email_n and str(row.get("officer_email") or "").lower() != email_n:
            continue
        out.append(row)
    return out


def add_recipient(
    mobile: str,
    label: str = "",
    *,
    officer_email: str,
    address: str = "",
    crop: str = "",
    district: str = "",
    district_id: Any = None,
) -> dict[str, Any]:
    number = normalize_in_mobile(mobile)
    email_n = (officer_email or "").strip().lower()
    address_n = (address or district or "").strip()
    crop_n = (crop or "").strip()
    if not email_n:
        raise ValueError("Officer email is required to add a farmer.")

    did: Optional[int] = None
    if district_id is not None and str(district_id).strip() != "":
        try:
            did = int(district_id)
        except (TypeError, ValueError):
            did = None

    with _LOCK:
        rows = _load()
        for row in rows:
            if row.get("mobile") != number:
                continue
            if str(row.get("officer_email") or "").lower() == email_n:
                if label:
                    row["label"] = label.strip()
                if crop_n or "crop" not in row:
                    row["crop"] = crop_n
                row["address"] = address_n
                row["officer_email"] = email_n
                if address_n:
                    row["district"] = address_n
                if did is not None:
                    row["district_id"] = did
                _save(rows)
                return row
        entry: dict[str, Any] = {
            "mobile": number,
            "label": (label or "").strip(),
            "crop": crop_n,
            "officer_email": email_n,
            "address": address_n,
        }
        if address_n:
            entry["district"] = address_n
        if did is not None:
            entry["district_id"] = did
        rows.append(entry)
        _save(rows)
        return entry


def remove_recipient(
    mobile: str,
    *,
    officer_email: str,
    district: str = "",
) -> None:
    number = normalize_in_mobile(mobile)
    email_n = (officer_email or "").strip().lower()
    with _LOCK:
        rows = _load()
        kept: list[dict[str, Any]] = []
        removed = False
        for row in rows:
            if row.get("mobile") != number:
                kept.append(row)
                continue
            owned = str(row.get("officer_email") or "").lower() == email_n
            if owned:
                removed = True
                continue
            raise ValueError("Cannot remove a farmer that is not in your registry.")
        if not removed:
            raise ValueError("Recipient not found.")
        _save(kept)
