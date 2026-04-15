from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.bom import Bom
from app.models.bom_item import BomItem


class BomRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_bom(self, data: dict) -> Bom:
        bom = Bom(**data)
        self.db.add(bom)
        self.db.commit()
        self.db.refresh(bom)
        return self.get_bom_by_id(bom.id) or bom

    def get_bom_by_id(self, id: UUID) -> Bom | None:
        stmt = (
            select(Bom)
            .options(
                joinedload(Bom.parent_item),
                selectinload(Bom.items).joinedload(BomItem.child_item),
            )
            .where(Bom.id == id)
        )
        return self.db.scalar(stmt)

    def get_bom_by_parent_and_version(self, parent_item_id: UUID, version_code: str) -> Bom | None:
        stmt = (
            select(Bom)
            .where(Bom.parent_item_id == parent_item_id, Bom.version_code == version_code)
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_active_bom_for_item(self, item_id: UUID, reference_date: date) -> Bom | None:
        stmt = (
            select(Bom)
            .options(
                joinedload(Bom.parent_item),
                selectinload(Bom.items).joinedload(BomItem.child_item),
            )
            .where(
                Bom.parent_item_id == item_id,
                Bom.is_active.is_(True),
                Bom.valid_from <= reference_date,
                (Bom.valid_to.is_(None) | (Bom.valid_to >= reference_date)),
            )
            .order_by(Bom.valid_from.desc(), Bom.created_at.desc())
            .limit(1)
        )
        return self.db.scalar(stmt)

    def add_item(self, data: dict) -> BomItem:
        bom_item = BomItem(**data)
        self.db.add(bom_item)
        self.db.commit()
        self.db.refresh(bom_item)
        return self.get_bom_item_by_id(bom_item.id) or bom_item

    def get_bom_item_by_id(self, bom_item_id: UUID) -> BomItem | None:
        stmt = (
            select(BomItem)
            .options(joinedload(BomItem.child_item), joinedload(BomItem.parent_item), joinedload(BomItem.bom))
            .where(BomItem.id == bom_item_id)
        )
        return self.db.scalar(stmt)

    def remove_item(self, bom_item_id: UUID) -> None:
        bom_item = self.db.get(BomItem, bom_item_id)
        if bom_item is None:
            return
        self.db.delete(bom_item)
        self.db.commit()

    def get_direct_children(self, item_id: UUID, bom_id: UUID) -> list[BomItem]:
        stmt = (
            select(BomItem)
            .options(joinedload(BomItem.child_item))
            .where(BomItem.parent_item_id == item_id, BomItem.bom_id == bom_id)
            .order_by(BomItem.line_number.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_bom_item_by_parent_child(self, bom_id: UUID, parent_item_id: UUID, child_item_id: UUID) -> BomItem | None:
        stmt = select(BomItem).where(
            BomItem.bom_id == bom_id,
            BomItem.parent_item_id == parent_item_id,
            BomItem.child_item_id == child_item_id,
        )
        return self.db.scalar(stmt)

    def get_all_descendants(self, root_item_id: UUID) -> list[dict]:
        sql = text(
            """
            WITH RECURSIVE descendants AS (
                SELECT
                    bi.id AS bom_item_id,
                    bi.parent_item_id,
                    bi.child_item_id AS descendant_item_id,
                    1 AS level,
                    ARRAY[bi.parent_item_id, bi.child_item_id] AS path_ids,
                    ARRAY[pi.code, ci.code] AS path_codes
                FROM bom_item bi
                JOIN bom b ON b.id = bi.bom_id
                JOIN item pi ON pi.id = bi.parent_item_id
                JOIN item ci ON ci.id = bi.child_item_id
                WHERE bi.parent_item_id = :root_item_id
                  AND b.is_active = TRUE

                UNION ALL

                SELECT
                    bi.id AS bom_item_id,
                    bi.parent_item_id,
                    bi.child_item_id AS descendant_item_id,
                    d.level + 1 AS level,
                    d.path_ids || bi.child_item_id AS path_ids,
                    d.path_codes || ci.code AS path_codes
                FROM descendants d
                JOIN bom_item bi ON bi.parent_item_id = d.descendant_item_id
                JOIN bom b ON b.id = bi.bom_id
                JOIN item ci ON ci.id = bi.child_item_id
                WHERE b.is_active = TRUE
                  AND NOT (bi.child_item_id = ANY(d.path_ids))
            )
            SELECT
                d.bom_item_id,
                d.parent_item_id,
                d.descendant_item_id,
                d.level,
                d.path_ids,
                array_to_string(d.path_codes, ' -> ') AS path,
                i.code AS descendant_code,
                i.description AS descendant_description
            FROM descendants d
            JOIN item i ON i.id = d.descendant_item_id
            ORDER BY d.level, i.code
            """
        )
        rows = self.db.execute(sql, {"root_item_id": root_item_id}).mappings().all()
        return [dict(row) for row in rows]

    def update_item(self, bom_item_id: UUID, data: dict) -> BomItem:
        bom_item = self.db.get(BomItem, bom_item_id)
        if bom_item is None:
            raise ValueError("BOM item not found")

        for key, value in data.items():
            setattr(bom_item, key, value)

        self.db.commit()
        self.db.refresh(bom_item)
        return self.get_bom_item_by_id(bom_item.id) or bom_item

    def explode_bom_rows(self, root_item_id: UUID, reference_date: date) -> list[dict]:
        sql = text(
            """
            WITH RECURSIVE exploded AS (
                SELECT
                    bi.id AS bom_item_id,
                    bi.parent_item_id,
                    bi.child_item_id AS item_id,
                    1 AS level,
                    ARRAY[pi.code, ci.code] AS path_codes,
                    (bi.quantity * bi.loss_factor)::numeric(18,6) AS accumulated_quantity
                FROM bom b
                JOIN bom_item bi ON bi.bom_id = b.id
                JOIN item pi ON pi.id = bi.parent_item_id
                JOIN item ci ON ci.id = bi.child_item_id
                WHERE b.parent_item_id = :root_item_id
                  AND b.is_active = TRUE
                  AND b.valid_from <= :reference_date
                  AND (b.valid_to IS NULL OR b.valid_to >= :reference_date)

                UNION ALL

                SELECT
                    bi.id AS bom_item_id,
                    bi.parent_item_id,
                    bi.child_item_id AS item_id,
                    e.level + 1 AS level,
                    e.path_codes || ci.code AS path_codes,
                    (e.accumulated_quantity * bi.quantity * bi.loss_factor)::numeric(18,6) AS accumulated_quantity
                FROM exploded e
                JOIN bom b ON b.parent_item_id = e.item_id
                JOIN bom_item bi ON bi.bom_id = b.id
                JOIN item ci ON ci.id = bi.child_item_id
                WHERE b.is_active = TRUE
                  AND b.valid_from <= :reference_date
                  AND (b.valid_to IS NULL OR b.valid_to >= :reference_date)
                  AND NOT (ci.code = ANY(e.path_codes))
            )
            SELECT
                e.bom_item_id,
                e.parent_item_id,
                e.item_id,
                i.code,
                i.description,
                e.level,
                array_to_string(e.path_codes, ' > ') AS path,
                e.accumulated_quantity
            FROM exploded e
            JOIN item i ON i.id = e.item_id
            ORDER BY e.level, e.path
            """
        )
        rows = self.db.execute(
            sql,
            {"root_item_id": root_item_id, "reference_date": reference_date},
        ).mappings().all()
        return [dict(row) for row in rows]

    def get_calculation_structure(self, root_item_id: UUID, reference_date: date) -> list[dict]:
        sql = text(
            """
            WITH RECURSIVE bom_edges AS (
                SELECT
                    bi.parent_item_id,
                    bi.child_item_id AS item_id,
                    (bi.quantity * bi.loss_factor)::numeric(18,6) AS unit_quantity
                FROM bom b
                JOIN bom_item bi ON bi.bom_id = b.id
                WHERE b.parent_item_id = :root_item_id
                  AND b.is_active = TRUE
                  AND b.valid_from <= :reference_date
                  AND (b.valid_to IS NULL OR b.valid_to >= :reference_date)

                UNION

                SELECT
                    bi.parent_item_id,
                    bi.child_item_id AS item_id,
                    (bi.quantity * bi.loss_factor)::numeric(18,6) AS unit_quantity
                FROM bom_edges be
                JOIN bom b ON b.parent_item_id = be.item_id
                JOIN bom_item bi ON bi.bom_id = b.id
                WHERE b.is_active = TRUE
                  AND b.valid_from <= :reference_date
                  AND (b.valid_to IS NULL OR b.valid_to >= :reference_date)
            )
            SELECT
                be.parent_item_id,
                be.item_id,
                be.unit_quantity,
                i.code,
                i.description,
                i.type::text AS type,
                mg.id AS group_id,
                mg.name AS group_name,
                uom.code AS uom
            FROM bom_edges be
            JOIN item i ON i.id = be.item_id
            JOIN unit_of_measure uom ON uom.id = i.unit_of_measure_id
            LEFT JOIN raw_material rm ON rm.item_id = i.id
            LEFT JOIN material_group mg ON mg.id = rm.material_group_id
            ORDER BY i.code
            """
        )
        rows = self.db.execute(
            sql,
            {"root_item_id": root_item_id, "reference_date": reference_date},
        ).mappings().all()
        return [dict(row) for row in rows]
