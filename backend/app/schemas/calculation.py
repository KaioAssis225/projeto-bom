from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema


class BomCalculationRequest(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "root_item_id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                "quantity": "10.000000",
                "reference_date": "2026-03-30T09:00:00-03:00",
                "material_group_id": None,
                "requested_by": "analista.custos",
                "simulation_reference": "SIM-20260330-001",
            }
        },
    )
    root_item_id: UUID
    quantity: Decimal = Field(gt=Decimal("0"))
    reference_date: datetime | None = None
    material_group_id: UUID | None = None
    requested_by: str = Field(min_length=1, max_length=100)
    simulation_reference: str | None = Field(default=None, max_length=100)


class BomBatchItem(BaseSchema):
    produto_id: UUID
    quantidade: Decimal = Field(gt=Decimal("0"))


class BomBatchRequest(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "itens": [
                    {
                        "produto_id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                        "quantidade": "10.000000",
                    }
                ],
                "reference_date": "2026-03-30T09:00:00-03:00",
                "material_group_id": None,
                "requested_by": "analista.custos",
                "simulation_reference": "LOTE-20260330-001",
            }
        },
    )
    itens: list[BomBatchItem]
    reference_date: datetime | None = None
    material_group_id: UUID | None = None
    requested_by: str = Field(min_length=1, max_length=100)
    simulation_reference: str | None = Field(default=None, max_length=100)


class CalculationLineResponse(BaseSchema):
    item_id: UUID
    code: str
    description: str
    type: str
    group_id: UUID | None
    group_name: str | None
    uom: str
    unit_quantity: Decimal
    accumulated_quantity: Decimal
    price: Decimal
    line_cost: Decimal


class CalculationTotals(BaseSchema):
    quantidade_itens: int
    custo_geral: Decimal


class CalculationResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "linhas": [],
                "totais": {"quantidade_itens": 0, "custo_geral": "0"},
                "arquivo_excel": "exports/BOM_CALC_20260330_090000.xlsx",
            }
        },
    )
    linhas: list[CalculationLineResponse]
    totais: CalculationTotals
    arquivo_excel: str
