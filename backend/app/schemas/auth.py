from __future__ import annotations

from pydantic import EmailStr

from app.schemas.common import BaseSchema


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseSchema):
    refresh_token: str


class LogoutRequest(BaseSchema):
    refresh_token: str


class UserRoleResponse(BaseSchema):
    area: str
    nivel: str


class MeResponse(BaseSchema):
    id: str
    email: str
    full_name: str | None
    roles: list[UserRoleResponse]
