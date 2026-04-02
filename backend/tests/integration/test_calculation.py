from __future__ import annotations

from datetime import date, datetime
from pathlib import Path


async def _prepare_calculation_data(base_data, factories) -> None:
    product_bom = factories.create_bom(
        parent_item_id=base_data["product"].id,
        description="Product calc BOM",
        valid_from=date(2026, 3, 1),
    )
    semi_bom = factories.create_bom(
        parent_item_id=base_data["semi"].id,
        description="Semi calc BOM",
        valid_from=date(2026, 3, 1),
    )
    factories.add_bom_item(
        bom_id=product_bom.id,
        parent_item_id=base_data["product"].id,
        child_item_id=base_data["semi"].id,
        line_number=1,
        quantity="2.000000",
    )
    factories.add_bom_item(
        bom_id=product_bom.id,
        parent_item_id=base_data["product"].id,
        child_item_id=base_data["raw_2"].id,
        line_number=2,
        quantity="1.000000",
    )
    factories.add_bom_item(
        bom_id=semi_bom.id,
        parent_item_id=base_data["semi"].id,
        child_item_id=base_data["raw_1"].id,
        line_number=1,
        quantity="3.000000",
    )
    factories.set_price(
        item_id=base_data["semi"].id,
        price_value="0.500000",
        valid_from=datetime(2026, 3, 1, 0, 0, 0),
    )
    factories.set_price(
        item_id=base_data["raw_1"].id,
        price_value="10.000000",
        valid_from=datetime(2026, 3, 1, 0, 0, 0),
    )
    factories.set_price(
        item_id=base_data["raw_2"].id,
        price_value="2.000000",
        valid_from=datetime(2026, 3, 1, 0, 0, 0),
    )


async def test_calculate_single_product(client, base_data, factories, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    await _prepare_calculation_data(base_data, factories)

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["product"].id),
            "quantity": "2.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "single",
        },
    )

    assert response.status_code == 200
    assert response.json()["totais"]["quantidade_itens"] == 3


async def test_calculate_batch(client, base_data, factories, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    await _prepare_calculation_data(base_data, factories)

    response = await client.post(
        "/api/v1/calculos/lote",
        json={
            "itens": [
                {"produto_id": str(base_data["product"].id), "quantidade": "1.000000"},
                {"produto_id": str(base_data["product"].id), "quantidade": "2.000000"},
            ],
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "batch",
        },
    )

    assert response.status_code == 200
    assert response.json()["totais"]["quantidade_itens"] == 3


async def test_calculate_with_group_filter(client, base_data, factories, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    await _prepare_calculation_data(base_data, factories)

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["product"].id),
            "quantity": "1.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": str(base_data["group_raw"].id),
            "requested_by": "pytest",
            "simulation_reference": "filter",
        },
    )

    assert response.status_code == 200
    assert [line["code"] for line in response.json()["linhas"]] == [base_data["raw_1"].code]


async def test_calculate_generates_excel_file(client, base_data, factories, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    await _prepare_calculation_data(base_data, factories)

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["product"].id),
            "quantity": "1.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "excel",
        },
    )

    assert response.status_code == 200
    file_path = Path(tmp_path / response.json()["arquivo_excel"])
    assert file_path.exists()


async def test_calculate_item_without_price_fails(client, base_data, factories, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    product_bom = factories.create_bom(
        parent_item_id=base_data["product"].id,
        valid_from=date(2026, 3, 1),
        description="No price",
    )
    factories.add_bom_item(
        bom_id=product_bom.id,
        parent_item_id=base_data["product"].id,
        child_item_id=base_data["raw_1"].id,
        line_number=1,
        quantity="1.000000",
    )

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["product"].id),
            "quantity": "1.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "missing-price",
        },
    )

    assert response.status_code == 422
    assert "Item sem preco vigente na data" in response.json()["detail"]


async def test_calculate_inactive_item_fails(client, base_data, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["inactive_product"].id),
            "quantity": "1.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "inactive",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Produto inativo"


async def test_calculate_empty_bom_fails(client, base_data, monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)

    response = await client.post(
        "/api/v1/calculos/produto",
        json={
            "root_item_id": str(base_data["product"].id),
            "quantity": "1.000000",
            "reference_date": "2026-03-20T00:00:00",
            "material_group_id": None,
            "requested_by": "pytest",
            "simulation_reference": "empty-bom",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "BOM vazia"
