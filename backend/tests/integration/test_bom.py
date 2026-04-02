from __future__ import annotations

from datetime import date


async def test_create_bom_header(client, base_data) -> None:
    response = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "Main product BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )

    assert response.status_code == 201
    assert response.json()["parent_item"]["code"] == base_data["product"].code


async def test_add_child_to_bom(client, base_data) -> None:
    bom = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "Product BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )

    response = await client.post(
        f"/api/v1/bom/{bom.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["raw_1"].id),
            "line_number": 1,
            "quantity": "2.500000",
            "scrap_percent": "5.0000",
            "notes": "component",
        },
    )

    assert response.status_code == 201
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["child_item"]["code"] == base_data["raw_1"].code


async def test_add_self_reference_fails(client, base_data) -> None:
    bom = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "Product BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )

    response = await client.post(
        f"/api/v1/bom/{bom.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["product"].id),
            "line_number": 1,
            "quantity": "1.000000",
            "scrap_percent": "0",
            "notes": None,
        },
    )

    assert response.status_code == 422


async def test_add_cycle_fails(client, base_data) -> None:
    bom_a = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "A BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )
    await client.post(
        f"/api/v1/bom/{bom_a.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["semi"].id),
            "line_number": 1,
            "quantity": "1.000000",
            "scrap_percent": "0",
            "notes": None,
        },
    )
    bom_b = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["semi"].id),
            "version_code": "1.0",
            "description": "B BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )

    response = await client.post(
        f"/api/v1/bom/{bom_b.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["product"].id),
            "line_number": 1,
            "quantity": "1.000000",
            "scrap_percent": "0",
            "notes": None,
        },
    )

    assert response.status_code == 422
    assert "Ciclo detectado" in response.json()["detail"]


async def test_get_bom_tree(client, base_data) -> None:
    bom = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "Tree BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )
    await client.post(
        f"/api/v1/bom/{bom.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["raw_1"].id),
            "line_number": 1,
            "quantity": "2.000000",
            "scrap_percent": "0",
            "notes": None,
        },
    )

    response = await client.get(f"/api/v1/bom/{base_data['product'].id}")

    assert response.status_code == 200
    assert response.json()["children"][0]["code"] == base_data["raw_1"].code


async def test_delete_bom_item(client, base_data) -> None:
    bom = await client.post(
        "/api/v1/bom/",
        json={
            "parent_item_id": str(base_data["product"].id),
            "version_code": "1.0",
            "description": "Delete BOM",
            "valid_from": str(date.today()),
            "valid_to": None,
        },
    )
    created = await client.post(
        f"/api/v1/bom/{bom.json()['id']}/itens",
        json={
            "child_item_id": str(base_data["raw_1"].id),
            "line_number": 1,
            "quantity": "2.000000",
            "scrap_percent": "0",
            "notes": None,
        },
    )
    bom_item_id = created.json()["items"][0]["id"]

    response = await client.delete(f"/api/v1/bom/itens/{bom_item_id}")
    tree = await client.get(f"/api/v1/bom/{base_data['product'].id}")

    assert response.status_code == 204
    assert tree.json()["children"] == []
