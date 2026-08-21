"""
Deterministic transport-adjusted margin engine.

Python is the only source of truth for rupee figures. Gemini must never
recalculate these values.
"""

from __future__ import annotations

import json
import math
import os
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Optional

from models.price_record import PriceRecord

EARTH_RADIUS_KM = 6371.0
NEAR_ZERO_KM = 1.0
NAME_MATCH_THRESHOLD = 0.55

_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data")
)


def _load_json(filename: str) -> dict:
    path = os.path.join(_DATA_DIR, filename)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def normalize_name(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = text.lower().strip()
    text = re.sub(r"\b(mandi|market|apmc|yard)\b", "", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def fuzzy_ratio(a: str, b: str) -> float:
    na, nb = normalize_name(a), normalize_name(b)
    if not na or not nb:
        return 0.0
    if na == nb or na in nb or nb in na:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


@dataclass
class MandiGeo:
    name: str
    district: str
    state: str
    lat: float
    lon: float


@dataclass
class TransportBand:
    vehicle_type: str
    rate_per_km_per_quintal: float
    max_distance_km: float


@dataclass
class MarginResult:
    records: list[PriceRecord]
    home_mandi: Optional[str]
    home_net_price_per_quintal: Optional[float]
    best_mandi: Optional[str]
    best_net_price_per_quintal: Optional[float]
    additional_margin_per_quintal: Optional[float]
    best_source_portal: Optional[str] = None
    best_distance_km: Optional[float] = None
    best_transport_cost_per_quintal: Optional[float] = None
    best_modal_price_per_quintal: Optional[float] = None
    flags: list[str] = field(default_factory=list)
    confidence: str = "medium"
    confidence_score: int = 70


def load_mandi_master(path: Optional[str] = None) -> list[MandiGeo]:
    if path is None:
        raw = _load_json("mandi_master.json")
    else:
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
    mandis = []
    for row in raw.get("mandis", []):
        mandis.append(
            MandiGeo(
                name=row["name"],
                district=row["district"],
                state=row.get("state", "West Bengal"),
                lat=float(row["lat"]),
                lon=float(row["lon"]),
            )
        )
    return mandis


def load_transport_rates(path: Optional[str] = None) -> tuple[list[TransportBand], float]:
    if path:
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = _load_json("transport_rates.json")
    bands = [
        TransportBand(
            vehicle_type=r["vehicle_type"],
            rate_per_km_per_quintal=float(r["rate_per_km_per_quintal"]),
            max_distance_km=float(r["max_distance_km"]),
        )
        for r in raw.get("rates", [])
    ]
    bands.sort(key=lambda b: b.max_distance_km)
    default_rate = float(raw.get("default_rate_per_km_per_quintal", 3.5))
    return bands, default_rate


_DISTRICT_ALIASES = {
    "burdwan": "purba bardhaman",
    "bardhaman": "purba bardhaman",
    "barddhaman": "purba bardhaman",
    "cooch behar": "coochbehar",
    "koch bihar": "coochbehar",
    "hugli": "hooghly",
    "north twenty four parganas": "north 24 parganas",
    "south twenty four parganas": "south 24 parganas",
}


_CENTROIDS_CACHE: Optional[list[MandiGeo]] = None


def load_district_centroids() -> list[MandiGeo]:
    global _CENTROIDS_CACHE
    if _CENTROIDS_CACHE is not None:
        return _CENTROIDS_CACHE
    try:
        raw = _load_json("district_centroids.json")
    except FileNotFoundError:
        _CENTROIDS_CACHE = []
        return _CENTROIDS_CACHE
    out: list[MandiGeo] = []
    for row in raw.get("centroids", []):
        out.append(
            MandiGeo(
                name=row["district"],
                district=row["district"],
                state=row.get("state", "West Bengal"),
                lat=float(row["lat"]),
                lon=float(row["lon"]),
            )
        )
    _CENTROIDS_CACHE = out
    return out


def _canon_district(name: str) -> str:
    n = normalize_name(name)
    return _DISTRICT_ALIASES.get(n, n)


def match_district_centroid(district: str, state: str = "") -> Optional[MandiGeo]:
    target = _canon_district(district)
    state_n = normalize_name(state)
    for geo in load_district_centroids():
        if _canon_district(geo.district) != target:
            continue
        if state_n and "bengal" not in state_n and normalize_name(geo.state) != state_n:
            continue
        return MandiGeo(name=district, district=geo.district, state=geo.state, lat=geo.lat, lon=geo.lon)
    return None


def match_location(name: str, district: str, master: list[MandiGeo], state: str = "") -> Optional[MandiGeo]:
    hit = match_mandi(name, district, master)
    if hit:
        return hit
    return match_district_centroid(district, state)


def match_mandi(name: str, district: str, master: list[MandiGeo]) -> Optional[MandiGeo]:
    best: Optional[MandiGeo] = None
    best_score = 0.0
    district_n = normalize_name(district)
    for geo in master:
        score = fuzzy_ratio(name, geo.name)
        if district_n and normalize_name(geo.district) == district_n:
            score += 0.08
        if score > best_score:
            best_score = score
            best = geo
    if best is None or best_score < NAME_MATCH_THRESHOLD:
        in_district = [m for m in master if district_n and normalize_name(m.district) == district_n]
        if in_district:
            lat = sum(m.lat for m in in_district) / len(in_district)
            lon = sum(m.lon for m in in_district) / len(in_district)
            return MandiGeo(name=name, district=in_district[0].district, state=in_district[0].state, lat=lat, lon=lon)
        return None
    return best


def home_origin(
    home_district: str, master: list[MandiGeo]
) -> tuple[Optional[tuple[float, float]], Optional[MandiGeo], list[str]]:
    """Origin = a mandi in the home district, else centroid of those coords."""
    flags: list[str] = []
    in_district = [m for m in master if _canon_district(m.district) == _canon_district(home_district)]
    if not in_district:
        centroid = match_district_centroid(home_district)
        if centroid:
            return (centroid.lat, centroid.lon), centroid, flags
        flags.append(f"no_home_district_coords:{home_district}")
        return None, None, flags
    lat = sum(m.lat for m in in_district) / len(in_district)
    lon = sum(m.lon for m in in_district) / len(in_district)
    # Prefer a named mandi closest to the centroid as the "home mandi" label.
    home = min(in_district, key=lambda m: haversine_km(lat, lon, m.lat, m.lon))
    return (lat, lon), home, flags


def choose_vehicle(
    distance_km: float, bands: list[TransportBand], default_rate: float
) -> tuple[Optional[TransportBand], float, Optional[str]]:
    if distance_km <= NEAR_ZERO_KM:
        return None, 0.0, None
    for band in bands:
        if distance_km <= band.max_distance_km:
            return band, band.rate_per_km_per_quintal, None
    flag = f"distance_exceeds_bands:{distance_km:.1f}km"
    return None, default_rate, flag


def calculate_margins(
    records: list[PriceRecord],
    home_district: str,
    mandi_master: Optional[list[MandiGeo]] = None,
    transport_path: Optional[str] = None,
) -> MarginResult:
    """
    Annotate each record with distance, transport cost, and net price.
    Pick best mandi by net price vs home (same district / ~0 km).
    Missing coords are flagged; distances are never invented.
    """
    master = mandi_master if mandi_master is not None else load_mandi_master()
    bands, default_rate = load_transport_rates(transport_path)
    flags: list[str] = []

    origin, home_geo, origin_flags = home_origin(home_district, master)
    flags.extend(origin_flags)

    annotated: list[PriceRecord] = []
    for rec in records:
        geo = match_location(rec.mandi_name, rec.district, master)
        distance: Optional[float] = None
        transport: Optional[float] = None
        coords_missing = False

        if origin is None or geo is None:
            coords_missing = True
            if geo is None and "district avg" not in (rec.mandi_name or "").lower():
                flags.append(f"unmatched_mandi:{rec.mandi_name}")
            # Do not invent a large distance. Leave km/cost unset; net = modal.
            rec = rec.model_copy(
                update={
                    "distance_km": None,
                    "transport_cost_per_quintal": None,
                    "coords_missing": True,
                    "net_price_per_quintal": rec.modal_price_per_quintal,
                }
            )
        else:
            same_district = normalize_name(rec.district) == normalize_name(home_district)
            raw_km = haversine_km(origin[0], origin[1], geo.lat, geo.lon)
            if same_district and raw_km < NEAR_ZERO_KM:
                distance = 0.0
            elif same_district and fuzzy_ratio(rec.mandi_name, home_geo.name if home_geo else "") >= 0.9:
                distance = 0.0
            else:
                distance = round(raw_km, 2)
            band, rate, band_flag = choose_vehicle(distance, bands, default_rate)
            if band_flag:
                flags.append(band_flag)
            transport = round(distance * rate, 2) if distance else 0.0
            rec = rec.model_copy(
                update={
                    "distance_km": distance,
                    "transport_cost_per_quintal": transport,
                    "coords_missing": coords_missing,
                    "net_price_per_quintal": round(rec.modal_price_per_quintal - transport, 2),
                    "vehicle_type": band.vehicle_type if band else None,
                }
            )
        annotated.append(rec)

    home_record = _pick_home_record(annotated, home_district)
    scored = [r for r in annotated if r.net_price_per_quintal is not None]
    best = max(scored, key=lambda r: r.net_price_per_quintal or 0) if scored else None

    home_net = home_record.net_price_per_quintal if home_record else None
    best_net = best.net_price_per_quintal if best else None
    additional = None
    if home_net is not None and best_net is not None:
        additional = round(best_net - home_net, 2)

    if best:
        best = best.model_copy(
            update={
                "home_net_price_per_quintal": home_net,
                "additional_margin_per_quintal": additional,
            }
        )
        # Keep list in sync with updated best object
        annotated = [best if r.mandi_name == best.mandi_name and r.date == best.date else r for r in annotated]

    score, level = _confidence(annotated, flags)
    return MarginResult(
        records=annotated,
        home_mandi=home_record.mandi_name if home_record else (home_geo.name if home_geo else None),
        home_net_price_per_quintal=home_net,
        best_mandi=best.mandi_name if best else None,
        best_net_price_per_quintal=best_net,
        additional_margin_per_quintal=additional,
        best_source_portal=best.source_portal if best else None,
        best_distance_km=best.distance_km if best else None,
        best_transport_cost_per_quintal=best.transport_cost_per_quintal if best else None,
        best_modal_price_per_quintal=best.modal_price_per_quintal if best else None,
        flags=flags,
        confidence=level,
        confidence_score=score,
    )


def _pick_home_record(records: list[PriceRecord], home_district: str) -> Optional[PriceRecord]:
    same = [r for r in records if normalize_name(r.district) == normalize_name(home_district)]
    if not same:
        zeros = [r for r in records if r.distance_km is not None and r.distance_km <= NEAR_ZERO_KM]
        return zeros[0] if zeros else None
    with_zero = [r for r in same if r.distance_km is not None and r.distance_km <= NEAR_ZERO_KM]
    if with_zero:
        return min(with_zero, key=lambda r: r.distance_km or 0)
    known = [r for r in same if r.distance_km is not None]
    if known:
        return min(known, key=lambda r: r.distance_km or 0)
    return same[0]


def _confidence(records: list[PriceRecord], flags: list[str]) -> tuple[int, str]:
    if not records:
        return 20, "low"
    complete = sum(
        1
        for r in records
        if r.distance_km is not None and r.transport_cost_per_quintal is not None
    )
    completeness = complete / max(len(records), 1)
    unmatched = sum(1 for f in flags if f.startswith("unmatched_mandi"))
    score = int(
        round(
            30  # freshness assumed ok at calc time
            + 25  # source already validated upstream
            + 20 * completeness
            + 15  # sanity passed for records that reached here
            + 10 * (1 - min(unmatched / max(len(records), 1), 1))
        )
    )
    if unmatched:
        score -= 10
    score = max(0, min(100, score))
    if score >= 90:
        return score, "high"
    if score >= 70:
        return score, "medium"
    return score, "low"


def facts_for_llm(result: MarginResult, crop: str, data_mode: str, fetched_at: str, date: str) -> dict:
    """Structured facts Gemini may explain — numbers already final."""
    return {
        "crop": crop,
        "best_mandi": result.best_mandi,
        "home_mandi": result.home_mandi,
        "modal_price_per_quintal": result.best_modal_price_per_quintal,
        "transport_cost_per_quintal": result.best_transport_cost_per_quintal,
        "distance_km": result.best_distance_km,
        "net_price_per_quintal": result.best_net_price_per_quintal,
        "home_net_price_per_quintal": result.home_net_price_per_quintal,
        "additional_margin_per_quintal": result.additional_margin_per_quintal,
        "source_portal": result.best_source_portal,
        "date": date,
        "fetched_at": fetched_at,
        "data_mode": data_mode,
        "confidence": result.confidence,
        "confidence_score": result.confidence_score,
        "flags": result.flags,
    }
