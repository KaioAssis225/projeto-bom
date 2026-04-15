from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import DecimalPlacesMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.unit_conversion import UnitConversion


class UnitOfMeasure(UUIDPrimaryKeyMixin, DecimalPlacesMixin, TimestampMixin, Base):
    __tablename__ = "unit_of_measure"
    __table_args__ = (
        UniqueConstraint("code", name="uq_unit_of_measure_code"),
    )

    code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(100), nullable=False)

    conversions: Mapped[list["UnitConversion"]] = relationship(
        foreign_keys="UnitConversion.from_unit_id",
        back_populates="from_unit",
        lazy="selectin",
        order_by="UnitConversion.to_unit_id",
    )
