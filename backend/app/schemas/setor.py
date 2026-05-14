from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class SetorCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=50)


class SetorUpdate(BaseSchema):
    name: str = Field(min_length=1, max_length=50)
    active: bool


class SetorResponse(BaseSchema):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime


SetorPaginatedResponse = PaginatedResponse[SetorResponse]
