"""
e-NAM selector pack — PLACEHOLDERS ONLY.

MUST be verified on the live DOM with DevTools before treating a live
run as successful. These keys describe the *schema* the runner expects,
not confirmed production selectors. Do not invent "working" CSS from
memory. See docs/SELECTORS.md.
"""

# Each control: primary CSS selector + fallbacks + identity checks used
# to verify a cached path before clicking.
ENAM_SELECTORS = {
    "state_dropdown": {
        "primary": "select#state",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='state']",
            "select#ddlState",
            "#state",
        ],
        "identity": {
            "tag": "select",
            "role_hint": "combobox",
            "label_hints": ["state"],
        },
    },
    "district_dropdown": {
        "primary": "select#district",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='district']",
            "select#ddlDistrict",
            "#district",
        ],
        "identity": {
            "tag": "select",
            "label_hints": ["district"],
        },
    },
    "crop_dropdown": {
        "primary": "select#commodity",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='commodity']",
            "select#ddlCommodity",
            "#commodity",
        ],
        "identity": {
            "tag": "select",
            "label_hints": ["commodity", "crop"],
        },
    },
    "search_button": {
        "primary": "button#search",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "button[type='submit']",
            "input[type='submit']",
            "button:has-text('Search')",
        ],
        "identity": {
            "tag": "button",
            "label_hints": ["search", "go", "submit"],
        },
    },
    "results_table": {
        "primary": "table#tradeData",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "table.datatable",
            "table#dataTable",
            "table",
        ],
        "identity": {
            "tag": "table",
        },
        # Column indices are placeholders until a human maps the live header row.
        "columns": {
            "mandi_name": 0,
            "district": 1,
            "crop": 2,
            "variety": 3,
            "min_price": 4,
            "max_price": 5,
            "modal_price": 6,
            "date": 7,
        },
    },
}

SELECTORS = ENAM_SELECTORS
PORTAL_ID = "enam"
PORTAL_DISPLAY_NAME = "e-NAM"
