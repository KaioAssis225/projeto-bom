from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.models.item import ItemType
from app.schemas.common import BaseSchema, PaginatedResponse


class ItemCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "code": "RM-ACO-1020",
                "description": "Chapa de aço 1020",
                "type": "RAW_MATERIAL",
                "unit_of_measure_id": "ae24c37c-d5d2-4f33-91b7-03f6d7b3f6c3",
                "material_group_id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2",
                "notes": "Espessura 2mm",
            }
        },
    )
    code: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    type: ItemType
    unit_of_measure_id: UUID
    material_group_id: UUID | None = None
    notes: str | None = None


class ItemUpdate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "description": "Chapa de aço 1020 revisada",
                "active": True,
                "notes": "Atualização cadastral",
                "material_group_id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2",
            }
        },
    )
    description: str = Field(min_length=1, max_length=255)
    active: bool
    notes: str | None = None
    material_group_id: UUID | None = None


class ItemListFilter(BaseSchema):
    type: ItemType | None = None
    material_group_id: UUID | None = None
    code_contains: str | None = None
    description_contains: str | None = None
    active_only: bool = True


class ItemUnitOfMeasureSummary(BaseSchema):
    id: UUID
    code: str


class ItemMaterialGroupSummary(BaseSchema):
    id: UUID
    name: str


class ItemResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "a3d0b67e-6601-4ad9-9f57-2a3a7309c1bd",
                "code": "RM-ACO-1020",
                "description": "Chapa de aço 1020",
                "type": "RAW_MATERIAL",
                "unit_of_measure_id": "ae24c37c-d5d2-4f33-91b7-03f6d7b3f6c3",
                "material_group_id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2",
                "active": True,
                "notes": "Espessura 2mm",
                "created_at": "2026-03-30T09:00:00-03:00",
                "updated_at": "2026-03-30T09:00:00-03:00",
                "unit_of_measure": {"id": "ae24c37c-d5d2-4f33-91b7-03f6d7b3f6c3", "code": "KG"},
                "material_group": {"id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2", "name": "Metais"},
            }
        },
    )
    id: UUID
    code: str
    description: str
    type: ItemType
    unit_of_measure_id: UUID
    material_group_id: UUID | None
    active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
    unit_of_measure: ItemUnitOfMeasureSummary
    material_group: ItemMaterialGroupSummary | None


ItemPaginatedResponse = PaginatedResponse[ItemResponse]
