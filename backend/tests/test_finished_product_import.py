from decimal import Decimal

import pytest

from app.services.csv_import import to_decimal


def test_to_decimal_comma_separator():
    """Test decimal parsing with comma separator (Brazilian format)."""
    assert to_decimal("100,50") == Decimal("100.50")


def test_to_decimal_dot_separator():
    """Test decimal parsing with dot separator."""
    assert to_decimal("50.00") == Decimal("50.00")


def test_to_decimal_none():
    """Test that None input returns None."""
    assert to_decimal(None) is None


def test_to_decimal_empty_string_raises():
    """Test that empty string raises ValueError."""
    with pytest.raises(ValueError):
        to_decimal("")


def test_to_decimal_invalid_raises():
    """Test that non-numeric strings raise ValueError."""
    with pytest.raises(ValueError):
        to_decimal("abc")


def test_to_decimal_whitespace_raises():
    """Test that whitespace-only strings raise ValueError."""
    with pytest.raises(ValueError):
        to_decimal("   ")


def test_to_decimal_mixed_separators():
    """Test decimal with multiple separators."""
    # Only the first comma should be replaced with dot
    assert to_decimal("1.234,56") == Decimal("1.234.56")


def test_to_decimal_negative():
    """Test parsing negative decimal values."""
    assert to_decimal("-100,50") == Decimal("-100.50")
    assert to_decimal("-50.00") == Decimal("-50.00")


def test_to_decimal_large_numbers():
    """Test parsing large decimal values."""
    assert to_decimal("1000000,99") == Decimal("1000000.99")


def test_to_decimal_zero():
    """Test parsing zero values."""
    assert to_decimal("0,00") == Decimal("0.00")
    assert to_decimal("0") == Decimal("0")
