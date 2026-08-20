"""
MandiPulse AI — Mock Gemini LLM Service
Simulates the Gemini 1.5 Flash analysis: margin calculation + bilingual alert generation.
Replace with real google-genai SDK integration for production.
"""

import asyncio
from models.price_record import PriceRecord, LLMRecommendation


async def generate_mock_recommendation(
    price_records: list[PriceRecord],
    home_district: str,
) -> LLMRecommendation:
    """
    Simulates Gemini 1.5 Flash computing the best mandi and drafting
    a bilingual (Bengali + English) localized alert.
    """
    await asyncio.sleep(0.3)  # Simulate LLM inference latency

    if not price_records:
        return LLMRecommendation(
            best_mandi="N/A",
            net_margin_per_quintal=0,
            reasoning_summary="No price data available for the selected crop and district.",
            alert_bengali="দুঃখিত, নির্বাচিত ফসল ও জেলার জন্য কোনো মূল্য তথ্য পাওয়া যায়নি।",
            alert_english="Sorry, no price data found for the selected crop and district.",
            requires_approval=True,
            confidence="low",
        )

    # Calculate net margin for each mandi (modal price - transport cost)
    margins = []
    for record in price_records:
        transport = record.transport_cost_per_quintal or 0
        net = record.modal_price_per_quintal - transport
        margins.append({
            "mandi": record.mandi_name,
            "district": record.district,
            "modal": record.modal_price_per_quintal,
            "transport": transport,
            "net": net,
            "distance": record.distance_km or 0,
            "source": record.source_portal,
        })

    # Find best mandi by net margin
    best = max(margins, key=lambda x: x["net"])
    local = next((m for m in margins if m["distance"] == 0), margins[0])

    advantage = round(best["net"] - local["net"], 2)
    crop = price_records[0].crop

    # Build reasoning
    if advantage > 0:
        reasoning = (
            f"{best['mandi']} offers ₹{best['modal']}/qtl (modal price) with ₹{best['transport']}/qtl transport cost "
            f"({best['distance']}km away), giving a net margin of ₹{best['net']:.0f}/qtl. "
            f"This is ₹{advantage:.0f}/qtl more than your local mandi ({local['mandi']} at ₹{local['net']:.0f}/qtl net). "
            f"Data sourced from {best['source']} on {price_records[0].date}."
        )
    else:
        reasoning = (
            f"Your local mandi ({local['mandi']}) offers the best net margin at ₹{local['net']:.0f}/qtl. "
            f"No nearby mandi offers a better price after accounting for transport costs. "
            f"Data sourced from {local['source']} on {price_records[0].date}."
        )

    # Bilingual alerts
    alert_english = (
        f"🌾 MandiPulse Alert — {crop}\n\n"
        f"Best Mandi: {best['mandi']} ({best['district']})\n"
        f"Modal Price: ₹{best['modal']}/quintal\n"
        f"Transport Cost: ₹{best['transport']}/quintal ({best['distance']}km)\n"
        f"Net Margin: ₹{best['net']:.0f}/quintal\n\n"
        f"{'✅ Advantage: ₹' + str(advantage) + '/qtl over local mandi' if advantage > 0 else '📍 Your local mandi is the best option today'}\n\n"
        f"⚠️ Disclaimer: Prices are indicative and may fluctuate. Verify before sale."
    )

    alert_bengali = (
        f"🌾 MandiPulse সতর্কতা — {crop}\n\n"
        f"সেরা মণ্ডি: {best['mandi']} ({best['district']})\n"
        f"মডেল মূল্য: ₹{best['modal']}/কুইন্টাল\n"
        f"পরিবহন খরচ: ₹{best['transport']}/কুইন্টাল ({best['distance']}কিমি)\n"
        f"নিট মার্জিন: ₹{best['net']:.0f}/কুইন্টাল\n\n"
        f"{'✅ সুবিধা: স্থানীয় মণ্ডির থেকে ₹' + str(advantage) + '/কুইন্টাল বেশি' if advantage > 0 else '📍 আজ আপনার স্থানীয় মণ্ডিই সেরা বিকল্প'}\n\n"
        f"⚠️ দ্রষ্টব্য: মূল্য আনুমানিক ও পরিবর্তনশীল। বিক্রির আগে যাচাই করুন।"
    )

    return LLMRecommendation(
        best_mandi=best["mandi"],
        net_margin_per_quintal=round(best["net"], 2),
        reasoning_summary=reasoning,
        alert_bengali=alert_bengali,
        alert_english=alert_english,
        requires_approval=True,
        confidence="high" if len(price_records) >= 3 else "medium",
    )
