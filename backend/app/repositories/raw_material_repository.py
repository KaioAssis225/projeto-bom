from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.item import Item, ItemType
from app.models.raw_material import RawMaterial


class RawMaterialRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _base_query():
        return (
            select(Item)
            .join(RawMaterial, RawMaterial.item_id == Item.id)
            .where(Item.type == ItemType.RAW_MATERIAL)
            .options(
                selectinload(Item.unit_of_measure),
                selectinload(Item.raw_material).selectinload(RawMaterial.material_group),
                selectinload(Item.raw_material).selectinload(RawMaterial.supplier),
                selectinload(Item.raw_material).selectinload(RawMaterial.unidade_conversao),
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
        material_group_id: UUID | None = None,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> list[Item]:
        stmt = self._apply_filters(
            self._base_query(), active_only, material_group_id,
            code_contains, description_contains,
        ).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        active_only: bool = True,
        material_group_id: UUID | None = None,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Item)
            .join(RawMaterial, RawMaterial.item_id == Item.id)
            .where(Item.type == ItemType.RAW_MATERIAL)
        )
        stmt = self._apply_filters(
            stmt, active_only, material_group_id, code_contains, description_contains
        )
        return int(self.db.scalar(stmt) or 0)

    def create(self, item_data: dict, rm_data: dict) -> Item:
        item = Item(**item_data, type=ItemType.RAW_MATERIAL)
        self.db.add(item)
        self.db.flush()
        rm = RawMaterial(item_id=item.id, **rm_data)
        self.db.add(rm)
        self.db.commit()
        return self._load(item.id)  # type: ignore[return-value]

    def update(self, item_id: UUID, item_data: dict, rm_data: dict) -> Item:
        item = self.db.get(Item, item_id)
        rm = self.db.get(RawMaterial, item_id)
        for k, v in item_data.items():
            setattr(item, k, v)
        for k, v in rm_data.items():
            setattr(rm, k, v)
        self.db.commit()
        return self._load(item_id)  # type: ignore[return-value]

    def deactivate(self, item_id: UUID) -> Item:
        item = self.db.get(Item, item_id)
        item.active = False  # type: ignore[union-attr]
        self.db.commit()
        return self._load(item_id)  # type: ignore[return-value]

    # ── filters ───────────────────────────────────────────────────────────────

    @staticmethod
    def _apply_filters(stmt, active_only, material_group_id, code_contains, description_contains):
        if active_only:
            stmt = stmt.where(Item.active.is_(True))
        if material_group_id is not None:
            stmt = stmt.where(RawMaterial.material_group_id == material_group_id)
        if code_contains:
            stmt = stmt.where(Item.code.ilike(f"%{code_contains}%"))
        if description_contains:
            stmt = stmt.where(Item.description.ilike(f"%{description_contains}%"))
        return stmt
