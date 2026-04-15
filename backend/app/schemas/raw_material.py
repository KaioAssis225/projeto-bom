from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class RawMaterialCreate(BaseSchema):
    code: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    unit_of_measure_id: UUID
    material_group_id: UUID
    notes: str | None = None
    supplier_id: UUID | None = None
    unidade_conversao_id: UUID | None = None
    peso_liquido: Decimal | None = None


class RawMaterialUpdate(BaseSchema):
    description: str = Field(min_length=1, max_length=255)
    active: bool
    material_group_id: UUID
    notes: str | None = None
    supplier_id: UUID | None = None
    unidade_conversao_id: UUID | None = None
    peso_liquido: Decimal | None = None


class _UomSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str


class _GroupSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str


class _SupplierSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str


class RawMaterialResponse(BaseSchema):
    id: UUID
    code: str
    description: str
    active: bool
    notes: str | None
    unit_of_measure_id: UUID
    material_group_id: UUID
    supplier_id: UUID | None
    unidade_conversao_id: UUID | None
    peso_liquido: Decimal | None
    created_at: datetime
    updated_at: datetime
    unit_of_measure: _UomSummary
    material_group: _GroupSummary
    supplier: _SupplierSummary | None
    unidade_conversao: _UomSummary | None


RawMaterialPaginatedResponse = PaginatedResponse[RawMaterialResponse]
