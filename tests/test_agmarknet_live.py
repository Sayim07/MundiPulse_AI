"""Agmarknet official JSON → PriceRecord (no live network)."""

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from agent.agmarknet_live import (
    fetch_agmarknet_district_prices,
    records_from_dashboard_payload,
    search_commodities,
    search_districts,
    search_markets,
)
from services.margin_calculator import load_mandi_master, match_mandi


def test_records_from_dashboard_payload():
    payload = {
        "data": {
            "records": [
                {
                    "cmdt_name": "Mustard",
                    "as_on_price": "6627.93",
                    "reported_date": "19-08-2026",
                }
            ]
        }
    }
    rows = records_from_dashboard_payload(
        payload, crop="Mustard", district_name="Hooghly", fetched_at="2026-08-21T00:00:00+00:00"
    )
    assert len(rows) == 1
    assert rows[0].modal_price_per_quintal == 6627.93
    assert rows[0].data_mode == "live"
    assert rows[0].source_portal == "Agmarknet"
    assert "district avg" in rows[0].mandi_name.lower()
    assert rows[0].date == "2026-08-19"


@pytest.mark.asyncio
async def test_fetch_agmarknet_with_fake_client():
    class Resp:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    class FakeClient:
        async def get(self, url):
            return Resp(
                {
                    "data": {
                        "state_data": [{"state_id": 36, "state_name": "West Bengal"}],
                        "cmdt_data": [{"cmdt_id": 12, "cmdt_name": "Mustard"}],
                        "district_data": [
                            {"id": 681, "state_id": 36, "district_name": "Hooghly"},
                            {"id": 677, "state_id": 36, "district_name": "Burdwan"},
                        ],
                    }
                }
            )

        async def post(self, url, json=None):
            return Resp(
                {
                    "status": "success",
                    "data": {
                        "records": [
                            {"cmdt_name": "Mustard", "as_on_price": "6100", "reported_date": "19-08-2026"}
                        ]
                    },
                }
            )

    rows = await fetch_agmarknet_district_prices("Mustard", "Hooghly", "West Bengal", client=FakeClient())
    assert len(rows) >= 1
    assert all(r.data_mode == "live" for r in rows)
    assert all(r.crop == "Mustard" for r in rows)


def test_district_avg_name_gets_coords():
    master = load_mandi_master()
    geo = match_mandi("Hooghly (Agmarknet district avg)", "Hooghly", master)
    assert geo is not None
    assert geo.lat and geo.lon


def test_search_commodities_and_districts_from_filters():
    filters = {
        "cmdt_data": [
            {"cmdt_id": 100001, "cmdt_name": "All Commodities"},
            {"cmdt_id": 12, "cmdt_name": "Mustard"},
            {"cmdt_id": 2, "cmdt_name": "Paddy(Common)"},
        ],
        "state_data": [{"state_id": 36, "state_name": "West Bengal"}],
        "district_data": [
            {"id": 681, "state_id": 36, "district_name": "Hooghly"},
            {"id": 684, "state_id": 36, "district_name": "Nadia"},
        ],
    }
    crops = search_commodities(filters, "mus")
    assert crops[0]["name"] == "Mustard"
    assert crops[0]["id"] == 12
    areas = search_districts(filters, "nad")
    assert areas[0]["name"] == "Nadia"
    assert "West Bengal" in areas[0]["label"]


def test_search_markets_filters_by_district():
    filters = {
        "market_data": [
            {"id": 100009, "mkt_name": "All Markets", "district_id": 681},
            {"id": 11, "mkt_name": "Sheoraphuli APMC", "district_id": 681, "state_id": 36},
            {"id": 22, "mkt_name": "Krishnanagar APMC", "district_id": 684, "state_id": 36},
        ]
    }
    hooghly = search_markets(filters, 681, "")
    assert [m["name"] for m in hooghly] == ["Sheoraphuli APMC"]
    named = search_markets(filters, 681, "sheo")
    assert named[0]["id"] == 11
