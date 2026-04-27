from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin


class BomCostImpact(UUIDPrimaryKeyMixin, Base):
    """Registra o impacto de uma alteração de preço de MP no custo de um PA.

    Cada linha representa: 'a alteração do preço unitário desta MP fez o
    custo BOM deste PA mudar de old_pa_cost para new_pa_cost'.
    """

    __tablename__ = "bom_cost_impact"
    __table_args__ = (
        Index("ix_bom_cost_impact_pa_created", "finished_product_item_id", "created_at"),
        Index("ix_bom_cost_impact_mp_created", "raw_material_item_id", "created_at"),
    )

    finished_product_item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), nullable=False
    )
    raw_material_item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), nullable=False
    )
    price_history_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("item_price_history.id", ondelete="SET NULL"), nullable=True
    )

    old_unit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    new_unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    old_pa_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    new_pa_cost: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    delta_cost: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    delta_percent: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    reference_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    changed_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
