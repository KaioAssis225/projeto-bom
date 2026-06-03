from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.material_group import MaterialGroup
    from app.models.user import User


class RequisicaoStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    APROVADA = "APROVADA"
    REJEITADA = "REJEITADA"
    CONCLUIDA = "CONCLUIDA"


class Requisicao(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "requisicoes"

    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    group_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("material_group.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDENTE")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    itens: Mapped[list[RequisicaoItem]] = relationship(
        "RequisicaoItem", back_populates="requisicao", cascade="all, delete-orphan", lazy="joined"
    )
    user: Mapped["User"] = relationship("User", lazy="joined")
    group: Mapped["MaterialGroup"] = relationship("MaterialGroup", lazy="joined")


class RequisicaoItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "requisicao_itens"

    requisicao_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("requisicoes.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("item.id"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    unidade_key: Mapped[str] = mapped_column(String(10), nullable=False)  # "UOM1" or "UOM2"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    requisicao: Mapped[Requisicao] = relationship("Requisicao", back_populates="itens")
    item: Mapped["Item"] = relationship("Item", lazy="joined")
