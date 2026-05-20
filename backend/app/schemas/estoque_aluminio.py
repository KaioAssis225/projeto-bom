from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema, PaginatedResponse


class EstoqueEntradaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))


class EstoqueSaidaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))
    solicitante: str | None = Field(default=None, max_length=120)


class EstoqueMinimoPayload(BaseSchema):
    estoque_minimo: Decimal | None = Field(default=None, ge=Decimal("0"))


class PercentualAlertaPayload(BaseSchema):
    percentual_alerta: Decimal | None = Field(default=None)

    @field_validator("percentual_alerta")
    @classmethod
    def validar_percentual(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and not (Decimal("0.01") <= v <= Decimal("0.99")):
            raise ValueError("percentual_alerta deve estar entre 0.01 e 0.99")
        return v


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
    percentual_alerta: Decimal | None
    proximo_vencer: bool
    limite_alerta: Decimal | None


class EstoqueMovimentoRecenteResponse(BaseSchema):
    id: UUID
    item_id: UUID
    item_code: str
    item_description: str
    uom: str
    tipo: str
    quantidade: Decimal
    solicitante: str | None
    created_at: datetime


EstoqueItemPaginatedResponse = PaginatedResponse[EstoqueItemResponse]
EstoqueHistoricoPaginatedResponse = PaginatedResponse[EstoqueMovimentoResponse]
