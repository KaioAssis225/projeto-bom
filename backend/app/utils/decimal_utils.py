from decimal import Decimal, ROUND_HALF_UP


TWO_PLACES = Decimal("0.01")


def quantize_two_places(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def format_decimal_two_places(value: Decimal) -> str:
    return f"{quantize_two_places(value):.2f}"

