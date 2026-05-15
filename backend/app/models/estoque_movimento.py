from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin


class EstoqueMovimento(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "estoque_movimento"

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    solicitante: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
