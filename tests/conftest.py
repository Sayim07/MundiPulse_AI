"""Isolate HITL JSON store so pytest does not share the demo runtime file."""

import os
from pathlib import Path

_store = Path(__file__).resolve().parent / ".runtime-test.json"
os.environ["MANDIPULSE_RUNTIME_STORE"] = str(_store)

if _store.exists():
    _store.unlink()
