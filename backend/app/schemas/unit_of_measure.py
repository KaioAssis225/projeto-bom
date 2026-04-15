from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class UnitConversionResponse(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    to_unit_id: UUID
    to_unit_code: str
    to_unit_description: str
    factor: Decimal


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
                "id": "10000000-0000-0000-0000-000000000011",
                "code": "KG",
                "description": "Quilograma",
                "decimal_places": 3,
                "created_at": "2026-03-30T09:00:00-03:00",
                "updated_at": "2026-03-30T09:00:00-03:00",
                "conversions": [
                    {"to_unit_id": "...", "to_unit_code": "G",   "to_unit_description": "Grama",    "factor": "1000"},
                    {"to_unit_id": "...", "to_unit_code": "TON", "to_unit_description": "Tonelada", "factor": "0.001"},
                ],
            }
        },
    )
    id: UUID
    code: str
    description: str
    decimal_places: int
    created_at: datetime
    updated_at: datetime
    conversions: list[UnitConversionResponse] = []


UnitOfMeasurePaginatedResponse = PaginatedResponse[UnitOfMeasureResponse]
