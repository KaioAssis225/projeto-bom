from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.bom_item import BomItem
    from app.models.item import Item


class Bom(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bom"
    __table_args__ = (
        UniqueConstraint("parent_item_id", "version_code", name="uq_bom_parent_version"),
        CheckConstraint(
            "valid_to IS NULL OR valid_to >= valid_from",
            name="ck_bom_valid_range",
        ),
    )

    parent_item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    version_code: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("'1.0'"),
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)

    parent_item: Mapped["Item"] = relationship(back_populates="bom_headers")
    items: Mapped[list["BomItem"]] = relationship(
        back_populates="bom",
        cascade="all, delete-orphan",
    )
