"""Nominatim geocode + Google Maps links (no Google billing key required for search URLs)."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Optional
from urllib.parse import quote_plus

import httpx

from models.price_record import PriceRecord

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_CACHE_PATH = os.path.join(_REPO_ROOT, "data", "geocode_cache.json")
_NOMINATIM = "https://nominatim.openstreetmap.org/search"
_UA = "MandiPulseAI/1.0 (agri hackathon; local use)"


def google_maps_search_url(query: str) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}"


def google_maps_embed_url(*, lat: Optional[float] = None, lon: Optional[float] = None, query: str = "") -> str:
    if lat is not None and lon is not None:
        q = f"{lat},{lon}"
    else:
        q = query
    return f"https://maps.google.com/maps?q={quote_plus(q)}&z=14&output=embed"


def _load_cache() -> dict:
    try:
        with open(_CACHE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _save_cache(cache: dict) -> None:
    os.makedirs(os.path.dirname(_CACHE_PATH), exist_ok=True)
    tmp = _CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(cache, fh)
    os.replace(tmp, _CACHE_PATH)


async def geocode_query(query: str, client: httpx.AsyncClient, cache: dict) -> Optional[tuple[float, float]]:
    key = query.strip().lower()
    if not key:
        return None
    hit = cache.get(key)
    if isinstance(hit, dict) and "lat" in hit and "lon" in hit:
        return float(hit["lat"]), float(hit["lon"])
    if hit is False:
        return None
    resp = await client.get(
        _NOMINATIM,
        params={"q": query, "format": "json", "limit": 1, "countrycodes": "in"},
        headers={"User-Agent": _UA},
    )
    if resp.status_code != 200:
        return None
    rows = resp.json()
    if not rows:
        cache[key] = False
        return None
    lat = float(rows[0]["lat"])
    lon = float(rows[0]["lon"])
    cache[key] = {"lat": lat, "lon": lon}
    await asyncio.sleep(1.05)
    return lat, lon


async def attach_maps(records: list[PriceRecord], state: str) -> None:
    if not records:
        return
    cache = _load_cache()
    async with httpx.AsyncClient(timeout=20.0) as client:
        for rec in records:
            place = f"{rec.mandi_name}, {rec.district}, {state}, India"
            rec.maps_url = google_maps_search_url(place)
            rec.maps_embed_url = google_maps_embed_url(query=place)
            coords = await geocode_query(place, client, cache)
            if coords:
                rec.latitude, rec.longitude = coords
                rec.maps_url = google_maps_search_url(f"{coords[0]},{coords[1]}")
                rec.maps_embed_url = google_maps_embed_url(lat=coords[0], lon=coords[1])
    _save_cache(cache)
