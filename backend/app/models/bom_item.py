from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, Computed, DateTime, ForeignKey, Integer, Numeric, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.bom import Bom
    from app.models.item import Item


class BomItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "bom_item"
    __table_args__ = (
        UniqueConstraint("bom_id", "line_number", name="uq_bom_item_line_number"),
        UniqueConstraint(
            "bom_id",
            "parent_item_id",
            "child_item_id",
            name="uq_bom_item_parent_child",
        ),
        CheckConstraint("quantity > 0", name="ck_bom_item_quantity_positive"),
        CheckConstraint(
            "scrap_percent >= 0 AND scrap_percent <= 99.9999",
            name="ck_bom_item_scrap_percent_range",
        ),
        CheckConstraint(
            "parent_item_id <> child_item_id",
            name="ck_bom_item_parent_child_different",
        ),
    )

    bom_id: Mapped[UUID] = mapped_column(
        ForeignKey("bom.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    child_item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    scrap_percent: Mapped[Decimal] = mapped_column(
        Numeric(9, 4),
        nullable=False,
        server_default=text("0"),
    )
    loss_factor: Mapped[Decimal] = mapped_column(
        Numeric(18, 6),
        Computed("(1 + (scrap_percent / 100::numeric))", persisted=True),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    bom: Mapped["Bom"] = relationship(back_populates="items")
    parent_item: Mapped["Item"] = relationship(
        back_populates="bom_parents",
        foreign_keys=[parent_item_id],
    )
    child_item: Mapped["Item"] = relationship(
        back_populates="bom_children",
        foreign_keys=[child_item_id],
    )
