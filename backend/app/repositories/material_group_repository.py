from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.material_group import MaterialGroup


class MaterialGroupRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> MaterialGroup:
        material_group = MaterialGroup(**data)
        self.db.add(material_group)
        self.db.commit()
        self.db.refresh(material_group)
        return material_group

    def get_by_id(self, id: UUID) -> MaterialGroup | None:
        return self.db.get(MaterialGroup, id)

    def get_by_code(self, code: str) -> MaterialGroup | None:
        stmt = select(MaterialGroup).where(MaterialGroup.code == code)
        return self.db.scalar(stmt)

    def list_all(self, skip: int, limit: int, active_only: bool) -> list[MaterialGroup]:
        stmt = self._base_list_query(active_only).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_all(self, active_only: bool) -> int:
        stmt = select(func.count()).select_from(MaterialGroup)
        if active_only:
            stmt = stmt.where(MaterialGroup.active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> MaterialGroup:
        material_group = self.db.get(MaterialGroup, id)
        if material_group is None:
            raise ValueError("Material group not found")

        for key, value in data.items():
            setattr(material_group, key, value)

        self.db.commit()
        self.db.refresh(material_group)
        return material_group

    def deactivate(self, id: UUID) -> MaterialGroup:
        return self.update(id=id, data={"active": False})

    @staticmethod
    def _base_list_query(active_only: bool) -> Select[tuple[MaterialGroup]]:
        stmt = select(MaterialGroup).order_by(MaterialGroup.code.asc())
        if active_only:
            stmt = stmt.where(MaterialGroup.active.is_(True))
        return stmt
