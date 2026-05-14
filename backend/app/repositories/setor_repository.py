from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.setor import Setor


class SetorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> Setor:
        setor = Setor(**data)
        self.db.add(setor)
        self.db.commit()
        self.db.refresh(setor)
        return setor

    def get_by_id(self, id: UUID) -> Setor | None:
        return self.db.get(Setor, id)

    def get_by_name(self, name: str) -> Setor | None:
        stmt = select(Setor).where(Setor.name == name)
        return self.db.scalar(stmt)

    def list_all(self, skip: int, limit: int, active_only: bool) -> list[Setor]:
        stmt = self._base_list_query(active_only).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_all(self, active_only: bool) -> int:
        stmt = select(func.count()).select_from(Setor)
        if active_only:
            stmt = stmt.where(Setor.active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> Setor:
        setor = self.db.get(Setor, id)
        if setor is None:
            raise ValueError("Setor not found")
        for key, value in data.items():
            setattr(setor, key, value)
        self.db.commit()
        self.db.refresh(setor)
        return setor

    def deactivate(self, id: UUID) -> Setor:
        return self.update(id=id, data={"active": False})

    def delete(self, id: UUID) -> None:
        setor = self.db.get(Setor, id)
        if setor is None:
            raise ValueError("Setor not found")
        self.db.delete(setor)
        self.db.commit()

    @staticmethod
    def _base_list_query(active_only: bool) -> Select[tuple[Setor]]:
        stmt = select(Setor).order_by(Setor.name.asc())
        if active_only:
            stmt = stmt.where(Setor.active.is_(True))
        return stmt
