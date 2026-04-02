from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.item_price_history import ItemPriceHistory


async def test_set_first_price(client, base_data) -> None:
    response = await client.post(
        f"/api/v1/precos/{base_data['raw_1'].id}",
        json={
            "item_id": str(base_data["raw_1"].id),
            "price_value": "10.500000",
            "valid_from": "2026-03-01T10:00:00",
            "changed_reason": "initial",
            "created_by": "pytest",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["is_current"] is True
    assert body["price_value"] == "10.500000"


async def test_update_price_closes_previous(client, base_data) -> None:
    await client.post(
        f"/api/v1/precos/{base_data['raw_1'].id}",
        json={
            "item_id": str(base_data["raw_1"].id),
            "price_value": "10.000000",
            "valid_from": "2026-03-01T00:00:00",
            "changed_reason": "initial",
            "created_by": "pytest",
        },
    )
    await client.post(
        f"/api/v1/precos/{base_data['raw_1'].id}",
        json={
            "item_id": str(base_data["raw_1"].id),
            "price_value": "12.000000",
            "valid_from": "2026-03-15T00:00:00",
            "changed_reason": "adjustment",
            "created_by": "pytest",
        },
    )

    history = await client.get(f"/api/v1/precos/{base_data['raw_1'].id}/historico")
    first_record = history.json()["items"][1]
    current_record = history.json()["items"][0]

    assert current_record["is_current"] is True
    assert first_record["is_current"] is False
    assert first_record["valid_to"] == "2026-03-15T00:00:00"


async def test_price_history_has_two_records_after_update(client, base_data) -> None:
    for idx, price in enumerate(("1.000000", "2.000000"), start=1):
        await client.post(
            f"/api/v1/precos/{base_data['raw_1'].id}",
            json={
                "item_id": str(base_data["raw_1"].id),
                "price_value": price,
                "valid_from": f"2026-03-0{idx}T00:00:00",
                "changed_reason": "history",
                "created_by": "pytest",
            },
        )

    response = await client.get(f"/api/v1/precos/{base_data['raw_1'].id}/historico")

    assert response.status_code == 200
    assert response.json()["total"] == 2


async def test_get_price_at_date_returns_correct_price(client, base_data) -> None:
    await client.post(
        f"/api/v1/precos/{base_data['raw_1'].id}",
        json={
            "item_id": str(base_data["raw_1"].id),
            "price_value": "10.000000",
            "valid_from": "2026-03-01T00:00:00",
            "changed_reason": "initial",
            "created_by": "pytest",
        },
    )
    await client.post(
        f"/api/v1/precos/{base_data['raw_1'].id}",
        json={
            "item_id": str(base_data["raw_1"].id),
            "price_value": "12.500000",
            "valid_from": "2026-03-10T00:00:00",
            "changed_reason": "adjustment",
            "created_by": "pytest",
        },
    )

    response = await client.get(
        f"/api/v1/precos/{base_data['raw_1'].id}/vigente",
        params={"data": "2026-03-05T12:00:00"},
    )

    assert response.status_code == 200
    assert response.json()["price_value"] == "10.000000"


def test_cannot_have_two_current_prices(db, base_data) -> None:
    db.add(
        ItemPriceHistory(
            item_id=base_data["raw_1"].id,
            price_value=Decimal("1.000000"),
            valid_from=datetime(2026, 3, 1, 0, 0, 0),
            valid_to=None,
            is_current=True,
            changed_reason="initial",
            created_by="pytest",
        )
    )
    db.flush()
    db.add(
        ItemPriceHistory(
            item_id=base_data["raw_1"].id,
            price_value=Decimal("2.000000"),
            valid_from=datetime(2026, 3, 2, 0, 0, 0),
            valid_to=None,
            is_current=True,
            changed_reason="second",
            created_by="pytest",
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()
