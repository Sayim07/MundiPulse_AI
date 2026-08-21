"""
Golden tests for the deterministic margin engine.
"""

import math
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from models.price_record import PriceRecord
from services.margin_calculator import (
    EARTH_RADIUS_KM,
    calculate_margins,
    choose_vehicle,
    haversine_km,
    load_transport_rates,
    match_mandi,
    load_mandi_master,
)


# mandi_master.json
DHANIAKHALI = (22.98, 88.28)
BURDWAN = (23.23, 87.85)


def test_haversine_zero():
    assert haversine_km(*DHANIAKHALI, *DHANIAKHALI) == 0.0


def test_haversine_dhaniakhali_to_burdwan_golden():
    """Known lat/lon pair — independent of portal data."""
    km = haversine_km(*DHANIAKHALI, *BURDWAN)
    # Reference: spherical law of cosines with R=6371
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (*DHANIAKHALI, *BURDWAN))
    expected = EARTH_RADIUS_KM * math.acos(
        min(
            1.0,
            math.sin(rlat1) * math.sin(rlat2)
            + math.cos(rlat1) * math.cos(rlat2) * math.cos(rlon2 - rlon1),
        )
    )
    assert abs(km - expected) < 0.05
    assert round(km, 1) == 52.0


def test_vehicle_band_for_52km():
    bands, default = load_transport_rates()
    band, rate, flag = choose_vehicle(52.0, bands, default)
    assert flag is None
    assert band is not None
    assert band.vehicle_type == "Mini Truck"
    assert rate == 2.8


def test_calculate_margins_golden_net_and_additional():
    date = "2026-08-20"
    records = [
        PriceRecord(
            mandi_name="Dhaniakhali Mandi",
            district="Hooghly",
            crop="Paddy",
            modal_price_per_quintal=2000,
            min_price=1900,
            max_price=2100,
            date=date,
            source_portal="e-NAM",
        ),
        PriceRecord(
            mandi_name="Burdwan Mandi",
            district="Purba Bardhaman",
            crop="Paddy",
            modal_price_per_quintal=2320,
            min_price=2200,
            max_price=2400,
            date=date,
            source_portal="e-NAM",
        ),
    ]
    result = calculate_margins(records, home_district="Hooghly")
    by_name = {r.mandi_name: r for r in result.records}

    home = by_name["Dhaniakhali Mandi"]
    assert home.distance_km == 0.0
    assert home.transport_cost_per_quintal == 0.0
    assert home.net_price_per_quintal == 2000.0

    burdwan = by_name["Burdwan Mandi"]
    km = haversine_km(*DHANIAKHALI, *BURDWAN)
    expected_km = round(km, 2)
    expected_transport = round(expected_km * 2.8, 2)
    expected_net = round(2320 - expected_transport, 2)

    assert burdwan.distance_km == expected_km
    assert burdwan.transport_cost_per_quintal == expected_transport
    assert burdwan.net_price_per_quintal == expected_net
    assert burdwan.coords_missing is False

    assert result.home_mandi == "Dhaniakhali Mandi"
    assert result.best_mandi == "Burdwan Mandi"
    assert result.home_net_price_per_quintal == 2000.0
    assert result.best_net_price_per_quintal == expected_net
    assert result.additional_margin_per_quintal == round(expected_net - 2000.0, 2)
    assert result.additional_margin_per_quintal > 0


def test_transport_can_erase_modal_advantage():
    """₹140 modal gap is not enough vs ~52 km Mini Truck cost."""
    records = [
        PriceRecord(
            mandi_name="Dhaniakhali Mandi",
            district="Hooghly",
            crop="Paddy",
            modal_price_per_quintal=2180,
            min_price=2050,
            max_price=2250,
            date="2026-08-20",
            source_portal="e-NAM",
        ),
        PriceRecord(
            mandi_name="Burdwan Mandi",
            district="Purba Bardhaman",
            crop="Paddy",
            modal_price_per_quintal=2320,
            min_price=2200,
            max_price=2400,
            date="2026-08-20",
            source_portal="e-NAM",
        ),
    ]
    result = calculate_margins(records, home_district="Hooghly")
    assert result.best_mandi == "Dhaniakhali Mandi"
    assert result.additional_margin_per_quintal == 0.0


def test_missing_coords_flagged_not_invented():
    records = [
        PriceRecord(
            mandi_name="Completely Unknown Yard",
            district="Mars",
            crop="Paddy",
            modal_price_per_quintal=2000,
            min_price=1900,
            max_price=2100,
            date="2026-08-20",
            source_portal="e-NAM",
        )
    ]
    result = calculate_margins(records, home_district="Hooghly")
    rec = result.records[0]
    assert rec.coords_missing is True
    assert rec.distance_km is None
    assert rec.transport_cost_per_quintal is None
    assert rec.net_price_per_quintal == 2000
    assert any("unmatched_mandi" in f for f in result.flags)
    assert rec.distance_km != 9999


def test_fuzzy_mandi_match():
    master = load_mandi_master()
    geo = match_mandi("burdwan", "Purba Bardhaman", master)
    assert geo is not None
    assert geo.name == "Burdwan Mandi"


def test_district_avg_uses_centroid_not_unmatched():
    records = [
        PriceRecord(
            mandi_name="Nadia (Agmarknet district avg)",
            district="Nadia",
            crop="Potato",
            modal_price_per_quintal=700,
            min_price=700,
            max_price=700,
            date="2026-08-19",
            source_portal="Agmarknet",
        ),
        PriceRecord(
            mandi_name="Alipurduar (Agmarknet district avg)",
            district="Alipurduar",
            crop="Potato",
            modal_price_per_quintal=800,
            min_price=800,
            max_price=800,
            date="2026-08-19",
            source_portal="Agmarknet",
        ),
    ]
    result = calculate_margins(records, home_district="Nadia")
    assert not any(f.startswith("unmatched_mandi") for f in result.flags)
    far = next(r for r in result.records if "Alipurduar" in r.mandi_name)
    assert far.coords_missing is False
    assert far.distance_km is not None and far.distance_km > 50
    assert result.confidence != "low"
