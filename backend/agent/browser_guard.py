"""
Lightweight page-state checks. Never bypass CAPTCHA or anti-bot interstitials.
"""

from __future__ import annotations

BLOCK_HINTS = (
    "captcha",
    "recaptcha",
    "hcaptcha",
    "unusual traffic",
    "access denied",
    "please verify you are a human",
    "cf-challenge",
    "attention required",
)


async def page_blocked(page) -> str | None:
    """Return a reason string if the page looks like a bot-wall; else None."""
    try:
        url = page.url or ""
    except Exception:
        url = ""
    try:
        title = (await page.title()) or ""
    except Exception:
        title = ""
    blob = f"{url} {title}".lower()
    for hint in BLOCK_HINTS:
        if hint in blob:
            return f"blocked:{hint}"
    try:
        html_sample = await page.content()
        sample = (html_sample or "")[:8000].lower()
    except Exception:
        return None
    for hint in BLOCK_HINTS:
        if hint in sample:
            return f"blocked:{hint}"
    return None
