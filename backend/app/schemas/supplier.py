from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class SupplierCreate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "code": "FORN-001",
                "name": "Aços Brasil Ltda",
                "description": "Fornecedor de chapas e perfis de aço",
            }
        },
    )
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class SupplierUpdate(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "name": "Aços Brasil S/A",
                "description": "Fornecedor homologado de aços estruturais",
                "active": True,
            }
        },
    )
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    active: bool


class SupplierResponse(BaseSchema):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "c3a1e2f0-1234-4abc-9def-56789abcdef0",
                "code": "FORN-001",
                "name": "Aços Brasil Ltda",
                "description": "Fornecedor de chapas e perfis de aço",
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


SupplierPaginatedResponse = PaginatedResponse[SupplierResponse]
