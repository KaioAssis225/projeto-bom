from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.finished_product import FinishedProduct
from app.models.item import Item, ItemType


class FinishedProductRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _base_query():
        return (
            select(Item)
            .join(FinishedProduct, FinishedProduct.item_id == Item.id)
            .where(Item.type == ItemType.FINISHED_PRODUCT)
            .options(
                selectinload(Item.unit_of_measure),
                selectinload(Item.finished_product),
            )
            .order_by(Item.code.asc())
        )

    def _load(self, item_id: UUID) -> Item | None:
        stmt = self._base_query().where(Item.id == item_id)
        return self.db.scalar(stmt)

    # ── public ────────────────────────────────────────────────────────────────

    def get_by_id(self, item_id: UUID) -> Item | None:
        return self._load(item_id)

    def get_by_code(self, code: str) -> Item | None:
        stmt = self._base_query().where(Item.code == code)
        return self.db.scalar(stmt)

    def list_filtered(
        self,
        skip: int,
        limit: int,
        active_only: bool = True,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> list[Item]:
        stmt = self._apply_filters(
            self._base_query(), active_only, code_contains, description_contains
        ).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        active_only: bool = True,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Item)
            .join(FinishedProduct, FinishedProduct.item_id == Item.id)
            .where(Item.type == ItemType.FINISHED_PRODUCT)
        )
        stmt = self._apply_filters(stmt, active_only, code_contains, description_contains)
        return int(self.db.scalar(stmt) or 0)

    def create(self, item_data: dict, fp_data: dict) -> Item:
        item = Item(**item_data, type=ItemType.FINISHED_PRODUCT)
        self.db.add(item)
        self.db.flush()
        fp = FinishedProduct(item_id=item.id, **fp_data)
        self.db.add(fp)
        self.db.commit()
        return self._load(item.id)  # type: ignore[return-value]

    def update(self, item_id: UUID, item_data: dict, fp_data: dict) -> Item:
        item = self.db.get(Item, item_id)
        fp = self.db.get(FinishedProduct, item_id)
        for k, v in item_data.items():
            setattr(item, k, v)
        for k, v in fp_data.items():
            setattr(fp, k, v)
        self.db.commit()
        return self._load(item_id)  # type: ignore[return-value]

    def deactivate(self, item_id: UUID) -> Item:
        item = self.db.get(Item, item_id)
        item.active = False  # type: ignore[union-attr]
        self.db.commit()
        return self._load(item_id)  # type: ignore[return-value]

    # ── filters ───────────────────────────────────────────────────────────────

    @staticmethod
    def _apply_filters(stmt, active_only, code_contains, description_contains):
        if active_only:
            stmt = stmt.where(Item.active.is_(True))
        if code_contains:
            stmt = stmt.where(Item.code.ilike(f"%{code_contains}%"))
        if description_contains:
            stmt = stmt.where(Item.description.ilike(f"%{description_contains}%"))
        return stmt
