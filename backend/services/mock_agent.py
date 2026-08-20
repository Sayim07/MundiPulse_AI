"""
MandiPulse AI — Mock webcmd Agent
Simulates the webcmd browser agent scraping mandi prices from portals.
Replace with real webcmd integration for production.
"""

import asyncio
import random
from typing import TypedDict
from models.price_record import PriceRecord


class MandiSeedEntry(TypedDict):
    mandi_name: str
    district: str
    modal: int
    min: int
    max: int
    distance: float
    source: str


# ── Realistic seed data for West Bengal mandis ──────────────────────────────
MOCK_MANDI_DATA: dict[str, dict[str, list[MandiSeedEntry]]] = {
    "Paddy": {
        "Hooghly": [
            {"mandi_name": "Dhaniakhali Mandi", "district": "Hooghly", "modal": 2180, "min": 2050, "max": 2250, "distance": 0.0, "source": "e-NAM"},
            {"mandi_name": "Burdwan Mandi", "district": "Purba Bardhaman", "modal": 2320, "min": 2200, "max": 2400, "distance": 65.0, "source": "e-NAM"},
            {"mandi_name": "Memari Mandi", "district": "Purba Bardhaman", "modal": 2275, "min": 2150, "max": 2350, "distance": 52.0, "source": "Agmarknet"},
            {"mandi_name": "Krishnanagar Mandi", "district": "Nadia", "modal": 2210, "min": 2100, "max": 2300, "distance": 78.0, "source": "e-NAM"},
        ],
        "Purba Bardhaman": [
            {"mandi_name": "Burdwan Mandi", "district": "Purba Bardhaman", "modal": 2320, "min": 2200, "max": 2400, "distance": 0.0, "source": "e-NAM"},
            {"mandi_name": "Memari Mandi", "district": "Purba Bardhaman", "modal": 2275, "min": 2150, "max": 2350, "distance": 18.0, "source": "Agmarknet"},
            {"mandi_name": "Dhaniakhali Mandi", "district": "Hooghly", "modal": 2180, "min": 2050, "max": 2250, "distance": 65.0, "source": "e-NAM"},
            {"mandi_name": "Katwa Mandi", "district": "Purba Bardhaman", "modal": 2290, "min": 2180, "max": 2380, "distance": 42.0, "source": "e-NAM"},
        ],
        "Nadia": [
            {"mandi_name": "Krishnanagar Mandi", "district": "Nadia", "modal": 2210, "min": 2100, "max": 2300, "distance": 0.0, "source": "e-NAM"},
            {"mandi_name": "Ranaghat Mandi", "district": "Nadia", "modal": 2240, "min": 2130, "max": 2320, "distance": 25.0, "source": "Agmarknet"},
            {"mandi_name": "Burdwan Mandi", "district": "Purba Bardhaman", "modal": 2320, "min": 2200, "max": 2400, "distance": 78.0, "source": "e-NAM"},
            {"mandi_name": "Dhaniakhali Mandi", "district": "Hooghly", "modal": 2180, "min": 2050, "max": 2250, "distance": 92.0, "source": "e-NAM"},
        ],
    },
    "Potato": {
        "Hooghly": [
            {"mandi_name": "Dhaniakhali Mandi", "district": "Hooghly", "modal": 1450, "min": 1350, "max": 1520, "distance": 0.0, "source": "e-NAM"},
            {"mandi_name": "Burdwan Mandi", "district": "Purba Bardhaman", "modal": 1580, "min": 1480, "max": 1650, "distance": 65.0, "source": "e-NAM"},
            {"mandi_name": "Memari Mandi", "district": "Purba Bardhaman", "modal": 1520, "min": 1420, "max": 1600, "distance": 52.0, "source": "Agmarknet"},
            {"mandi_name": "Krishnanagar Mandi", "district": "Nadia", "modal": 1490, "min": 1380, "max": 1560, "distance": 78.0, "source": "e-NAM"},
        ],
    },
    "Mustard": {
        "Hooghly": [
            {"mandi_name": "Dhaniakhali Mandi", "district": "Hooghly", "modal": 5800, "min": 5600, "max": 5950, "distance": 0.0, "source": "e-NAM"},
            {"mandi_name": "Burdwan Mandi", "district": "Purba Bardhaman", "modal": 6100, "min": 5900, "max": 6250, "distance": 65.0, "source": "Agmarknet"},
            {"mandi_name": "Katwa Mandi", "district": "Purba Bardhaman", "modal": 6020, "min": 5850, "max": 6150, "distance": 70.0, "source": "e-NAM"},
            {"mandi_name": "Krishnanagar Mandi", "district": "Nadia", "modal": 5880, "min": 5700, "max": 6000, "distance": 78.0, "source": "e-NAM"},
        ],
    },
}

TRANSPORT_RATE_PER_KM_PER_QUINTAL = 3.5  # ₹/km/quintal


async def run_mock_agent(crop: str, district: str, state: str = "West Bengal") -> list[PriceRecord]:
    """
    Simulates webcmd agent fetching prices from government portals.
    Adds slight random noise to prices for realism.
    """
    await asyncio.sleep(0.5)  # Simulate network latency

    crop_data = MOCK_MANDI_DATA.get(crop, MOCK_MANDI_DATA.get("Paddy", {}))
    district_data = crop_data.get(district, list(crop_data.values())[0] if crop_data else [])

    records: list[PriceRecord] = []
    for entry in district_data:
        noise = random.randint(-20, 20)
        distance = float(entry["distance"])
        transport_cost = round(distance * TRANSPORT_RATE_PER_KM_PER_QUINTAL, 2)

        records.append(PriceRecord(
            mandi_name=str(entry["mandi_name"]),
            district=str(entry["district"]),
            crop=crop,
            variety="Common",
            modal_price_per_quintal=float(entry["modal"] + noise),
            min_price=float(entry["min"] + noise),
            max_price=float(entry["max"] + noise),
            date="2026-08-20",
            source_portal=str(entry["source"]),
            distance_km=distance,
            transport_cost_per_quintal=transport_cost,
        ))

    return records
