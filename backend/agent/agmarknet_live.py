"""
Agmarknet 2.0 live prices via the same official JSON the SPA uses.

The public site no longer exposes native <select> filters. Driving custom
DIV comboboxes is unreliable (sticky header + React). We still open the
portal in the browser, then read dashboard-data JSON. Records are
district-level averages, not a named APMC yard.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
import time
from urllib.parse import quote_plus

import httpx

from models.price_record import PriceRecord
from services.margin_calculator import load_mandi_master, normalize_name

API_BASE = "https://api.agmarknet.gov.in/v1"
FILTERS_URL = f"{API_BASE}/dashboard-filters/?dashboard_name=marketwise_price_arrival"
DATA_URL = f"{API_BASE}/dashboard-data/"

HEADERS = {
    "Content-Type": "application/json",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
}

# Sentinel IDs observed on the live Agmarknet 2.0 dashboard (All *).
ALL_GROUP = 100000
ALL_COMMODITY = 100001
ALL_VARIETY = 100021
ALL_DISTRICT = 100007
ALL_MARKET = 100009
ALL_GRADE = 4

CROP_HINTS = {
    "paddy": ["paddy"],
    "rice": ["paddy"],
    "potato": ["potato"],
    "mustard": ["mustard"],
    "jute": ["jute"],
    "wheat": ["wheat"],
}

_FILTER_CACHE: dict[str, Any] = {"at": 0.0, "data": None}
_FILTER_TTL_SEC = 3600.0


async def get_filters(client: httpx.AsyncClient, force: bool = False, use_cache: bool = True) -> dict:
    now = time.monotonic()
    if (
        use_cache
        and not force
        and _FILTER_CACHE["data"] is not None
        and (now - _FILTER_CACHE["at"]) < _FILTER_TTL_SEC
    ):
        return _FILTER_CACHE["data"]
    resp = await client.get(FILTERS_URL)
    resp.raise_for_status()
    data = resp.json().get("data") or {}
    if use_cache:
        _FILTER_CACHE["data"] = data
        _FILTER_CACHE["at"] = now
    return data


def search_commodities(filters: dict, q: str, limit: int = 30) -> list[dict]:
    needle = (q or "").strip().lower()
    out = []
    for row in filters.get("cmdt_data") or []:
        cid = row.get("cmdt_id")
        name = (row.get("cmdt_name") or "").strip()
        if not name or cid in (None, ALL_COMMODITY):
            continue
        if needle and needle not in name.lower():
            continue
        out.append({"id": int(cid), "name": name, "group_id": row.get("cmdt_group_id")})
        if len(out) >= limit:
            break
    return out


def search_districts(filters: dict, q: str, limit: int = 30) -> list[dict]:
    needle = (q or "").strip().lower()
    states = {int(s["state_id"]): s.get("state_name") or "" for s in (filters.get("state_data") or []) if s.get("state_id") is not None}
    out = []
    for row in filters.get("district_data") or []:
        did = row.get("id") or row.get("district_id")
        name = (row.get("district_name") or "").strip()
        sid = row.get("state_id")
        if did in (None, ALL_DISTRICT) or not name:
            continue
        state_name = states.get(int(sid), "") if sid is not None else ""
        blob = f"{name} {state_name}".lower()
        if needle and needle not in blob:
            continue
        out.append(
            {
                "id": int(did),
                "name": name,
                "state_id": int(sid) if sid is not None else None,
                "state_name": state_name,
                "label": f"{name}, {state_name}" if state_name else name,
            }
        )
        if len(out) >= limit:
            break
    return out


def search_markets(filters: dict, district_id: int, q: str = "", limit: int = 40) -> list[dict]:
    needle = (q or "").strip().lower()
    out: list[dict] = []
    for row in filters.get("market_data") or []:
        did = row.get("district_id")
        mid = row.get("id")
        name = (row.get("mkt_name") or "").strip()
        if did is None or int(did) != int(district_id):
            continue
        if not name or mid in (None, ALL_MARKET):
            continue
        if needle and needle not in name.lower():
            continue
        sid = row.get("state_id")
        out.append(
            {
                "id": int(mid),
                "name": name,
                "district_id": int(did),
                "state_id": int(sid) if sid is not None else None,
            }
        )
        if len(out) >= limit:
            break
    return out


def _parse_price(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        amount = float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None
    if amount <= 0:
        return None
    return amount


def _match_commodity(crop: str, cmdt_data: list[dict]) -> Optional[dict]:
    hints = CROP_HINTS.get(normalize_name(crop).split()[0] if crop else "", [normalize_name(crop)])
    ranked: list[tuple[int, dict]] = []
    for row in cmdt_data:
        name = (row.get("cmdt_name") or "").lower()
        if row.get("cmdt_id") == ALL_COMMODITY:
            continue
        score = 0
        for hint in hints:
            if hint and hint in name:
                score += 2
                if name.startswith(hint):
                    score += 1
        if score:
            ranked.append((score, row))
    if not ranked:
        return None
    ranked.sort(key=lambda x: -x[0])
    return ranked[0][1]


def _match_district(name: str, state_id: int, district_data: list[dict]) -> Optional[dict]:
    target = normalize_name(name)
    aliases = {
        "purba bardhaman": ["burdwan", "bardhaman", "barddhaman"],
        "paschim medinipur": ["west midnapore", "paschim medinipur"],
    }
    extra = aliases.get(target, [])
    best = None
    best_score = 0
    for row in district_data:
        if row.get("state_id") != state_id:
            continue
        dn = normalize_name(row.get("district_name") or "")
        score = 0
        if dn == target or target == dn:
            score = 3
        elif target in dn or dn in target:
            score = 2
        elif any(a in dn or dn in a for a in extra):
            score = 2
        if score > best_score:
            best_score = score
            best = row
    return best if best_score else None


def _match_state(name: str, state_data: list[dict]) -> Optional[dict]:
    target = normalize_name(name)
    for row in state_data:
        if normalize_name(row.get("state_name") or "") == target:
            return row
        if "bengal" in target and "bengal" in normalize_name(row.get("state_name") or ""):
            return row
    return None


def comparison_districts(home_district: str) -> list[str]:
    """Legacy name list used when IDs are not supplied."""
    names = [home_district]
    try:
        master = load_mandi_master()
    except Exception:
        return names
    for geo in master:
        if geo.district not in names:
            names.append(geo.district)
    return names[:6]


def _districts_in_state(filters: dict, state_id: int, home_district_id: int) -> list[dict]:
    rows = []
    for row in filters.get("district_data") or []:
        sid = row.get("state_id")
        did = row.get("id") or row.get("district_id")
        if sid != state_id or did in (None, ALL_DISTRICT):
            continue
        rows.append(row)
    home = [r for r in rows if int(r.get("id") or r.get("district_id")) == int(home_district_id)]
    rest = [r for r in rows if int(r.get("id") or r.get("district_id")) != int(home_district_id)]
    return home + rest


def records_from_dashboard_payload(
    payload: dict,
    *,
    crop: str,
    district_name: str,
    fetched_at: str,
    mandi_name: Optional[str] = None,
    variety: Optional[str] = None,
    market_id: Optional[int] = None,
) -> list[PriceRecord]:
    data = payload.get("data") or {}
    rows = data.get("records") or []
    out: list[PriceRecord] = []
    label = mandi_name or f"{district_name} (Agmarknet district avg)"
    note = variety or (
        "Named APMC from Agmarknet market list"
        if mandi_name
        else "District-level average — not a single APMC yard"
    )
    for row in rows:
        modal = _parse_price(row.get("as_on_price"))
        if modal is None:
            continue
        raw_date = row.get("reported_date") or fetched_at[:10]
        try:
            iso_date = datetime.strptime(str(raw_date), "%d-%m-%Y").date().isoformat()
        except ValueError:
            iso_date = str(raw_date)[:10]
        place = quote_plus(f"{label}, {district_name}, India")
        out.append(
            PriceRecord(
                mandi_name=label,
                district=district_name,
                crop=crop,
                variety=note,
                modal_price_per_quintal=modal,
                min_price=modal,
                max_price=modal,
                date=iso_date,
                source_portal="Agmarknet",
                fetched_at=fetched_at,
                data_mode="live",
                market_id=market_id,
                maps_url=f"https://www.google.com/maps/search/?api=1&query={place}",
                maps_embed_url=f"https://maps.google.com/maps?q={place}&z=14&output=embed",
            )
        )
    return out


async def _price_for_district(
    client: httpx.AsyncClient,
    *,
    crop: str,
    district_name: str,
    state_id: int,
    district_id: int,
    cmdt_id: int,
    fetched_at: str,
    dates: list[date],
) -> list[PriceRecord]:
    for day in dates:
        body = {
            "dashboard": "marketwise_price_arrival",
            "date": day.isoformat(),
            "group": [ALL_GROUP],
            "commodity": [cmdt_id],
            "variety": ALL_VARIETY,
            "state": state_id,
            "district": [district_id],
            "market": [ALL_MARKET],
            "grades": [ALL_GRADE],
            "limit": 20,
            "format": "json",
        }
        try:
            data_resp = await client.post(DATA_URL, json=body)
            data_resp.raise_for_status()
            rows = records_from_dashboard_payload(
                data_resp.json(), crop=crop, district_name=district_name, fetched_at=fetched_at
            )
            if rows:
                return rows
        except Exception:
            continue
    return []


async def _price_for_market(
    client: httpx.AsyncClient,
    *,
    crop: str,
    district_name: str,
    market_name: str,
    state_id: int,
    district_id: int,
    market_id: int,
    cmdt_id: int,
    fetched_at: str,
    dates: list[date],
) -> list[PriceRecord]:
    for day in dates:
        body = {
            "dashboard": "marketwise_price_arrival",
            "date": day.isoformat(),
            "group": [ALL_GROUP],
            "commodity": [cmdt_id],
            "variety": ALL_VARIETY,
            "state": state_id,
            "district": [district_id],
            "market": [market_id],
            "grades": [ALL_GRADE],
            "limit": 20,
            "format": "json",
        }
        try:
            data_resp = await client.post(DATA_URL, json=body)
            data_resp.raise_for_status()
            rows = records_from_dashboard_payload(
                data_resp.json(),
                crop=crop,
                district_name=district_name,
                fetched_at=fetched_at,
                mandi_name=market_name,
                variety="Named APMC from Agmarknet market list",
                market_id=market_id,
            )
            if rows:
                return rows
        except Exception:
            continue
    return []


async def fetch_agmarknet_district_prices(
    crop: str,
    home_district: str,
    state: str = "West Bengal",
    client: Optional[httpx.AsyncClient] = None,
    commodity_id: Optional[int] = None,
    district_id: Optional[int] = None,
    state_id: Optional[int] = None,
    market_id: Optional[int] = None,
    market_name: Optional[str] = None,
) -> list[PriceRecord]:
    """Live Agmarknet prices for APMCs in the selected district, then nearby district averages."""
    owns = client is None
    if owns:
        client = httpx.AsyncClient(timeout=25.0, headers=HEADERS)
    assert client is not None
    fetched_at = datetime.now(timezone.utc).isoformat()
    dates = [date.today() - timedelta(days=i) for i in range(0, 8)]
    market_dates = dates[:4]
    try:
        filters = await get_filters(client, use_cache=owns)
        if commodity_id is None:
            cmdt = _match_commodity(crop, filters.get("cmdt_data") or [])
            if not cmdt:
                return []
            commodity_id = int(cmdt["cmdt_id"])
            crop = cmdt.get("cmdt_name") or crop
        if state_id is None:
            state_row = _match_state(state, filters.get("state_data") or [])
            if not state_row:
                return []
            state_id = int(state_row["state_id"])
        if district_id is None:
            dist_row = _match_district(home_district, state_id, filters.get("district_data") or [])
            if not dist_row:
                return []
            district_id = int(dist_row.get("id") or dist_row.get("district_id"))

        collected: list[PriceRecord] = []
        markets = search_markets(filters, district_id, "", limit=20)
        if market_id:
            named = [m for m in markets if m["id"] == int(market_id)]
            markets = named or [
                {
                    "id": int(market_id),
                    "name": market_name or "Selected market",
                    "district_id": district_id,
                    "state_id": state_id,
                }
            ]

        for mkt in markets[:10]:
            rows = await _price_for_market(
                client,
                crop=crop,
                district_name=home_district,
                market_name=mkt["name"],
                state_id=state_id,
                district_id=district_id,
                market_id=int(mkt["id"]),
                cmdt_id=commodity_id,
                fetched_at=fetched_at,
                dates=market_dates,
            )
            collected.extend(rows)
            if len(collected) >= 8:
                break

        if not collected:
            peers = _districts_in_state(filters, state_id, district_id)
            for row in peers[:12]:
                name = (row.get("district_name") or "").strip()
                did = int(row.get("id") or row.get("district_id"))
                rows = await _price_for_district(
                    client,
                    crop=crop,
                    district_name=name,
                    state_id=state_id,
                    district_id=did,
                    cmdt_id=commodity_id,
                    fetched_at=fetched_at,
                    dates=dates,
                )
                collected.extend(rows)
                if len(collected) >= 8:
                    break

        if owns and collected:
            from services.geocoder import attach_maps

            await attach_maps(collected, state)
        return collected
    finally:
        if owns:
            await client.aclose()
