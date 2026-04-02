from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.item import Item


class AuditPriceChange(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_price_change"

    item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    new_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    old_valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    old_valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    new_valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    changed_reason: Mapped[str] = mapped_column(String(255), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    item: Mapped["Item"] = relationship(back_populates="price_audits")
