from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.unit_conversion import UnitConversion
from app.models.unit_of_measure import UnitOfMeasure


class UnitOfMeasureRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> UnitOfMeasure:
        unit = UnitOfMeasure(**data)
        self.db.add(unit)
        self.db.commit()
        self.db.refresh(unit)
        return self._load(unit.id)

    def get_by_id(self, id: UUID) -> UnitOfMeasure | None:
        stmt = self._base_query().where(UnitOfMeasure.id == id)
        return self.db.scalar(stmt)

    def get_by_code(self, code: str) -> UnitOfMeasure | None:
        stmt = self._base_query().where(UnitOfMeasure.code == code)
        return self.db.scalar(stmt)

    def list_all(self, skip: int, limit: int, active_only: bool) -> list[UnitOfMeasure]:
        del active_only
        stmt = self._base_query().offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_all(self, active_only: bool) -> int:
        del active_only
        stmt = select(func.count()).select_from(UnitOfMeasure)
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> UnitOfMeasure:
        unit = self.db.get(UnitOfMeasure, id)
        if unit is None:
            raise ValueError("Unit of measure not found")

        for key, value in data.items():
            setattr(unit, key, value)

        self.db.commit()
        self.db.refresh(unit)
        return self._load(unit.id)

    def deactivate(self, id: UUID) -> UnitOfMeasure:
        return self.update(id=id, data={})

    def _load(self, id: UUID) -> UnitOfMeasure:
        unit = self.get_by_id(id)
        if unit is None:
            raise ValueError("Unit of measure not found")
        return unit

    @staticmethod
    def _base_query() -> Select[tuple[UnitOfMeasure]]:
        return (
            select(UnitOfMeasure)
            .options(
                selectinload(UnitOfMeasure.conversions).selectinload(UnitConversion.to_unit),
            )
            .order_by(UnitOfMeasure.code.asc())
        )
