"""Isolate HITL JSON store so pytest does not share the demo runtime file."""

import os
from pathlib import Path

_root = Path(__file__).resolve().parent
_store = _root / ".runtime-test.json"
_officers = _root / ".officers-test.json"
_recipients = _root / ".recipients-test.json"
os.environ["MANDIPULSE_RUNTIME_STORE"] = str(_store)
os.environ["MANDIPULSE_OFFICERS_STORE"] = str(_officers)
os.environ["MANDIPULSE_RECIPIENTS_STORE"] = str(_recipients)
os.environ["OFFICER_JWT_SECRET"] = "pytest-officer-jwt-secret-32b-min"

for path in (_store, _officers, _recipients):
    if path.exists():
        path.unlink()
