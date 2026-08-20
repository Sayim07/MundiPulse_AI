"""
Test cases for MandiPulse AI Agent & Gemini Mock Services.
"""

import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.mock_agent import run_mock_agent
from services.mock_gemini import generate_mock_recommendation


@pytest.mark.asyncio
async def test_mock_agent_returns_valid_records():
    records = await run_mock_agent(crop="Paddy", district="Hooghly")
    assert len(records) > 0
    for record in records:
        assert record.crop == "Paddy"
        assert record.modal_price_per_quintal > 0
        assert record.min_price <= record.max_price
        assert record.source_portal in ["e-NAM", "Agmarknet"]


@pytest.mark.asyncio
async def test_mock_gemini_generates_recommendation():
    records = await run_mock_agent(crop="Paddy", district="Hooghly")
    rec = await generate_mock_recommendation(records, home_district="Hooghly")
    assert rec.best_mandi != "N/A"
    assert rec.net_margin_per_quintal > 0
    assert "MandiPulse" in rec.alert_english
    assert "MandiPulse" in rec.alert_bengali
    assert rec.requires_approval is True


@pytest.mark.asyncio
async def test_mock_gemini_empty_records():
    rec = await generate_mock_recommendation([], home_district="Hooghly")
    assert rec.best_mandi == "N/A"
    assert rec.confidence == "low"
