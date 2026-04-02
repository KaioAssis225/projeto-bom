from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.audit_price_change import AuditPriceChange
    from app.models.bom import Bom
    from app.models.bom_item import BomItem
    from app.models.calculation_execution_log import CalculationExecutionLog
    from app.models.item_price_history import ItemPriceHistory
    from app.models.material_group import MaterialGroup
    from app.models.unit_of_measure import UnitOfMeasure


class ItemType(str, Enum):
    RAW_MATERIAL = "RAW_MATERIAL"
    FINISHED_PRODUCT = "FINISHED_PRODUCT"
    SEMI_FINISHED = "SEMI_FINISHED"
    PACKAGING = "PACKAGING"
    SERVICE = "SERVICE"


class Item(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "item"
    __table_args__ = (
        UniqueConstraint("code", name="uq_item_code"),
        CheckConstraint(
            "type <> 'RAW_MATERIAL' OR material_group_id IS NOT NULL",
            name="ck_item_raw_material_requires_group",
        ),
    )

    code: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ItemType] = mapped_column(
        SAEnum(ItemType, name="item_type_enum"),
        nullable=False,
    )
    unit_of_measure_id: Mapped[UUID] = mapped_column(
        ForeignKey("unit_of_measure.id"),
        nullable=False,
    )
    material_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("material_group.id"),
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    unit_of_measure: Mapped["UnitOfMeasure"] = relationship()
    material_group: Mapped["MaterialGroup | None"] = relationship()
    bom_headers: Mapped[list["Bom"]] = relationship(
        back_populates="parent_item",
        foreign_keys="Bom.parent_item_id",
    )
    bom_children: Mapped[list["BomItem"]] = relationship(
        back_populates="child_item",
        foreign_keys="BomItem.child_item_id",
    )
    bom_parents: Mapped[list["BomItem"]] = relationship(
        back_populates="parent_item",
        foreign_keys="BomItem.parent_item_id",
    )
    price_history: Mapped[list["ItemPriceHistory"]] = relationship(back_populates="item")
    price_audits: Mapped[list["AuditPriceChange"]] = relationship(back_populates="item")
    calculation_logs: Mapped[list["CalculationExecutionLog"]] = relationship(
        back_populates="root_item"
    )
