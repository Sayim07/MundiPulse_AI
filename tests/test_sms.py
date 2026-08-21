import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.sms_dispatcher import normalize_in_mobile, parse_recipients


def test_normalize_in_mobile():
    assert normalize_in_mobile("9876543210") == "9876543210"
    assert normalize_in_mobile("+91 98765 43210") == "9876543210"
    with pytest.raises(ValueError):
        normalize_in_mobile("12345")


def test_parse_recipients_dedupes():
    assert parse_recipients(["9876543210", "+919876543210"]) == ["9876543210"]
