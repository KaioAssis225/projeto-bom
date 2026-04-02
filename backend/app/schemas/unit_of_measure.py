from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class UnitOfMeasureCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "code": "KG",
                "description": "Quilograma",
                "decimal_places": 3,
            }
        },
    )
    code: str = Field(min_length=1, max_length=20)
    description: str = Field(min_length=1, max_length=100)
    decimal_places: int = Field(default=2, ge=0, le=6)


class UnitOfMeasureUpdate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "description": "Quilograma padrão",
                "decimal_places": 3,
            }
        },
    )
    description: str = Field(min_length=1, max_length=100)
    decimal_places: int = Field(ge=0, le=6)


class UnitOfMeasureResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "ae24c37c-d5d2-4f33-91b7-03f6d7b3f6c3",
                "code": "KG",
                "description": "Quilograma",
                "decimal_places": 3,
                "created_at": "2026-03-30T09:00:00-03:00",
                "updated_at": "2026-03-30T09:00:00-03:00",
            }
        },
    )
    id: UUID
    code: str
    description: str
    decimal_places: int
    created_at: datetime
    updated_at: datetime


UnitOfMeasurePaginatedResponse = PaginatedResponse[UnitOfMeasureResponse]
