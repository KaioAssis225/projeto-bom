from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class RequisicaoItemCreate(BaseSchema):
    item_id: UUID
    quantidade: Decimal = Field(gt=Decimal("0"))
    unidade_key: Literal["UOM1", "UOM2"] = "UOM1"
    notes: str | None = None


class RequisicaoCreate(BaseSchema):
    group_id: UUID
    itens: list[RequisicaoItemCreate] = Field(min_length=1)
    notes: str | None = None


class RequisicaoStatusUpdate(BaseSchema):
    status: Literal["APROVADA", "REJEITADA", "CONCLUIDA"]
    notes: str | None = None


class RequisicaoItemResponse(BaseSchema):
    id: UUID
    item_id: UUID
    item_code: str
    item_description: str
    quantidade: Decimal
    unidade_key: str
    uom1_code: str
    uom2_code: str | None
    notes: str | None


class RequisicaoResponse(BaseSchema):
    id: UUID
    user_id: UUID
    user_name: str
    group_id: UUID
    group_name: str
    status: str
    notes: str | None
    created_at: datetime
    itens: list[RequisicaoItemResponse]


class RequisicaoListResponse(BaseSchema):
    items: list[RequisicaoResponse]
    total: int
