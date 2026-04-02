from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from app.domain.bom_calculator import BomCalculator, BomNode


def make_node(
    *,
    item_id,
    code: str,
    parent_item_id=None,
    unit_quantity: str = "1",
    group_id=None,
    group_name=None,
    item_type: str = "RAW_MATERIAL",
    uom: str = "UN",
    children=None,
) -> BomNode:
    return BomNode(
        item_id=item_id,
        parent_item_id=parent_item_id,
        code=code,
        description=code,
        type=item_type,
        group_id=group_id,
        group_name=group_name,
        uom=uom,
        unit_quantity=Decimal(unit_quantity),
        children=children or [],
    )


def test_explode_single_level() -> None:
    root_id = uuid4()
    raw_a_id = uuid4()
    raw_b_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=raw_a_id, code="RM-A", parent_item_id=root_id, unit_quantity="2"),
            make_node(item_id=raw_b_id, code="RM-B", parent_item_id=root_id, unit_quantity="3"),
        ],
        price_map={},
    )

    exploded = calculator.explode(root_id=root_id, quantity=Decimal("5"))

    assert exploded == {
        raw_a_id: Decimal("10"),
        raw_b_id: Decimal("15"),
    }


def test_explode_multi_level() -> None:
    root_id = uuid4()
    semi_id = uuid4()
    raw_a_id = uuid4()
    raw_b_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=semi_id, code="SF-1", parent_item_id=root_id, unit_quantity="2", item_type="SEMI_FINISHED"),
            make_node(item_id=raw_a_id, code="RM-A", parent_item_id=semi_id, unit_quantity="3"),
            make_node(item_id=raw_b_id, code="RM-B", parent_item_id=semi_id, unit_quantity="4"),
        ],
        price_map={},
    )

    exploded = calculator.explode(root_id=root_id, quantity=Decimal("1"))

    assert exploded[semi_id] == Decimal("2")
    assert exploded[raw_a_id] == Decimal("6")
    assert exploded[raw_b_id] == Decimal("8")


def test_explode_accumulates_shared_component() -> None:
    root_id = uuid4()
    semi_a_id = uuid4()
    semi_b_id = uuid4()
    shared_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=semi_a_id, code="SF-A", parent_item_id=root_id, unit_quantity="2", item_type="SEMI_FINISHED"),
            make_node(item_id=semi_b_id, code="SF-B", parent_item_id=root_id, unit_quantity="3", item_type="SEMI_FINISHED"),
            make_node(item_id=shared_id, code="RM-S", parent_item_id=semi_a_id, unit_quantity="5"),
            make_node(item_id=shared_id, code="RM-S", parent_item_id=semi_b_id, unit_quantity="7"),
        ],
        price_map={},
    )

    exploded = calculator.explode(root_id=root_id, quantity=Decimal("2"))

    assert exploded[shared_id] == Decimal("62")


def test_calculate_applies_price_correctly() -> None:
    raw_id = uuid4()
    group_id = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=raw_id, code="RM-A", parent_item_id=uuid4(), unit_quantity="2.5", group_id=group_id, group_name="Group A"),
        ],
        price_map={raw_id: Decimal("4.250000")},
    )

    lines = calculator.calculate(
        accumulated={raw_id: Decimal("7.500000")},
        price_map={raw_id: Decimal("4.250000")},
    )

    assert len(lines) == 1
    assert lines[0].price == Decimal("4.250000")
    assert lines[0].accumulated_quantity == Decimal("7.500000")
    assert lines[0].line_cost == Decimal("31.875000000000")


def test_calculate_group_filter_excludes_other_groups() -> None:
    group_a = uuid4()
    group_b = uuid4()
    item_a = uuid4()
    item_b = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=item_a, code="A", parent_item_id=uuid4(), group_id=group_a, group_name="A"),
            make_node(item_id=item_b, code="B", parent_item_id=uuid4(), group_id=group_b, group_name="B"),
        ],
        price_map={item_a: Decimal("1"), item_b: Decimal("1")},
    )

    lines = calculator.calculate(
        accumulated={item_a: Decimal("2"), item_b: Decimal("3")},
        group_filter=group_a,
    )

    assert [line.code for line in lines] == ["A"]


def test_cycle_detection_simple() -> None:
    item_a = uuid4()
    item_b = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=item_a, code="A"),
            make_node(item_id=item_b, code="B", parent_item_id=item_a),
        ],
        price_map={},
    )

    with pytest.raises(ValueError, match="Ciclo detectado"):
        calculator.ensure_no_cycle(parent_item_id=item_b, child_item_id=item_a)


def test_cycle_detection_deep() -> None:
    item_a = uuid4()
    item_b = uuid4()
    item_c = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=item_a, code="A"),
            make_node(item_id=item_b, code="B"),
            make_node(item_id=item_c, code="C", parent_item_id=item_b),
            make_node(item_id=item_a, code="A", parent_item_id=item_c),
        ],
        price_map={},
    )

    with pytest.raises(ValueError, match="A -> B -> C -> A"):
        calculator.ensure_no_cycle(parent_item_id=item_a, child_item_id=item_b)


def test_no_false_positive_cycle() -> None:
    item_a = uuid4()
    item_b = uuid4()
    item_c = uuid4()
    calculator = BomCalculator(
        nodes=[
            make_node(item_id=item_a, code="A"),
            make_node(item_id=item_b, code="B", parent_item_id=item_a),
            make_node(item_id=item_c, code="C", parent_item_id=item_a),
        ],
        price_map={},
    )

    calculator.ensure_no_cycle(parent_item_id=item_b, child_item_id=item_c)
