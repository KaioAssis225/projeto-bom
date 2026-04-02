from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema


class BomItemChildSummary(BaseSchema):
    id: UUID
    code: str
    description: str
    type: str
    active: bool


class BomCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "parent_item_id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                "version_code": "1.0",
                "description": "Estrutura padrão do produto",
                "valid_from": "2026-03-30",
                "valid_to": None,
            }
        },
    )
    parent_item_id: UUID
    version_code: str = Field(default="1.0", min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=255)
    valid_from: date
    valid_to: date | None = None


class BomItemCreate(BaseSchema):
    bom_id: UUID
    parent_item_id: UUID
    child_item_id: UUID
    line_number: int = Field(ge=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    scrap_percent: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=Decimal("99.9999"))
    notes: str | None = None


class BomItemAdd(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "child_item_id": "a3d0b67e-6601-4ad9-9f57-2a3a7309c1bd",
                "line_number": 10,
                "quantity": "2.500000",
                "scrap_percent": "1.5000",
                "notes": "Consumo padrão",
            }
        },
    )
    parent_item_id: UUID | None = None
    child_item_id: UUID
    line_number: int = Field(ge=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    scrap_percent: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=Decimal("99.9999"))
    notes: str | None = None


class BomItemUpdate(BaseSchema):
    quantity: Decimal = Field(gt=Decimal("0"))
    scrap_percent: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=Decimal("99.9999"))
    notes: str | None = None


class BomChildResponse(BaseSchema):
    id: UUID
    bom_id: UUID
    parent_item_id: UUID
    child_item_id: UUID
    line_number: int
    quantity: Decimal
    scrap_percent: Decimal
    loss_factor: Decimal
    notes: str | None
    created_at: datetime
    updated_at: datetime
    child_item: BomItemChildSummary


class BomParentSummary(BaseSchema):
    id: UUID
    code: str
    description: str
    type: str


class BomResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "87a1da8f-1304-4761-9f42-59c40e20c947",
                "parent_item_id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                "version_code": "1.0",
                "description": "Estrutura padrão do produto",
                "is_active": True,
                "valid_from": "2026-03-30",
                "valid_to": None,
                "created_by": "system",
                "created_at": "2026-03-30T09:00:00-03:00",
                "updated_at": "2026-03-30T09:00:00-03:00",
                "parent_item": {
                    "id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                    "code": "FP-1000",
                    "description": "Produto acabado",
                    "type": "FINISHED_PRODUCT",
                },
                "items": [],
            }
        },
    )
    id: UUID
    parent_item_id: UUID
    version_code: str
    description: str
    is_active: bool
    valid_from: date
    valid_to: date | None
    created_by: str
    created_at: datetime
    updated_at: datetime
    parent_item: BomParentSummary
    items: list[BomChildResponse]


class BomTreeNodeResponse(BaseSchema):
    bom_item_id: UUID | None = None
    item_id: UUID
    code: str
    description: str
    type: str
    level: int
    path: str
    quantity: Decimal | None = None
    scrap_percent: Decimal | None = None
    loss_factor: Decimal | None = None
    accumulated_quantity: Decimal = Decimal("1")
    children: list["BomTreeNodeResponse"] = Field(default_factory=list)


class BomTreeResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "bom_id": "87a1da8f-1304-4761-9f42-59c40e20c947",
                "item_id": "4ed8b1a4-5ab8-41ca-9783-d9cb44ab7cc0",
                "code": "FP-1000",
                "description": "Produto acabado",
                "type": "FINISHED_PRODUCT",
                "version_code": "1.0",
                "valid_from": "2026-03-30",
                "valid_to": None,
                "children": [],
            }
        },
    )
    bom_id: UUID | None = None
    item_id: UUID
    code: str
    description: str
    type: str
    version_code: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    children: list[BomTreeNodeResponse] = Field(default_factory=list)


class CycleValidationRequest(BaseSchema):
    bom_id: UUID
    parent_item_id: UUID
    child_item_id: UUID


class CycleValidationResponse(BaseSchema):
    valid: bool
    message: str
    path: str | None = None


class BomExplosionRow(BaseSchema):
    item_id: UUID
    code: str
    description: str
    level: int
    path: str
    accumulated_quantity: Decimal
    parent_item_id: UUID | None = None
    bom_item_id: UUID | None = None


BomTreeNodeResponse.model_rebuild()
