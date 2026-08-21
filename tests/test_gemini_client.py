"""Gemini wording-only: numbers in the recommendation always equal Python facts."""

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from llm.gemini_client import explain_and_localize, draft_alerts_from_facts


FACTS = {
    "crop": "Paddy",
    "best_mandi": "Burdwan Mandi",
    "home_mandi": "Krishnanagar Mandi",
    "modal_price_per_quintal": 2150,
    "transport_cost_per_quintal": 55,
    "distance_km": 20,
    "net_price_per_quintal": 2095,
    "home_net_price_per_quintal": 1990,
    "additional_margin_per_quintal": 105,
    "source_portal": "e-NAM",
    "date": "2026-08-20",
    "fetched_at": "2026-08-21T10:32:00+05:30",
    "data_mode": "demo",
    "confidence": "high",
    "confidence_score": 94,
}


@pytest.mark.asyncio
async def test_gemini_mock_cannot_change_numbers():
    def fake_generate(_prompt: str) -> str:
        return json.dumps(
            {
                "reasoning_summary": "Actually the net is ₹999999 and you should sell on Mars.",
                "alert_bengali": "নেট ₹999999",
                "alert_english": "Net ₹999999 — invented",
            }
        )

    rec = await explain_and_localize(FACTS, api_key="", _generate=fake_generate)
    assert rec.net_margin_per_quintal == 2095
    assert rec.best_mandi == "Burdwan Mandi"
    assert rec.additional_margin_per_quintal == 105
    assert rec.home_net_price_per_quintal == 1990
    assert rec.requires_approval is True


@pytest.mark.asyncio
async def test_template_fallback_copies_python_numbers():
    rec = await explain_and_localize(FACTS, api_key="")
    assert rec.net_margin_per_quintal == FACTS["net_price_per_quintal"]
    assert "2095" in rec.alert_english
    assert "105" in rec.alert_english
    assert "2095" in rec.alert_bengali
    draft = draft_alerts_from_facts(FACTS)
    assert "2095" in draft["alert_english"]


@pytest.mark.asyncio
async def test_invalid_json_falls_back_to_template():
    rec = await explain_and_localize(FACTS, api_key="", _generate=lambda p: "not-json")
    assert rec.net_margin_per_quintal == 2095
    assert rec.alert_english  # template filled
