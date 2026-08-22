"""
Thin JSON persistence for HITL pending runs + history.

In-memory dicts vanish when uvicorn --reload restarts (common on OneDrive).
Approve does not need Twilio or Gemini keys; it only needs the run_id to still exist.
"""

from __future__ import annotations

import json
import os
import threading
from typing import Any

_LOCK = threading.Lock()

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_PATH = os.path.join(_REPO_ROOT, "data", "runtime_state.json")


def _path() -> str:
    return os.environ.get("MANDIPULSE_RUNTIME_STORE") or _DEFAULT_PATH


def _empty() -> dict[str, Any]:
    return {"pending_approvals": {}, "query_history": []}


def load_state() -> dict[str, Any]:
    path = _path()
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            return _empty()
        data.setdefault("pending_approvals", {})
        data.setdefault("query_history", [])
        if not isinstance(data["pending_approvals"], dict):
            data["pending_approvals"] = {}
        if not isinstance(data["query_history"], list):
            data["query_history"] = []
        return data
    except FileNotFoundError:
        return _empty()
    except (OSError, json.JSONDecodeError):
        return _empty()


def save_state(state: dict[str, Any]) -> None:
    path = _path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def put_pending(run_id: str, payload: dict) -> None:
    with _LOCK:
        state = load_state()
        state["pending_approvals"][run_id] = payload
        save_state(state)


def get_pending(run_id: str) -> dict | None:
    with _LOCK:
        return load_state()["pending_approvals"].get(run_id)


def get_run(run_id: str) -> dict | None:
    """Pending store first, then history (approved/rejected)."""
    pending = get_pending(run_id)
    if pending is not None:
        return pending
    target = str(run_id or "")
    with _LOCK:
        for entry in load_state()["query_history"]:
            if str(entry.get("run_id") or "") == target:
                return entry
    return None


def complete_pending(run_id: str, entry: dict) -> None:
    with _LOCK:
        state = load_state()
        state["pending_approvals"].pop(run_id, None)
        state["query_history"].append(entry)
        save_state(state)


def list_history() -> list[dict]:
    with _LOCK:
        return list(load_state()["query_history"])
