from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class FinishedProductCreate(BaseSchema):
    code: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    unit_of_measure_id: UUID
    notes: str | None = None
    peso_liquido: Decimal | None = None
    catalogo: str | None = Field(default=None, max_length=120)
    linha: str | None = Field(default=None, max_length=120)
    designer: str | None = Field(default=None, max_length=120)
    largura_mm: Decimal | None = None
    profundidade_mm: Decimal | None = None
    altura_mm: Decimal | None = None


class FinishedProductUpdate(BaseSchema):
    description: str = Field(min_length=1, max_length=255)
    active: bool
    notes: str | None = None
    peso_liquido: Decimal | None = None
    catalogo: str | None = Field(default=None, max_length=120)
    linha: str | None = Field(default=None, max_length=120)
    designer: str | None = Field(default=None, max_length=120)
    largura_mm: Decimal | None = None
    profundidade_mm: Decimal | None = None
    altura_mm: Decimal | None = None


class _UomSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str


class FinishedProductResponse(BaseSchema):
    id: UUID
    code: str
    description: str
    active: bool
    notes: str | None
    unit_of_measure_id: UUID
    peso_liquido: Decimal | None
    catalogo: str | None
    linha: str | None
    designer: str | None
    largura_mm: Decimal | None
    profundidade_mm: Decimal | None
    altura_mm: Decimal | None
    created_at: datetime
    updated_at: datetime
    unit_of_measure: _UomSummary


FinishedProductPaginatedResponse = PaginatedResponse[FinishedProductResponse]
