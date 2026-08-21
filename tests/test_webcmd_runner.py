"""
Demo fetch (no network) and live extract with a mocked page.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from agent.webcmd_runner import (
    dedupe_records,
    records_from_table_rows,
    run_price_fetch,
    validate_record,
)
from models.price_record import PriceRecord


@pytest.mark.asyncio
async def test_demo_fetch_without_network():
    logs = []

    def cb(event):
        logs.append(event)

    records = await run_price_fetch("Paddy", "Hooghly", "West Bengal", mode="demo", log_callback=cb)
    assert len(records) >= 2
    assert all(r.data_mode == "demo" for r in records)
    assert all(r.crop == "Paddy" for r in records)
    assert any("DEMO" in (e.get("msg") or "") for e in logs)


@pytest.mark.asyncio
async def test_live_extract_with_mock_page(tmp_path):
    table = [
        ["Mandi", "District", "Crop", "Variety", "Min", "Max", "Modal", "Date"],
        ["Burdwan Mandi", "Purba Bardhaman", "Paddy", "Common", "2200", "2400", "2320", "2026-08-20"],
        ["Dhaniakhali Mandi", "Hooghly", "Paddy", "Common", "2050", "2250", "2180", "2026-08-20"],
        ["Bad Row", "Hooghly", "Paddy", "Common", "5000", "1000", "3000", "2026-08-20"],  # min>max drop
    ]

    class FakeEl:
        def __init__(self, tag):
            self._tag = tag

        async def evaluate(self, _expr):
            return self._tag

    class FakeTable:
        async def evaluate(self, expr):
            if "tagName" in expr:
                return "TABLE"
            return table

    class FakePage:
        url = "https://example.test/enam"

        async def goto(self, *_a, **_k):
            return None

        async def title(self):
            return "e-NAM trade data"

        async def content(self):
            return "<html><body><table id='tradeData'></table></body></html>"

        async def query_selector(self, sel):
            mapping = {
                "select#state": FakeEl("SELECT"),
                "select#district": FakeEl("SELECT"),
                "select#commodity": FakeEl("SELECT"),
                "button#search": FakeEl("BUTTON"),
                "table#tradeData": FakeTable(),
            }
            return mapping.get(sel)

        async def select_option(self, *_a, **_k):
            return ["ok"]

        async def click(self, *_a, **_k):
            return None

        async def wait_for_timeout(self, _ms):
            return None

    cfg = {
        "headless": True,
        "timeout_ms": 2000,
        "rate_limit_ms": 0,
        "cache_dir": str(tmp_path),
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "portals": {
            "enam": {
                "enabled": True,
                "display_name": "e-NAM",
                "base_url": "https://example.test/enam",
                "selectors_module": "agent.selectors.enam_selectors",
            },
            "agmarknet": {"enabled": False, "base_url": "", "selectors_module": ""},
        },
    }

    async def factory():
        return FakePage()

    records = await run_price_fetch(
        "Paddy",
        "Hooghly",
        "West Bengal",
        mode="live",
        page_factory=factory,
        config=cfg,
    )
    names = {r.mandi_name for r in records}
    assert "Burdwan Mandi" in names
    assert "Dhaniakhali Mandi" in names
    assert "Bad Row" not in names
    assert all(r.data_mode == "live" for r in records)
    assert all(r.source_portal == "e-NAM" for r in records)


def test_dedupe_prefers_complete_not_max_price():
    a = PriceRecord(
        mandi_name="Burdwan Mandi",
        district="Purba Bardhaman",
        crop="Paddy",
        modal_price_per_quintal=9999,
        min_price=9000,
        max_price=10000,
        date="2026-08-20",
        source_portal="Unknown",
        variety="",
    )
    b = PriceRecord(
        mandi_name="Burdwan Mandi",
        district="Purba Bardhaman",
        crop="Paddy",
        modal_price_per_quintal=2320,
        min_price=2200,
        max_price=2400,
        date="2026-08-20",
        source_portal="e-NAM",
        variety="Common",
    )
    out = dedupe_records([a, b])
    assert len(out) == 1
    assert out[0].modal_price_per_quintal == 2320
    assert out[0].source_portal == "e-NAM"


def test_validate_crop_mismatch():
    rec = PriceRecord(
        mandi_name="Burdwan Mandi",
        district="Purba Bardhaman",
        crop="Cotton",
        modal_price_per_quintal=2320,
        min_price=2200,
        max_price=2400,
        date="2026-08-20",
    )
    assert validate_record(rec, "Paddy") == "crop_mismatch"


def test_records_from_table_rows_parses_rupees():
    rows = [
        ["Burdwan Mandi", "Purba Bardhaman", "Paddy", "Common", "₹2,200", "₹2,400", "₹2,320", "2026-08-20"],
    ]
    columns = {
        "mandi_name": 0,
        "district": 1,
        "crop": 2,
        "variety": 3,
        "min_price": 4,
        "max_price": 5,
        "modal_price": 6,
        "date": 7,
    }
    recs = records_from_table_rows(rows, columns, "Paddy", "e-NAM", "2026-08-20", "now", "live")
    assert recs[0].modal_price_per_quintal == 2320
