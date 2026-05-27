from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin


class Area(str, enum.Enum):
    CUSTOS = "CUSTOS"
    ESTOQUE = "ESTOQUE"
    CADASTRO = "CADASTRO"
    GERAL = "GERAL"


class Nivel(str, enum.Enum):
    VIEWER = "VIEWER"
    ESTOQUISTA = "ESTOQUISTA"
    ANALISTA = "ANALISTA"
    GESTOR = "GESTOR"
    ADMIN = "ADMIN"


NIVEL_ORDER = [
    Nivel.VIEWER,
    Nivel.ESTOQUISTA,
    Nivel.ANALISTA,
    Nivel.GESTOR,
    Nivel.ADMIN,
]


class User(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default="CURRENT_TIMESTAMP")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles: Mapped[list[UserRole]] = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan", lazy="joined"
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class UserRole(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_roles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    area: Mapped[Area] = mapped_column(Enum(Area, name="area_enum"), nullable=False)
    nivel: Mapped[Nivel] = mapped_column(Enum(Nivel, name="nivel_enum"), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="roles")


class RefreshToken(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default="CURRENT_TIMESTAMP")

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")
