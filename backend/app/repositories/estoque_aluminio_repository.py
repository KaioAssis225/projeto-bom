from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.estoque_movimento import EstoqueMovimento


ALU_GROUP_CODE = "ALU"

_ITEM_SELECT = """
    SELECT
        i.id AS item_id,
        i.code,
        i.description,
        uom.code AS uom,
        uom2.code AS uom2,
        rm.peso_liquido,
        rm.estoque_minimo,
        COALESCE(SUM(em.quantidade) FILTER (WHERE em.tipo = 'entrada'), 0)
        - COALESCE(SUM(em.quantidade) FILTER (WHERE em.tipo = 'saida'), 0) AS saldo_uom1
    FROM item i
    JOIN raw_material rm ON rm.item_id = i.id
    JOIN material_group mg ON mg.id = rm.material_group_id
    JOIN unit_of_measure uom ON uom.id = i.unit_of_measure_id
    LEFT JOIN unit_of_measure uom2 ON uom2.id = rm.unidade_conversao_id
    LEFT JOIN estoque_movimento em ON em.item_id = i.id
    WHERE mg.code = :group_code AND i.active = true
"""

_ITEM_GROUP_BY = """
    GROUP BY i.id, i.code, i.description, uom.code, uom2.code, rm.peso_liquido, rm.estoque_minimo
"""


class EstoqueAluminioRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_items(self, skip: int, limit: int) -> list[dict]:
        stmt = text(
            _ITEM_SELECT + _ITEM_GROUP_BY + " ORDER BY i.code LIMIT :limit OFFSET :skip"
        )
        rows = self.db.execute(
            stmt, {"group_code": ALU_GROUP_CODE, "limit": limit, "skip": skip}
        ).mappings().all()
        return [dict(r) for r in rows]

    def count_items(self) -> int:
        stmt = text("""
            SELECT COUNT(DISTINCT i.id)
            FROM item i
            JOIN raw_material rm ON rm.item_id = i.id
            JOIN material_group mg ON mg.id = rm.material_group_id
            WHERE mg.code = :group_code AND i.active = true
        """)
        return int(self.db.execute(stmt, {"group_code": ALU_GROUP_CODE}).scalar() or 0)

    def get_item(self, item_id: UUID) -> dict | None:
        stmt = text(
            _ITEM_SELECT + " AND i.id = :item_id" + _ITEM_GROUP_BY
        )
        row = self.db.execute(
            stmt, {"group_code": ALU_GROUP_CODE, "item_id": item_id}
        ).mappings().first()
        return dict(row) if row else None

    def item_exists_in_alu(self, item_id: UUID) -> bool:
        stmt = text("""
            SELECT 1 FROM item i
            JOIN raw_material rm ON rm.item_id = i.id
            JOIN material_group mg ON mg.id = rm.material_group_id
            WHERE i.id = :item_id AND mg.code = :group_code AND i.active = true
        """)
        return (
            self.db.execute(stmt, {"item_id": item_id, "group_code": ALU_GROUP_CODE}).first()
            is not None
        )

    def add_movimento(
        self,
        item_id: UUID,
        tipo: str,
        quantidade: Decimal,
        solicitante: str | None,
    ) -> EstoqueMovimento:
        mov = EstoqueMovimento(
            item_id=item_id,
            tipo=tipo,
            quantidade=quantidade,
            solicitante=solicitante,
        )
        self.db.add(mov)
        self.db.commit()
        self.db.refresh(mov)
        return mov

    def list_historico(self, item_id: UUID, skip: int, limit: int) -> list[EstoqueMovimento]:
        stmt = (
            select(EstoqueMovimento)
            .where(EstoqueMovimento.item_id == item_id)
            .order_by(EstoqueMovimento.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_historico(self, item_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(EstoqueMovimento)
            .where(EstoqueMovimento.item_id == item_id)
        )
        return int(self.db.scalar(stmt) or 0)

    def set_estoque_minimo(self, item_id: UUID, estoque_minimo: Decimal | None) -> None:
        stmt = text(
            "UPDATE raw_material SET estoque_minimo = :val WHERE item_id = :item_id"
        )
        self.db.execute(stmt, {"val": estoque_minimo, "item_id": item_id})
        self.db.commit()
