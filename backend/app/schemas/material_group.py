from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class MaterialGroupCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "code": "METAIS",
                "name": "Metais",
                "description": "Grupo de matérias-primas metálicas",
            }
        },
    )
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class MaterialGroupUpdate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "name": "Metais Ferrosos",
                "description": "Grupo revisado para metais ferrosos",
                "active": True,
            }
        },
    )
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    active: bool


class MaterialGroupResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2",
                "code": "METAIS",
                "name": "Metais",
                "description": "Grupo de matérias-primas metálicas",
                "active": True,
                "created_at": "2026-03-30T09:00:00-03:00",
                "updated_at": "2026-03-30T09:00:00-03:00",
            }
        },
    )
    id: UUID
    code: str
    name: str
    description: str | None
    active: bool
    created_at: datetime
    updated_at: datetime


MaterialGroupPaginatedResponse = PaginatedResponse[MaterialGroupResponse]
