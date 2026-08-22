"""Persisted officer accounts — hashed passwords only, JSON file like recipients."""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

_LOCK = threading.Lock()
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_PATH = os.path.join(_REPO_ROOT, "data", "officers.json")


def _path() -> str:
    return os.environ.get("MANDIPULSE_OFFICERS_STORE") or _DEFAULT_PATH


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


def officer_address(row: dict[str, Any]) -> str:
    return str(row.get("address") or row.get("district") or "").strip()


def public_officer(row: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in row.items() if k != "password_hash"}
    address = officer_address(out)
    out["address"] = address
    out["name"] = str(out.get("name") or "").strip()
    if not str(out.get("district") or "").strip():
        out["district"] = address
    return out


def get_by_email(email: str) -> Optional[dict[str, Any]]:
    target = (email or "").strip().lower()
    with _LOCK:
        for row in _load():
            if str(row.get("email") or "").lower() == target:
                return dict(row)
    return None


def create_officer(
    *,
    email: str,
    password_hash: str,
    name: str,
    address: str,
    district: str = "",
    district_id: Any = None,
    state: str = "",
    state_id: Optional[int] = None,
) -> dict[str, Any]:
    email_n = (email or "").strip().lower()
    name_n = (name or "").strip()
    address_n = (address or district or "").strip()
    if not email_n:
        raise ValueError("Email is required.")
    if not name_n:
        raise ValueError("Full name is required.")
    if not address_n:
        raise ValueError("Address / location is required.")
    if not password_hash:
        raise ValueError("Password hash is required.")

    did: Optional[int] = None
    if district_id is not None and str(district_id).strip() != "":
        try:
            did = int(district_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("district_id must be a number if provided.") from exc

    sid: Optional[int] = None
    if state_id is not None and str(state_id).strip() != "":
        try:
            sid = int(state_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("state_id must be a number.") from exc

    with _LOCK:
        rows = _load()
        for row in rows:
            if str(row.get("email") or "").lower() == email_n:
                raise ValueError("An officer account already exists for this email.")
        entry: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "email": email_n,
            "password_hash": password_hash,
            "name": name_n,
            "address": address_n,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        district_n = (district or "").strip()
        if district_n:
            entry["district"] = district_n
        if did is not None:
            entry["district_id"] = did
        state_n = (state or "").strip()
        if state_n:
            entry["state"] = state_n
        if sid is not None:
            entry["state_id"] = sid
        rows.append(entry)
        _save(rows)
        return dict(entry)
