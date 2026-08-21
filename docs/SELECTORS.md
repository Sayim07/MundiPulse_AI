# Portal selectors (human-verified)

Phase-1 selector files under `backend/agent/selectors/` are **placeholders**.
The runner loads `config/portal_config.json`, tries cached paths only after
identity checks, then placeholder CSS, and **fails safe** if the live DOM
does not match. Do not treat a failed live run as a selector bug to "guess"
in code.

## Agmarknet 2.0 note (verified 2026-08-21)

The live site is a React SPA. Filters are `div#state`, `div#district`, `div#commodity` (`role=button`), not `<select>`. The runner opens the page, then reads the official `https://api.agmarknet.gov.in/v1/dashboard-data/` JSON the SPA uses. Those figures are **district averages**, labelled as such — not a named mandi yard. e-NAM `trade-data` remains a dashboard without a driveable price table in this pass.

## Adding or fixing a portal

1. Open the portal `base_url` from `config/portal_config.json` in **desktop Chrome**.
2. Complete the same flow the officer would: State → District → Commodity/Crop → Search.
3. Open DevTools (F12) → Elements. For each control, right-click → Copy → Copy selector.
4. Map these keys in the portal's selector module:

   | Key | What to select |
   |---|---|
   | `state_dropdown` | State `<select>` or equivalent combobox |
   | `district_dropdown` | District control (often populated after state) |
   | `crop_dropdown` | Commodity / crop control |
   | `search_button` | Search / Go / Submit |
   | `results_table` | Price results `<table>` |

5. In the live table header row, count columns (0-based) and paste into `columns`:
   `mandi_name`, `district`, `crop`, `variety`, `min_price`, `max_price`, `modal_price`, `date`.
6. Fill `identity.tag` and `label_hints` from the real element (tag name + accessible name / nearby label).
7. Put the **primary** selector first; keep 1–2 **fallbacks** only if you saw them on that page.
8. Save. Do **not** commit secrets. Cache files under `backend/agent/cache/` are hints only.

## Verify before calling it live

- Runner log should show the target exists **and** identity matched (tag / label).
- Extracted crop names should roughly match the query.
- Min ≤ modal ≤ max; prices numeric and positive.
- If a CAPTCHA or anti-bot interstitial appears: stop. Use Demo Mode. Never bypass.

## New portal (officer UI unchanged)

1. Add an entry under `portals` in `config/portal_config.json` (`enabled`, `base_url`, `selectors_module`).
2. Create `backend/agent/selectors/<portal>_selectors.py` with the same dict schema.
3. Restart the backend. Officers still only pick crop + district.
