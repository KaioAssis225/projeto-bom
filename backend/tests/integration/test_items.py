from __future__ import annotations

from app.models.item import ItemType


async def test_create_raw_material_with_group(client, base_data) -> None:
    response = await client.post(
        "/api/v1/itens/",
        json={
            "code": "RAW-OK",
            "description": "Raw Material OK",
            "type": ItemType.RAW_MATERIAL.value,
            "unit_of_measure_id": str(base_data["uom_kg"].id),
            "material_group_id": str(base_data["group_raw"].id),
            "notes": "created in test",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == ItemType.RAW_MATERIAL.value
    assert body["material_group"]["name"] == base_data["group_raw"].name


async def test_create_raw_material_without_group_fails(client, base_data) -> None:
    response = await client.post(
        "/api/v1/itens/",
        json={
            "code": "RAW-NO-GROUP",
            "description": "Raw Material Without Group",
            "type": ItemType.RAW_MATERIAL.value,
            "unit_of_measure_id": str(base_data["uom_kg"].id),
            "material_group_id": None,
            "notes": None,
        },
    )

    assert response.status_code == 422
    assert "material_group_id is required" in response.json()["detail"]


async def test_create_finished_product_without_group(client, base_data) -> None:
    response = await client.post(
        "/api/v1/itens/",
        json={
            "code": "FP-NO-GROUP",
            "description": "Finished Product",
            "type": ItemType.FINISHED_PRODUCT.value,
            "unit_of_measure_id": str(base_data["uom_unit"].id),
            "material_group_id": None,
            "notes": None,
        },
    )

    assert response.status_code == 201
    assert response.json()["material_group"] is None


async def test_deactivate_item(client, base_data) -> None:
    response = await client.patch(f"/api/v1/itens/{base_data['product'].id}/inativar")

    assert response.status_code == 200
    assert response.json()["active"] is False


async def test_list_with_filters(client, base_data) -> None:
    response = await client.get(
        "/api/v1/itens/",
        params={
            "type": ItemType.RAW_MATERIAL.value,
            "group_id": str(base_data["group_raw"].id),
            "code": "RM-A",
            "desc": "Raw Material A",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["code"] == base_data["raw_1"].code
