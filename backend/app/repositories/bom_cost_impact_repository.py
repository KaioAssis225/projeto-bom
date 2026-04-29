from __future__ import annotations

from uuid import UUID

from sqlalchemy import desc, func, select, text
from sqlalchemy.orm import Session

from app.models.bom_cost_impact import BomCostImpact
from app.models.item import Item


class BomCostImpactRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_many(self, impacts: list[dict]) -> int:
        if not impacts:
            return 0
        objs = [BomCostImpact(**data) for data in impacts]
        self.db.add_all(objs)
        self.db.commit()
        return len(objs)

    def list_by_finished_product(
        self, finished_product_item_id: UUID, skip: int, limit: int
    ) -> list[BomCostImpact]:
        stmt = (
            select(BomCostImpact)
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
            .order_by(desc(BomCostImpact.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_finished_product(self, finished_product_item_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(BomCostImpact)
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
        )
        return int(self.db.scalar(stmt) or 0)

    def summary_for_pa(self, finished_product_item_id: UUID) -> dict:
        """Retorna agregados das variacoes do PA: contagem, soma dos deltas,
        primeiro old_pa_cost (mais antigo) e ultimo new_pa_cost (mais recente).
        """
        from decimal import Decimal as _Decimal

        count_stmt = (
            select(func.count())
            .select_from(BomCostImpact)
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
        )
        sum_stmt = (
            select(func.coalesce(func.sum(BomCostImpact.delta_cost), 0))
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
        )
        first_stmt = (
            select(BomCostImpact.old_pa_cost)
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
            .order_by(BomCostImpact.created_at.asc())
            .limit(1)
        )
        last_stmt = (
            select(BomCostImpact.new_pa_cost)
            .where(BomCostImpact.finished_product_item_id == finished_product_item_id)
            .order_by(desc(BomCostImpact.created_at))
            .limit(1)
        )
        return {
            "count": int(self.db.scalar(count_stmt) or 0),
            "total_delta_cost": _Decimal(self.db.scalar(sum_stmt) or 0),
            "first_pa_cost": self.db.scalar(first_stmt),
            "last_pa_cost": self.db.scalar(last_stmt),
        }

    def find_pas_using_mp(self, mp_item_id: UUID) -> list[Item]:
        """CTE recursiva bottom-up: encontra todos os Items ativos do tipo
        FINISHED_PRODUCT que dependem (direta ou indiretamente) da MP."""
        sql = text(
            """
            WITH RECURSIVE ancestors AS (
                SELECT bi.parent_item_id AS ancestor_id
                FROM bom_item bi
                JOIN bom b ON b.id = bi.bom_id
                WHERE bi.child_item_id = :mp_id
                  AND b.is_active = TRUE

                UNION

                SELECT bi.parent_item_id AS ancestor_id
                FROM ancestors a
                JOIN bom_item bi ON bi.child_item_id = a.ancestor_id
                JOIN bom b ON b.id = bi.bom_id
                WHERE b.is_active = TRUE
            )
            SELECT DISTINCT i.id
            FROM item i
            WHERE i.id IN (SELECT ancestor_id FROM ancestors)
              AND i.type = 'FINISHED_PRODUCT'
              AND i.active = TRUE
            """
        )
        rows = self.db.execute(sql, {"mp_id": mp_item_id}).all()
        ids = [row[0] for row in rows]
        if not ids:
            return []
        return list(
            self.db.scalars(select(Item).where(Item.id.in_(ids)).order_by(Item.code)).all()
        )
