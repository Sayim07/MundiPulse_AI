"""
Agmarknet selector pack — PLACEHOLDERS ONLY.

MUST be verified on the live DOM with DevTools before treating a live
run as successful. These keys describe the *schema* the runner expects,
not confirmed production selectors. Do not invent "working" CSS from
memory. See docs/SELECTORS.md.
"""

AGMARKNET_SELECTORS = {
    "state_dropdown": {
        "primary": "select#ddlState",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='ddlState']",
            "select#state",
            "#cphBody_ListBox1",
        ],
        "identity": {
            "tag": "select",
            "label_hints": ["state"],
        },
    },
    "district_dropdown": {
        "primary": "select#ddlDistrict",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='ddlDistrict']",
            "select#district",
        ],
        "identity": {
            "tag": "select",
            "label_hints": ["district"],
        },
    },
    "crop_dropdown": {
        "primary": "select#ddlCommodity",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "select[name='ddlCommodity']",
            "select#commodity",
        ],
        "identity": {
            "tag": "select",
            "label_hints": ["commodity", "crop"],
        },
    },
    "search_button": {
        "primary": "input#btnGo",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "input[type='submit']",
            "button[type='submit']",
            "input[value='Go']",
        ],
        "identity": {
            "tag": "input",
            "label_hints": ["go", "search", "submit"],
        },
    },
    "results_table": {
        "primary": "table#cphBody_GridView1",  # PLACEHOLDER — MUST verify on live DOM
        "fallback": [
            "table#GridView1",
            "table.table",
            "table",
        ],
        "identity": {
            "tag": "table",
        },
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

SELECTORS = AGMARKNET_SELECTORS
PORTAL_ID = "agmarknet"
PORTAL_DISPLAY_NAME = "Agmarknet"
