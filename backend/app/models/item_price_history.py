from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.item import Item


class ItemPriceHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "item_price_history"
    __table_args__ = (
        CheckConstraint("price_value >= 0", name="ck_item_price_history_non_negative"),
        Index(
            "uq_item_price_history_current_item",
            "item_id",
            unique=True,
            postgresql_where=text("is_current = true"),
        ),
    )

    item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    price_value: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    changed_reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    item: Mapped["Item"] = relationship(back_populates="price_history")
