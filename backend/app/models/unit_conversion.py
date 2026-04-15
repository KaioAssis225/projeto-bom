from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.unit_of_measure import UnitOfMeasure


class UnitConversion(TimestampMixin, Base):
    __tablename__ = "unit_conversion"
    __table_args__ = (
        UniqueConstraint("from_unit_id", "to_unit_id", name="uq_unit_conversion_pair"),
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    from_unit_id: Mapped[UUID] = mapped_column(
        ForeignKey("unit_of_measure.id", ondelete="CASCADE"), nullable=False
    )
    to_unit_id: Mapped[UUID] = mapped_column(
        ForeignKey("unit_of_measure.id", ondelete="CASCADE"), nullable=False
    )
    factor: Mapped[Decimal] = mapped_column(Numeric(18, 10), nullable=False)

    from_unit: Mapped["UnitOfMeasure"] = relationship(
        foreign_keys=[from_unit_id], back_populates="conversions"
    )
    to_unit: Mapped["UnitOfMeasure"] = relationship(foreign_keys=[to_unit_id])
