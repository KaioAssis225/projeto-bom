from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class PriceCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "item_id": "a3d0b67e-6601-4ad9-9f57-2a3a7309c1bd",
                "price_value": "12.450000",
                "valid_from": "2026-03-30T09:00:00-03:00",
                "changed_reason": "Reajuste de fornecedor",
                "created_by": "analista.custos",
            }
        },
    )
    item_id: UUID
    price_value: Decimal = Field(gt=Decimal("0"))
    valid_from: datetime
    changed_reason: str | None = None
    created_by: str = Field(min_length=1, max_length=100)


class PriceResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "3d43d213-6cc8-4a35-9494-e06d0dfab7b2",
                "item_id": "a3d0b67e-6601-4ad9-9f57-2a3a7309c1bd",
                "price_value": "12.450000",
                "valid_from": "2026-03-30T09:00:00",
                "valid_to": None,
                "is_current": True,
                "changed_reason": "Reajuste de fornecedor",
                "created_by": "analista.custos",
                "created_at": "2026-03-30T09:00:00-03:00",
            }
        },
    )
    id: UUID
    item_id: UUID
    price_value: Decimal
    valid_from: datetime
    valid_to: datetime | None
    is_current: bool
    changed_reason: str
    created_by: str
    created_at: datetime


class CurrentPriceResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "item_id": "a3d0b67e-6601-4ad9-9f57-2a3a7309c1bd",
                "price_value": "12.450000",
                "valid_from": "2026-03-30T09:00:00",
                "created_by": "analista.custos",
            }
        },
    )
    item_id: UUID
    price_value: Decimal
    valid_from: datetime
    created_by: str


class AuditPriceChangeResponse(BaseSchema):
    id: UUID
    item_id: UUID
    old_price: Decimal | None
    new_price: Decimal
    old_valid_from: datetime | None
    old_valid_to: datetime | None
    new_valid_from: datetime
    changed_by: str
    changed_reason: str
    changed_at: datetime


PriceHistoryPaginatedResponse = PaginatedResponse[PriceResponse]
