"""
MandiPulse AI — Pydantic Data Models
Core data contracts between the webcmd agent, Gemini LLM, and the frontend.
"""

from typing import Optional
from pydantic import BaseModel, Field


class PriceRecord(BaseModel):
    """Price record extracted by the webcmd agent from portals."""
    mandi_name: str
    district: str
    crop: str
    variety: str = "Common"
    modal_price_per_quintal: float
    min_price: float
    max_price: float
    date: str
    source_portal: str = "e-NAM"
    distance_km: Optional[float] = None
    transport_cost_per_quintal: Optional[float] = None


class LLMRecommendation(BaseModel):
    """Structured output from the Gemini LLM analysis."""
    best_mandi: str
    net_margin_per_quintal: float
    reasoning_summary: str
    alert_bengali: str
    alert_english: str
    requires_approval: bool = True
    confidence: str = "high"


class QueryRequest(BaseModel):
    """Incoming query from the frontend."""
    crop: str = Field(..., json_schema_extra={"example": "Paddy"})
    district: str = Field(..., json_schema_extra={"example": "Hooghly"})
    state: str = Field(default="West Bengal", json_schema_extra={"example": "West Bengal"})


class ApprovalRequest(BaseModel):
    """HITL approval action from the organizer."""
    run_id: str
    approved: bool
    approved_by: Optional[str] = None
    edited_message: Optional[str] = None
