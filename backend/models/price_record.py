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
    fetched_at: Optional[str] = None
    data_mode: Optional[str] = None
    net_price_per_quintal: Optional[float] = None
    home_net_price_per_quintal: Optional[float] = None
    additional_margin_per_quintal: Optional[float] = None
    coords_missing: bool = False
    vehicle_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    maps_url: Optional[str] = None
    maps_embed_url: Optional[str] = None
    market_id: Optional[int] = None


class LLMRecommendation(BaseModel):
    """Recommendation shown in the UI. Money fields come from Python, not Gemini."""
    best_mandi: str
    net_margin_per_quintal: float
    reasoning_summary: str
    alert_bengali: str
    alert_english: str
    requires_approval: bool = True
    confidence: str = "high"
    home_mandi: Optional[str] = None
    home_net_price_per_quintal: Optional[float] = None
    additional_margin_per_quintal: Optional[float] = None
    source_portal: Optional[str] = None
    fetched_at: Optional[str] = None
    data_mode: Optional[str] = None
    confidence_score: Optional[int] = None


class QueryRequest(BaseModel):
    """Incoming query from the frontend."""
    crop: str = Field(..., json_schema_extra={"example": "Paddy"})
    district: str = Field(..., json_schema_extra={"example": "Hooghly"})
    state: str = Field(default="West Bengal", json_schema_extra={"example": "West Bengal"})
    mode: str = Field(default="live", json_schema_extra={"example": "live"})
    commodity_id: Optional[int] = None
    district_id: Optional[int] = None
    state_id: Optional[int] = None
    market_id: Optional[int] = None
    market_name: Optional[str] = None


class ApprovalRequest(BaseModel):
    """HITL approval action from the organizer."""
    run_id: str
    approved: bool
    approved_by: Optional[str] = None
    edited_message: Optional[str] = None
    recipients: list[str] = Field(default_factory=list)
