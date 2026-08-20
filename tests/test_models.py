"""
Test cases for MandiPulse AI Pydantic data schemas and contracts.
"""

import pytest
from pydantic import ValidationError
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from models.price_record import PriceRecord, LLMRecommendation, QueryRequest, ApprovalRequest


def test_price_record_valid():
    record = PriceRecord(
        mandi_name="Burdwan Mandi",
        district="Purba Bardhaman",
        crop="Paddy",
        variety="Common",
        modal_price_per_quintal=2320.0,
        min_price=2200.0,
        max_price=2400.0,
        date="2026-08-20",
        source_portal="e-NAM",
        distance_km=65.0,
        transport_cost_per_quintal=227.5,
    )
    assert record.mandi_name == "Burdwan Mandi"
    assert record.modal_price_per_quintal == 2320.0
    assert record.transport_cost_per_quintal == 227.5


def test_price_record_missing_required():
    with pytest.raises(ValidationError):
        PriceRecord.model_validate({
            "mandi_name": "Incomplete Mandi",
            "district": "Hooghly",
            # missing required crop, modal_price, min_price, max_price, date
        })


def test_llm_recommendation_valid():
    rec = LLMRecommendation(
        best_mandi="Burdwan Mandi",
        net_margin_per_quintal=2092.5,
        reasoning_summary="Higher modal price offsets transport cost.",
        alert_bengali="সেরা মণ্ডি: Burdwan Mandi",
        alert_english="Best Mandi: Burdwan Mandi",
        requires_approval=True,
        confidence="high",
    )
    assert rec.requires_approval is True
    assert rec.confidence == "high"


def test_query_request():
    req = QueryRequest(crop="Potato", district="Hooghly")
    assert req.crop == "Potato"
    assert req.district == "Hooghly"
    assert req.state == "West Bengal"


def test_approval_request():
    req = ApprovalRequest(run_id="abc12345", approved=True, approved_by="judge")
    assert req.run_id == "abc12345"
    assert req.approved is True
    assert req.approved_by == "judge"
