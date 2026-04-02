from __future__ import annotations

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import DecimalPlacesMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UnitOfMeasure(UUIDPrimaryKeyMixin, DecimalPlacesMixin, TimestampMixin, Base):
    __tablename__ = "unit_of_measure"
    __table_args__ = (
        UniqueConstraint("code", name="uq_unit_of_measure_code"),
    )

    code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(100), nullable=False)
