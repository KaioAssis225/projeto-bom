from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.material_group import MaterialGroup


class CalculationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    PARTIAL = "PARTIAL"


class CalculationExecutionLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "calculation_execution_log"

    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    root_item_id: Mapped[UUID] = mapped_column(ForeignKey("item.id"), nullable=False)
    material_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("material_group.id"),
        nullable=True,
    )
    simulation_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    request_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    generated_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[CalculationStatus] = mapped_column(
        SAEnum(CalculationStatus, name="calculation_status_enum"),
        nullable=False,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    root_item: Mapped["Item"] = relationship(back_populates="calculation_logs")
    material_group: Mapped["MaterialGroup | None"] = relationship()
