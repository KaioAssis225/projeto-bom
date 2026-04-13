from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.supplier import Supplier


class SupplierRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> Supplier:
        supplier = Supplier(**data)
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def get_by_id(self, id: UUID) -> Supplier | None:
        return self.db.get(Supplier, id)

    def get_by_code(self, code: str) -> Supplier | None:
        stmt = select(Supplier).where(Supplier.code == code)
        return self.db.scalar(stmt)

    def list_all(self, skip: int, limit: int, active_only: bool) -> list[Supplier]:
        stmt = self._base_list_query(active_only).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_all(self, active_only: bool) -> int:
        stmt = select(func.count()).select_from(Supplier)
        if active_only:
            stmt = stmt.where(Supplier.active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> Supplier:
        supplier = self.db.get(Supplier, id)
        if supplier is None:
            raise ValueError("Supplier not found")

        for key, value in data.items():
            setattr(supplier, key, value)

        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def deactivate(self, id: UUID) -> Supplier:
        return self.update(id=id, data={"active": False})

    @staticmethod
    def _base_list_query(active_only: bool) -> Select[tuple[Supplier]]:
        stmt = select(Supplier).order_by(Supplier.code.asc())
        if active_only:
            stmt = stmt.where(Supplier.active.is_(True))
        return stmt
