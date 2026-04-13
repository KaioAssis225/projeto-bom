from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.item import Item
from app.models.supplier import Supplier  # noqa: F401 — ensures mapper is loaded
from app.schemas.item import ItemListFilter


class ItemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> Item:
        item = Item(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._load_relations(item.id)

    def get_by_id(self, id: UUID) -> Item | None:
        stmt = self._base_query().where(Item.id == id)
        return self.db.scalar(stmt)

    def get_by_code(self, code: str) -> Item | None:
        stmt = self._base_query().where(Item.code == code)
        return self.db.scalar(stmt)

    def list_filtered(self, filters: ItemListFilter, skip: int, limit: int) -> list[Item]:
        stmt = self._apply_filters(self._base_query(), filters).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_filtered(self, filters: ItemListFilter) -> int:
        stmt = select(func.count()).select_from(Item)
        stmt = self._apply_filters(stmt, filters)
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> Item:
        item = self.db.get(Item, id)
        if item is None:
            raise ValueError("Item not found")

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return self._load_relations(item.id)

    def deactivate(self, id: UUID) -> Item:
        return self.update(id=id, data={"active": False})

    def _load_relations(self, id: UUID) -> Item:
        item = self.get_by_id(id)
        if item is None:
            raise ValueError("Item not found")
        return item

    @staticmethod
    def _base_query() -> Select[tuple[Item]]:
        return (
            select(Item)
            .options(
                selectinload(Item.unit_of_measure),
                selectinload(Item.material_group),
                selectinload(Item.supplier),
            )
            .order_by(Item.code.asc())
        )

    @staticmethod
    def _apply_filters(stmt: Select, filters: ItemListFilter) -> Select:
        if filters.type is not None:
            stmt = stmt.where(Item.type == filters.type)
        if filters.material_group_id is not None:
            stmt = stmt.where(Item.material_group_id == filters.material_group_id)
        if filters.code_contains:
            stmt = stmt.where(Item.code.ilike(f"%{filters.code_contains}%"))
        if filters.description_contains:
            stmt = stmt.where(Item.description.ilike(f"%{filters.description_contains}%"))
        if filters.active_only:
            stmt = stmt.where(Item.active.is_(True))
        return stmt
