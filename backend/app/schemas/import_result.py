from __future__ import annotations

from app.schemas.common import BaseSchema


class ImportRowError(BaseSchema):
    line: int
    code: str | None = None
    field: str | None = None
    message: str


class ImportResult(BaseSchema):
    imported: int
    errors: list[ImportRowError]
