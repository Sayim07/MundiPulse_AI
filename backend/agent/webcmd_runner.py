"""
Price-fetch runner.

Name kept as webcmd_runner for PRD compatibility. Implementation is
in-process Playwright (single browser engine). Cached paths are hints,
not trusted commands. Placeholder selectors must be verified on live DOM.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from importlib import import_module
from typing import Any, Callable, Optional

from models.price_record import PriceRecord

LogCallback = Callable[[dict], Any]

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_PORTAL_CONFIG = os.path.join(REPO_ROOT, "config", "portal_config.json")
DEMO_PRICES_PATH = os.path.join(REPO_ROOT, "data", "demo_prices.json")
DEFAULT_CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")

SOURCE_RANK = {"e-NAM": 2, "Agmarknet": 1}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_portal_config(path: Optional[str] = None) -> dict:
    cfg_path = path or os.environ.get("MANDIPULSE_PORTAL_CONFIG") or DEFAULT_PORTAL_CONFIG
    with open(cfg_path, encoding="utf-8") as fh:
        return json.load(fh)


async def _emit(log_callback: Optional[LogCallback], event: dict) -> None:
    if log_callback is None:
        return
    result = log_callback(event)
    if asyncio.iscoroutine(result):
        await result


def parse_price(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if value <= 0:
            return None
        return float(value)
    text = str(value)
    text = text.replace("₹", "").replace(",", "").replace("/-", "").strip()
    text = re.sub(r"[^\d.]", "", text)
    if not text:
        return None
    try:
        amount = float(text)
    except ValueError:
        return None
    if amount <= 0:
        return None
    return amount


def crop_matches(record_crop: str, query_crop: str) -> bool:
    a = (record_crop or "").lower().strip()
    b = (query_crop or "").lower().strip()
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    aliases = {
        "paddy": ["rice", "dhan"],
        "rice": ["paddy", "dhan"],
        "mustard": ["sarson", "rai"],
        "potato": ["aloo"],
    }
    for token in aliases.get(b, []):
        if token in a:
            return True
    return False


def row_complete_score(rec: PriceRecord) -> int:
    score = 0
    for field in (
        rec.mandi_name,
        rec.district,
        rec.crop,
        rec.modal_price_per_quintal,
        rec.min_price,
        rec.max_price,
        rec.date,
        rec.source_portal,
    ):
        if field not in (None, "", 0):
            score += 1
    score += SOURCE_RANK.get(rec.source_portal, 0)
    return score


def validate_record(rec: PriceRecord, query_crop: str) -> Optional[str]:
    if rec.modal_price_per_quintal <= 0 or rec.min_price <= 0 or rec.max_price <= 0:
        return "non_positive_price"
    if not (rec.min_price <= rec.modal_price_per_quintal <= rec.max_price):
        return "min_modal_max_invalid"
    if not crop_matches(rec.crop, query_crop):
        return "crop_mismatch"
    if not rec.mandi_name.strip():
        return "missing_mandi"
    return None


def dedupe_records(records: list[PriceRecord]) -> list[PriceRecord]:
    best: dict[tuple[str, str, str], PriceRecord] = {}
    for rec in records:
        key = (
            rec.mandi_name.strip().lower(),
            rec.crop.strip().lower(),
            rec.date,
        )
        existing = best.get(key)
        if existing is None or row_complete_score(rec) > row_complete_score(existing):
            best[key] = rec
    return list(best.values())


def records_from_table_rows(
    rows: list[list[str]],
    columns: dict,
    crop: str,
    source_portal: str,
    date_fallback: str,
    fetched_at: str,
    data_mode: str,
) -> list[PriceRecord]:
    """Turn a matrix of cell strings into PriceRecords. No LLM involved."""
    out: list[PriceRecord] = []
    for raw in rows:
        if not raw or all(not str(c).strip() for c in raw):
            continue
        headerish = " ".join(str(c).lower() for c in raw)
        if "modal" in headerish and "min" in headerish:
            continue

        def cell(key: str) -> str:
            idx = columns.get(key)
            if idx is None or idx >= len(raw):
                return ""
            return str(raw[idx]).strip()

        modal = parse_price(cell("modal_price"))
        min_p = parse_price(cell("min_price"))
        max_p = parse_price(cell("max_price"))
        if modal is None:
            continue
        if min_p is None:
            min_p = modal
        if max_p is None:
            max_p = modal
        rec_crop = cell("crop") or crop
        rec = PriceRecord(
            mandi_name=cell("mandi_name") or "Unknown",
            district=cell("district") or "",
            crop=rec_crop,
            variety=cell("variety") or "Common",
            modal_price_per_quintal=modal,
            min_price=min_p,
            max_price=max_p,
            date=cell("date") or date_fallback,
            source_portal=source_portal,
            fetched_at=fetched_at,
            data_mode=data_mode,
        )
        if validate_record(rec, crop) is None:
            out.append(rec)
    return out


def _cache_path(cache_dir: str, portal_id: str, crop: str, district: str, state: str) -> str:
    digest = hashlib.sha256(f"{portal_id}|{state}|{district}|{crop}".encode()).hexdigest()[:12]
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, f"{portal_id}_{digest}.json")


def load_path_cache(cache_dir: str, portal_id: str, crop: str, district: str, state: str) -> dict:
    path = _cache_path(cache_dir, portal_id, crop, district, state)
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            return {}
        return data
    except (OSError, json.JSONDecodeError):
        return {}


def save_path_cache(cache_dir: str, portal_id: str, crop: str, district: str, state: str, hints: dict) -> None:
    path = _cache_path(cache_dir, portal_id, crop, district, state)
    payload = {
        "portal": portal_id,
        "workflow": "price_search",
        "saved_at": _now_iso(),
        "hints": hints,
        "note": "Optimization hints only. Must re-verify element identity before use.",
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)


async def verify_selector(page, selector: str, identity: dict) -> bool:
    """Cached/configured selector is usable only if the target exists and matches identity."""
    if not selector:
        return False
    try:
        el = await page.query_selector(selector)
    except Exception:
        return False
    if el is None:
        return False
    expected_tag = (identity or {}).get("tag")
    if expected_tag:
        try:
            tag = await el.evaluate("el => el.tagName")
            if str(tag).lower() != str(expected_tag).lower():
                return False
        except Exception:
            return False
    return True


async def resolve_selector(page, spec: dict, cached: Optional[str] = None) -> Optional[str]:
    identity = spec.get("identity") or {}
    if cached and await verify_selector(page, cached, identity):
        return cached
    for candidate in [spec.get("primary"), *(spec.get("fallback") or [])]:
        if candidate and await verify_selector(page, candidate, identity):
            return candidate
    return None


async def table_matrix(page, table_selector: str) -> list[list[str]]:
    table = await page.query_selector(table_selector)
    if table is None:
        return []
    try:
        return await table.evaluate(
            """el => Array.from(el.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('th,td')).map(td => (td.innerText || '').trim())
            )"""
        )
    except Exception:
        return []


def load_demo_records(crop: str, district: str, fetched_at: str) -> list[PriceRecord]:
    if os.path.isfile(DEMO_PRICES_PATH):
        with open(DEMO_PRICES_PATH, encoding="utf-8") as fh:
            snapshot = json.load(fh)
        date = (snapshot.get("fetched_at") or "2026-08-20")[:10]
        snap_fetched = snapshot.get("fetched_at") or fetched_at
        matched = None
        fallback = None
        for block in snapshot.get("records", []):
            if block.get("crop", "").lower() == crop.lower():
                fallback = fallback or block
                if block.get("home_district", "").lower() == district.lower():
                    matched = block
                    break
        block = matched or fallback
        if block:
            rows = []
            for entry in block.get("rows", []):
                rows.append(
                    PriceRecord(
                        mandi_name=entry["mandi_name"],
                        district=entry["district"],
                        crop=crop,
                        variety="Common",
                        modal_price_per_quintal=float(entry["modal"]),
                        min_price=float(entry["min"]),
                        max_price=float(entry["max"]),
                        date=date,
                        source_portal=entry.get("source", "e-NAM"),
                        fetched_at=snap_fetched,
                        data_mode="demo",
                    )
                )
            return rows

    from services.mock_agent import run_mock_agent

    # mock_agent is sync-async; caller awaits
    raise RuntimeError("use_mock_agent")


async def fetch_demo(crop: str, district: str, state: str, log_callback: Optional[LogCallback]) -> list[PriceRecord]:
    fetched_at = _now_iso()
    await _emit(log_callback, {"type": "system", "msg": "[DEMO] Using labelled DEMO snapshot — not live portal data."})
    await _emit(log_callback, {"type": "agent", "msg": f"[DEMO] Simulated portal walk for {crop} / {district}, {state}"})
    await asyncio.sleep(0.05)
    try:
        records = load_demo_records(crop, district, fetched_at)
    except RuntimeError:
        from services.mock_agent import run_mock_agent

        await _emit(log_callback, {"type": "agent", "msg": "[DEMO] Snapshot miss — falling back to mock_agent seed data."})
        records = await run_mock_agent(crop, district, state)
        records = [
            r.model_copy(update={"data_mode": "demo", "fetched_at": fetched_at})
            for r in records
        ]
    await _emit(
        log_callback,
        {"type": "success", "msg": f"[DEMO] ✓ {len(records)} labelled demo rows ready (not live)."},
    )
    return records


async def fetch_one_portal(
    page,
    portal_id: str,
    portal_cfg: dict,
    selectors: dict,
    crop: str,
    district: str,
    state: str,
    cache_dir: str,
    timeout_ms: int,
    log_callback: Optional[LogCallback],
) -> list[PriceRecord]:
    from agent.browser_guard import page_blocked

    display = portal_cfg.get("display_name") or portal_id
    base_url = portal_cfg.get("base_url")
    await _emit(log_callback, {"type": "agent", "msg": f"[live] Opening {display}: {base_url}"})
    await page.goto(base_url, wait_until="domcontentloaded", timeout=timeout_ms)
    try:
        await page.wait_for_timeout(2500)
    except Exception:
        pass

    blocked = await page_blocked(page)
    if blocked:
        await _emit(
            log_callback,
            {"type": "error", "msg": f"[live] {display} blocked ({blocked}). No CAPTCHA bypass — skipping."},
        )
        return []

    if portal_id == "agmarknet":
        await _emit(
            log_callback,
            {
                "type": "system",
                "msg": "[live] Agmarknet 2.0 uses custom comboboxes, not <select>. Reading official dashboard-data JSON (district averages).",
            },
        )
        try:
            from agent.agmarknet_live import fetch_agmarknet_district_prices

            api_rows = await fetch_agmarknet_district_prices(crop, district, state)
        except Exception as exc:
            await _emit(log_callback, {"type": "error", "msg": f"[live] Agmarknet JSON failed: {_exc_text(exc)}"})
            api_rows = []
        if api_rows:
            await _emit(
                log_callback,
                {
                    "type": "success",
                    "msg": f"[live] Agmarknet: {len(api_rows)} district-average row(s) (not a single mandi yard).",
                },
            )
            return api_rows
        await _emit(log_callback, {"type": "system", "msg": "[live] Agmarknet JSON returned no rows for this crop/district window."})

    cache = load_path_cache(cache_dir, portal_id, crop, district, state)
    hints = cache.get("hints") or {}

    resolved: dict[str, str] = {}
    for key in ("state_dropdown", "district_dropdown", "crop_dropdown", "search_button", "results_table"):
        spec = selectors.get(key) or {}
        found = await resolve_selector(page, spec, cached=hints.get(key))
        if found:
            resolved[key] = found
            await _emit(log_callback, {"type": "agent", "msg": f"[live] {display}: verified {key}"})
        else:
            await _emit(
                log_callback,
                {
                    "type": "system",
                    "msg": f"[live] {display}: {key} not found (placeholder selectors unverified on this DOM).",
                },
            )

    if "results_table" not in resolved:
        try:
            note = await page.evaluate(
                """() => {
                  const el = document.querySelector('#state, #ddlState, select#state, select[name=ddlState]');
                  if (!el) return 'This page has no native state <select> (SPA/dashboard or custom widgets).';
                  const role = el.getAttribute('role') || '';
                  return 'Found ' + el.tagName + (el.id ? '#' + el.id : '') + (role ? ' role=' + role : '') +
                    ' — not a native <select> the placeholder pack can drive.';
                }"""
            )
        except Exception:
            note = "Could not inspect live controls."
        await _emit(log_callback, {"type": "system", "msg": f"[live] {display}: {note} Skipping this portal."})
        return []

    table_sel = resolved["results_table"]

    # Interact only when dropdowns resolved; otherwise still try a visible table.
    try:
        if "state_dropdown" in resolved:
            await page.select_option(resolved["state_dropdown"], label=state, timeout=4000)
        if "district_dropdown" in resolved:
            await page.select_option(resolved["district_dropdown"], label=district, timeout=4000)
        if "crop_dropdown" in resolved:
            await page.select_option(resolved["crop_dropdown"], label=crop, timeout=4000)
        if "search_button" in resolved:
            await page.click(resolved["search_button"], timeout=4000)
            await page.wait_for_timeout(800)
    except Exception as exc:
        await _emit(
            log_callback,
            {"type": "error", "msg": f"[live] {display}: navigation controls failed ({exc}). Trying visible table anyway."},
        )

    matrix = await table_matrix(page, table_sel)
    columns = (selectors.get("results_table") or {}).get("columns") or {}
    fetched_at = _now_iso()
    date_fallback = fetched_at[:10]
    records = records_from_table_rows(
        matrix,
        columns,
        crop=crop,
        source_portal=display,
        date_fallback=date_fallback,
        fetched_at=fetched_at,
        data_mode="live",
    )
    if records:
        save_path_cache(cache_dir, portal_id, crop, district, state, resolved)
        await _emit(log_callback, {"type": "success", "msg": f"[live] {display}: extracted {len(records)} valid rows"})
    else:
        await _emit(log_callback, {"type": "error", "msg": f"[live] {display}: no valid rows after validation"})
    return records


def _import_selectors(module_path: str) -> dict:
    mod = import_module(module_path)
    return getattr(mod, "SELECTORS")


def _exc_text(exc: BaseException) -> str:
    """NotImplementedError and some Playwright errors stringify to ''."""
    msg = str(exc).strip() or repr(exc)
    return f"{type(exc).__name__}: {msg}"


async def _launch_browser(pw, headless: bool, log_callback: Optional[LogCallback]):
    attempts = [
        ("Playwright Chromium", {"headless": headless}),
        ("installed Chrome", {"headless": headless, "channel": "chrome"}),
        ("installed Edge", {"headless": headless, "channel": "msedge"}),
    ]
    last: Optional[BaseException] = None
    for name, kwargs in attempts:
        try:
            await _emit(log_callback, {"type": "agent", "msg": f"[live] Launching {name}..."})
            browser = await pw.chromium.launch(**kwargs)
            await _emit(log_callback, {"type": "success", "msg": f"[live] Browser started ({name})."})
            return browser
        except Exception as exc:
            last = exc
            await _emit(
                log_callback,
                {
                    "type": "system",
                    "msg": f"[live] {name} failed ({_exc_text(exc)}). Trying next option...",
                },
            )
    raise RuntimeError(
        "Could not start a browser. " + (_exc_text(last) if last else "unknown error")
    )


async def fetch_live(
    crop: str,
    district: str,
    state: str,
    log_callback: Optional[LogCallback],
    config: Optional[dict] = None,
    page_factory=None,
) -> list[PriceRecord]:
    cfg = config or load_portal_config()
    timeout_ms = int(cfg.get("timeout_ms", 25000))
    rate_limit_ms = int(cfg.get("rate_limit_ms", 1500))
    cache_dir = cfg.get("cache_dir") or DEFAULT_CACHE_DIR
    if not os.path.isabs(cache_dir):
        cache_dir = os.path.join(REPO_ROOT, cache_dir)
    user_agent = cfg.get(
        "user_agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    )
    headless = bool(cfg.get("headless", True))

    portals = [
        (pid, pcfg)
        for pid, pcfg in (cfg.get("portals") or {}).items()
        if pcfg.get("enabled") and pcfg.get("base_url") and pcfg.get("selectors_module")
    ]
    if not portals:
        await _emit(log_callback, {"type": "error", "msg": "[live] No enabled portals in config."})
        return []

    async def visit_portals(page, cb) -> list[PriceRecord]:
        collected: list[PriceRecord] = []
        for idx, (pid, pcfg) in enumerate(portals):
            try:
                selectors = _import_selectors(pcfg["selectors_module"])
                rows = await fetch_one_portal(
                    page,
                    pid,
                    pcfg,
                    selectors,
                    crop,
                    district,
                    state,
                    cache_dir,
                    timeout_ms,
                    cb,
                )
                collected.extend(rows)
            except Exception as exc:
                await _emit(cb, {"type": "error", "msg": f"[live] {pid} failed: {_exc_text(exc)}"})
            if idx < len(portals) - 1:
                await asyncio.sleep(rate_limit_ms / 1000)
        return collected

    if page_factory is not None:
        page = await page_factory()
        return dedupe_records(await visit_portals(page, log_callback))

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        await _emit(
            log_callback,
            {
                "type": "system",
                "msg": "[live] Playwright is not installed. Run: pip install playwright && playwright install chromium. Using DEMO.",
            },
        )
        return []

    async def playwright_session(cb) -> list[PriceRecord]:
        async with async_playwright() as pw:
            browser = await _launch_browser(pw, headless, cb)
            try:
                context = await browser.new_context(user_agent=user_agent)
                page = await context.new_page()
                page.set_default_timeout(timeout_ms)
                return await visit_portals(page, cb)
            finally:
                await browser.close()

    # Uvicorn on Windows often uses a loop that cannot spawn subprocesses.
    # Playwright then raises NotImplementedError (empty str). Run it on a
    # fresh Proactor loop in a worker thread.
    loop = asyncio.get_running_loop()
    log_q: asyncio.Queue = asyncio.Queue()
    sentinel = object()

    def thread_log(event: dict) -> None:
        loop.call_soon_threadsafe(log_q.put_nowait, event)

    def thread_main() -> list[PriceRecord]:
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        try:
            return asyncio.run(playwright_session(thread_log))
        except Exception as exc:
            thread_log({"type": "system", "msg": f"[live] Browser session failed ({_exc_text(exc)})."})
            return []
        finally:
            loop.call_soon_threadsafe(log_q.put_nowait, sentinel)

    fut = loop.run_in_executor(None, thread_main)
    while True:
        item = await log_q.get()
        if item is sentinel:
            break
        await _emit(log_callback, item)
    collected = await fut
    return dedupe_records(collected)


async def run_price_fetch(
    crop: str,
    district: str,
    state: str = "West Bengal",
    mode: str = "live",
    log_callback: Optional[LogCallback] = None,
    page_factory=None,
    config: Optional[dict] = None,
    commodity_id: Optional[int] = None,
    district_id: Optional[int] = None,
    state_id: Optional[int] = None,
    market_id: Optional[int] = None,
    market_name: Optional[str] = None,
) -> list[PriceRecord]:
    """
    Fetch prices. mode=demo uses snapshot/mock. mode=live uses Agmarknet JSON
    when catalog IDs are present; otherwise opens portals.
    """
    mode = (mode or "live").lower()
    await _emit(
        log_callback,
        {"type": "system", "msg": f"[MandiPulse] Price fetch starting (requested mode={mode}) for {crop} / {district}, {state}"},
    )
    if mode == "demo":
        return await fetch_demo(crop, district, state, log_callback)
    if commodity_id and district_id:
        await _emit(
            log_callback,
            {
                "type": "system",
                "msg": "[live] Using Agmarknet official dashboard JSON for the searched commodity and district (not demo snapshot).",
            },
        )
        from agent.agmarknet_live import fetch_agmarknet_district_prices

        rows = await fetch_agmarknet_district_prices(
            crop,
            district,
            state,
            commodity_id=commodity_id,
            district_id=district_id,
            state_id=state_id,
            market_id=market_id,
            market_name=market_name,
        )
        await _emit(
            log_callback,
            {
                "type": "success" if rows else "system",
                "msg": f"[live] Agmarknet returned {len(rows)} market/district row(s) for comparison.",
            },
        )
        return rows
    records = await fetch_live(
        crop, district, state, log_callback, config=config, page_factory=page_factory
    )
    return records
