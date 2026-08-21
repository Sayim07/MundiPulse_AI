"""
Gemini client — explanation and translation only.

Money figures are passed in as Python-computed facts and copied back
unchanged. The model never calculates margins.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Optional

from models.price_record import LLMRecommendation

_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__), "prompts", "explain_and_localize.txt"
)


def load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as fh:
        return fh.read()


def _fmt_money(value: Optional[float]) -> str:
    if value is None:
        return "N/A"
    if float(value) == int(value):
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def draft_alerts_from_facts(facts: dict) -> dict:
    """Deterministic wording using Python numbers. Used when Gemini is down or for fallbacks."""
    crop = facts.get("crop") or "Crop"
    best = facts.get("best_mandi") or "N/A"
    home = facts.get("home_mandi")
    modal = _fmt_money(facts.get("modal_price_per_quintal"))
    transport = _fmt_money(facts.get("transport_cost_per_quintal"))
    net = _fmt_money(facts.get("net_price_per_quintal"))
    home_net_val = facts.get("home_net_price_per_quintal")
    has_home_price = home_net_val is not None
    extra = facts.get("additional_margin_per_quintal")
    dist = facts.get("distance_km")
    dist_s = "regional distance" if dist is None else f"{dist} km"
    source = facts.get("source_portal") or "Agmarknet"
    fetched = facts.get("fetched_at") or facts.get("date") or "live stream"
    mode = facts.get("data_mode") or "live"

    if has_home_price and extra is not None and extra > 0:
        extra_s = _fmt_money(extra)
        home_net_s = _fmt_money(home_net_val)
        home_label = home or "local market"
        reason = (
            f"{best} offers ₹{modal}/qtl (modal) with ₹{transport}/qtl estimated transport "
            f"({dist_s}), net ₹{net}/qtl. That is ₹{extra_s}/qtl more than {home_label} "
            f"(net ₹{home_net_s}/qtl). Source: {source}. Fetched: {fetched}."
        )
        advantage_en = f"Estimated additional margin: ₹{extra_s}/quintal vs {home_label}."
        advantage_bn = f"আনুমানিক অতিরিক্ত মার্জিন: {home_label} থেকে ₹{extra_s}/কুইন্টাল বেশি।"
    elif has_home_price:
        home_net_s = _fmt_money(home_net_val)
        home_label = home or "local market"
        reason = (
            f"{home_label} remains the best net option at ₹{home_net_s}/qtl after estimated transport. "
            f"Recommended mandi: {best} at net ₹{net}/qtl. Source: {source}. Fetched: {fetched}."
        )
        advantage_en = f"Local/home net ₹{home_net_s}/qtl is competitive after transport."
        advantage_bn = f"পরিবহনের পর স্থানীয়/হোম নেট ₹{home_net_s}/কুইন্টাল প্রতিযোগিতামূলক।"
    else:
        # Local/home district price is missing or not returned by Agmarknet
        reason = (
            f"{best} is the top regional recommendation offering ₹{modal}/qtl with ₹{transport}/qtl "
            f"estimated transport ({dist_s}), yielding a net realization of ₹{net}/qtl based on regional transport comparison. "
            f"Source: {source}. Fetched: {fetched}."
        )
        advantage_en = "Recommended based on regional transport & net realization comparison."
        advantage_bn = "আঞ্চলিক পরিবহন এবং নেট মূল্যের তুলনার ভিত্তিতে প্রস্তাবিত।"

    alert_english = (
        f"KrishiDrishti Alert — {crop}\n\n"
        f"Recommended mandi: {best}\n"
        f"Modal price: ₹{modal}/quintal\n"
        f"Estimated transport: ₹{transport}/quintal ({dist_s})\n"
        f"Net price: ₹{net}/quintal\n"
        f"{advantage_en}\n"
        f"Source: {source}\n"
        f"Fetched: {fetched}\n"
        f"Data mode: {mode}\n\n"
        f"Prices and transport costs are indicative and may change. Verify before sale."
    )
    alert_bengali = (
        f"KrishiDrishti সতর্কতা — {crop}\n\n"
        f"সুপারিশকৃত মণ্ডি: {best}\n"
        f"মডেল মূল্য: ₹{modal}/কুইন্টাল\n"
        f"আনুমানিক পরিবহন: ₹{transport}/কুইন্টাল ({dist_s})\n"
        f"নেট মূল্য: ₹{net}/কুইন্টাল\n"
        f"{advantage_bn}\n"
        f"উৎস: {source}\n"
        f"সংগ্রহ: {fetched}\n"
        f"ডেটা মোড: {mode}\n\n"
        f"মূল্য ও পরিবহন খরচ আনুমানিক এবং পরিবর্তনশীল। বিক্রির আগে যাচাই করুন।"
    )
    return {
        "reasoning_summary": reason,
        "alert_bengali": alert_bengali,
        "alert_english": alert_english,
    }


def recommendation_from_facts(facts: dict, wording: Optional[dict] = None) -> LLMRecommendation:
    """Attach Gemini/template prose onto Python numbers. Numbers always from facts."""
    wording = wording or draft_alerts_from_facts(facts)
    net = facts.get("net_price_per_quintal") or 0
    return LLMRecommendation(
        best_mandi=str(facts.get("best_mandi") or "N/A"),
        net_margin_per_quintal=float(net),
        reasoning_summary=str(wording.get("reasoning_summary") or ""),
        alert_bengali=str(wording.get("alert_bengali") or ""),
        alert_english=str(wording.get("alert_english") or ""),
        requires_approval=True,
        confidence=str(facts.get("confidence") or "medium"),
        home_mandi=facts.get("home_mandi"),
        home_net_price_per_quintal=facts.get("home_net_price_per_quintal"),
        additional_margin_per_quintal=facts.get("additional_margin_per_quintal"),
        source_portal=facts.get("source_portal"),
        fetched_at=facts.get("fetched_at"),
        data_mode=facts.get("data_mode"),
        confidence_score=facts.get("confidence_score"),
    )


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def explain_and_localize(
    facts: dict,
    api_key: Optional[str] = None,
    model: str = "gemini-2.0-flash",
    _generate=None,
) -> LLMRecommendation:
    """
    Call Gemini for wording only. On any failure, use the Python template.
    `_generate` is an injectable callable for tests: (prompt: str) -> str.
    """
    template = draft_alerts_from_facts(facts)
    if api_key is not None:
        key = api_key
    else:
        key = os.getenv("GEMINI_API_KEY", "")
        try:
            from config import settings

            key = key or (settings.GEMINI_API_KEY or "")
        except Exception:
            pass

    prompt = load_prompt().replace("{{FACTS_JSON}}", json.dumps(facts, ensure_ascii=False, indent=2))

    raw_text = None
    if _generate is not None:
        raw_text = _generate(prompt)
        if asyncio.iscoroutine(raw_text):
            raw_text = await raw_text
    elif key:
        raw_text = await _call_gemini(prompt, key, model)

    wording = template
    if raw_text:
        try:
            parsed = _extract_json(raw_text)
            wording = {
                "reasoning_summary": parsed.get("reasoning_summary") or template["reasoning_summary"],
                "alert_bengali": parsed.get("alert_bengali") or template["alert_bengali"],
                "alert_english": parsed.get("alert_english") or template["alert_english"],
            }
        except (json.JSONDecodeError, TypeError, AttributeError):
            wording = template

    rec = recommendation_from_facts(facts, wording)
    rec = _assert_numbers_unchanged(rec, facts)
    return rec


def _assert_numbers_unchanged(rec: LLMRecommendation, facts: dict) -> LLMRecommendation:
    """Force money fields back to Python facts even if the model altered JSON."""
    return rec.model_copy(
        update={
            "best_mandi": str(facts.get("best_mandi") or rec.best_mandi),
            "net_margin_per_quintal": float(facts.get("net_price_per_quintal") or 0),
            "home_net_price_per_quintal": facts.get("home_net_price_per_quintal"),
            "additional_margin_per_quintal": facts.get("additional_margin_per_quintal"),
        }
    )


async def _call_gemini(prompt: str, api_key: str, model: str) -> Optional[str]:
    for attempt in range(3):
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            def _run():
                return client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )

            response = await asyncio.to_thread(_run)
            text = getattr(response, "text", None)
            if text:
                return text
        except Exception:
            await asyncio.sleep(0.4 * (attempt + 1))
    return None
