from __future__ import annotations

import inspect
from decimal import Decimal
from uuid import uuid4

from app.domain.bom_calculator import BomCalculator, BomNode
from app.utils.decimal_utils import format_decimal_two_places


def test_no_float_in_calculation() -> None:
    item_id = uuid4()
    root_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            BomNode(
                item_id=item_id,
                parent_item_id=root_id,
                code="RM-A",
                description="Raw Material",
                type="RAW_MATERIAL",
                group_id=None,
                group_name=None,
                uom="KG",
                unit_quantity=Decimal("1.500000"),
                children=[],
            )
        ],
        price_map={item_id: Decimal("2.250000")},
    )

    exploded = calculator.explode(root_id=root_id, quantity=Decimal("4"))
    lines = calculator.calculate(accumulated=exploded)

    assert isinstance(lines[0].accumulated_quantity, Decimal)
    assert isinstance(lines[0].price, Decimal)
    assert isinstance(lines[0].line_cost, Decimal)
    assert "float(" not in inspect.getsource(BomCalculator)


def test_two_decimal_display() -> None:
    assert format_decimal_two_places(Decimal("10.125")) == "10.13"


def test_price_precision_preserved() -> None:
    item_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            BomNode(
                item_id=item_id,
                parent_item_id=uuid4(),
                code="RM-PREC",
                description="Precision Item",
                type="RAW_MATERIAL",
                group_id=None,
                group_name=None,
                uom="KG",
                unit_quantity=Decimal("3.000000"),
                children=[],
            )
        ],
        price_map={item_id: Decimal("0.123456")},
    )

    lines = calculator.calculate(
        accumulated={item_id: Decimal("3.000000")},
        price_map={item_id: Decimal("0.123456")},
    )

    assert lines[0].price == Decimal("0.123456")
    assert lines[0].line_cost == Decimal("0.370368000000")
