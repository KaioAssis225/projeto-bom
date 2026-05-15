from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema, PaginatedResponse


class EstoqueEntradaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))


class EstoqueSaidaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))
    solicitante: str | None = Field(default=None, max_length=120)


class EstoqueMinimoPayload(BaseSchema):
    estoque_minimo: Decimal | None = Field(default=None, ge=Decimal("0"))


class EstoqueMovimentoResponse(BaseSchema):
    id: UUID
    item_id: UUID
    tipo: str
    quantidade: Decimal
    solicitante: str | None
    created_at: datetime


class EstoqueItemResponse(BaseSchema):
    item_id: UUID
    code: str
    description: str
    uom: str
    uom2: str | None
    saldo_uom1: Decimal
    saldo_uom2: Decimal | None
    estoque_minimo: Decimal | None
    abaixo_minimo: bool


EstoqueItemPaginatedResponse = PaginatedResponse[EstoqueItemResponse]
EstoqueHistoricoPaginatedResponse = PaginatedResponse[EstoqueMovimentoResponse]
