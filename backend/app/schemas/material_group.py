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
                "code": "MET",
                "name": "Metais",
                "description": "Grupo de matérias-primas metálicas",
                "controla_estoque": False,
            }
        },
    )
    code: str = Field(min_length=1, max_length=3)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    controla_estoque: bool = False


class MaterialGroupUpdate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "code": "MET",
                "name": "Metais Ferrosos",
                "description": "Grupo revisado para metais ferrosos",
                "active": True,
                "controla_estoque": False,
            }
        },
    )
    code: str | None = Field(default=None, min_length=1, max_length=3)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    active: bool
    controla_estoque: bool = False


class MaterialGroupResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "f19a91c0-7d39-4f3e-9954-34f5d92abfd2",
                "code": "MET",
                "name": "Metais",
                "description": "Grupo de matérias-primas metálicas",
                "active": True,
                "controla_estoque": False,
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
    controla_estoque: bool
    created_at: datetime
    updated_at: datetime


MaterialGroupPaginatedResponse = PaginatedResponse[MaterialGroupResponse]
