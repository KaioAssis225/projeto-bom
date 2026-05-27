from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema


class UserRoleInput(BaseSchema):
    area: str
    nivel: str


class UserCreatePayload(BaseSchema):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=100)
    senha_inicial: str = Field(min_length=8)
    roles: list[UserRoleInput] = Field(min_length=1)


class UserUpdatePayload(BaseSchema):
    full_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    is_active: bool | None = None


class UserPasswordPayload(BaseSchema):
    nova_senha: str = Field(min_length=8)


class UserRolesPayload(BaseSchema):
    roles: list[UserRoleInput] = Field(min_length=1)


class UserRoleResponse(BaseSchema):
    id: UUID
    area: str
    nivel: str


class UserAdminResponse(BaseSchema):
    id: UUID
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    roles: list[UserRoleResponse]


class UserAdminListResponse(BaseSchema):
    items: list[UserAdminResponse]
    total: int
