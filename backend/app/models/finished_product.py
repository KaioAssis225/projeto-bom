from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.item import Item


class FinishedProduct(Base):
    __tablename__ = "finished_product"

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), primary_key=True
    )
    peso_liquido: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    catalogo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    linha: Mapped[str | None] = mapped_column(String(120), nullable=True)
    designer: Mapped[str | None] = mapped_column(String(120), nullable=True)

    item: Mapped["Item"] = relationship(back_populates="finished_product")
