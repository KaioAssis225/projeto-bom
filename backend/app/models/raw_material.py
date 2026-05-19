from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Numeric, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.material_group import MaterialGroup
    from app.models.setor import Setor
    from app.models.supplier import Supplier
    from app.models.unit_of_measure import UnitOfMeasure


raw_material_supplier = Table(
    "raw_material_supplier",
    Base.metadata,
    Column(
        "raw_material_id",
        PG_UUID(as_uuid=True),
        ForeignKey("raw_material.item_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "supplier_id",
        PG_UUID(as_uuid=True),
        ForeignKey("supplier.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class RawMaterial(Base):
    __tablename__ = "raw_material"

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), primary_key=True
    )
    material_group_id: Mapped[UUID] = mapped_column(
        ForeignKey("material_group.id"), nullable=False
    )
    setor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("setor.id"), nullable=True
    )
    unidade_conversao_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("unit_of_measure.id"), nullable=True
    )
    peso_liquido: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)

    item: Mapped["Item"] = relationship(back_populates="raw_material")
    material_group: Mapped["MaterialGroup"] = relationship()
    suppliers: Mapped[list["Supplier"]] = relationship(secondary=raw_material_supplier)
    setor: Mapped["Setor | None"] = relationship()
    unidade_conversao: Mapped["UnitOfMeasure | None"] = relationship()
