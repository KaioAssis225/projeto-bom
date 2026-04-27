from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.bom_calculator import BomCalculator, BomNode
from app.repositories.bom_cost_impact_repository import BomCostImpactRepository
from app.repositories.bom_repository import BomRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.price_repository import PriceRepository
from app.schemas.bom_cost_impact import BomCostImpactPaginatedResponse, BomCostImpactResponse


logger = logging.getLogger("app.bom_cost_impact")


class BomCostImpactService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = BomCostImpactRepository(db)
        self.bom_repository = BomRepository(db)
        self.price_repository = PriceRepository(db)
        self.item_repository = ItemRepository(db)

    # ─── Cálculo de impacto ──────────────────────────────────────────────────

    def compute_and_store(
        self,
        *,
        mp_item_id: UUID,
        old_unit_price: Decimal | None,
        new_unit_price: Decimal,
        reference_date: datetime,
        changed_by: str,
        changed_reason: str | None,
        price_history_id: UUID | None,
    ) -> int:
        """Para cada PA ativo que depende da MP, calcula o custo BOM com o
        preço antigo e o novo, gravando uma linha em ``bom_cost_impact``.
        Retorna o número de impactos gravados.
        """
        affected_pas = self.repository.find_pas_using_mp(mp_item_id)
        if not affected_pas:
            return 0

        impacts: list[dict] = []
        for pa in affected_pas:
            try:
                impact = self._compute_for_pa(
                    pa_id=pa.id,
                    mp_item_id=mp_item_id,
                    old_unit_price=old_unit_price,
                    new_unit_price=new_unit_price,
                    reference_date=reference_date,
                )
            except Exception as exc:
                logger.warning(
                    "skip_pa_impact pa_id=%s mp_id=%s reason=%s",
                    pa.id,
                    mp_item_id,
                    exc,
                )
                continue
            if impact is None:
                continue
            old_cost, new_cost = impact
            delta = new_cost - old_cost
            if delta == 0 and old_unit_price is not None:
                continue
            delta_percent: Decimal | None = None
            if old_cost and old_cost > 0:
                delta_percent = (delta / old_cost) * Decimal("100")
            impacts.append(
                {
                    "finished_product_item_id": pa.id,
                    "raw_material_item_id": mp_item_id,
                    "price_history_id": price_history_id,
                    "old_unit_price": old_unit_price,
                    "new_unit_price": new_unit_price,
                    "old_pa_cost": old_cost if old_unit_price is not None else None,
                    "new_pa_cost": new_cost,
                    "delta_cost": delta,
                    "delta_percent": delta_percent,
                    "reference_date": reference_date,
                    "changed_by": changed_by,
                    "changed_reason": changed_reason,
                }
            )

        if not impacts:
            return 0
        return self.repository.create_many(impacts)

    def _compute_for_pa(
        self,
        *,
        pa_id: UUID,
        mp_item_id: UUID,
        old_unit_price: Decimal | None,
        new_unit_price: Decimal,
        reference_date: datetime,
    ) -> tuple[Decimal, Decimal] | None:
        rows = self.bom_repository.get_calculation_structure(
            root_item_id=pa_id,
            reference_date=reference_date.date(),
        )
        if not rows:
            return None

        nodes = self._build_nodes(rows)
        calculator = BomCalculator(nodes=nodes, price_map={})
        accumulated = calculator.explode(root_id=pa_id, quantity=Decimal("1"))
        if mp_item_id not in accumulated:
            return None

        item_ids = list(accumulated.keys())
        base_pm = self.price_repository.get_prices_for_items_at_date(item_ids, reference_date)

        def cost_with(price_for_mp: Decimal | None) -> Decimal:
            total = Decimal("0")
            for item_id, qty in accumulated.items():
                if item_id == mp_item_id:
                    if price_for_mp is None:
                        # Sem preço antigo conhecido: ignora a contribuição da MP
                        # alterada (resulta em custo "antes" sem essa MP).
                        continue
                    total += qty * price_for_mp
                else:
                    total += qty * base_pm.get(item_id, Decimal("0"))
            return total

        old_cost = cost_with(old_unit_price)
        new_cost = cost_with(new_unit_price)
        return old_cost, new_cost

    @staticmethod
    def _build_nodes(rows: list[dict]) -> list[BomNode]:
        from collections import defaultdict

        children_map: dict = defaultdict(list)
        for row in rows:
            children_map[row["parent_item_id"]].append(row["item_id"])

        nodes: list[BomNode] = []
        for row in rows:
            nodes.append(
                BomNode(
                    item_id=row["item_id"],
                    parent_item_id=row["parent_item_id"],
                    code=row["code"],
                    description=row["description"],
                    type=row["type"],
                    group_id=row["group_id"],
                    group_name=row["group_name"],
                    uom=row["uom"],
                    unit_quantity=row["unit_quantity"],
                    children=children_map.get(row["item_id"], []),
                    uom2=row.get("uom2"),
                    peso_liquido=row.get("peso_liquido"),
                )
            )
        return nodes

    # ─── Listagem para a UI ──────────────────────────────────────────────────

    def list_for_pa(
        self, finished_product_item_id: UUID, skip: int, limit: int
    ) -> BomCostImpactPaginatedResponse:
        impacts = self.repository.list_by_finished_product(
            finished_product_item_id=finished_product_item_id, skip=skip, limit=limit
        )
        total = self.repository.count_by_finished_product(finished_product_item_id)

        # Enriquece com code/description da MP (uma query única).
        mp_ids = {imp.raw_material_item_id for imp in impacts}
        items_by_id: dict[UUID, tuple[str, str]] = {}
        if mp_ids:
            from sqlalchemy import select

            from app.models.item import Item

            stmt = select(Item.id, Item.code, Item.description).where(Item.id.in_(mp_ids))
            for row in self.db.execute(stmt).all():
                items_by_id[row[0]] = (row[1], row[2])

        responses = [
            BomCostImpactResponse(
                id=imp.id,
                finished_product_item_id=imp.finished_product_item_id,
                raw_material_item_id=imp.raw_material_item_id,
                raw_material_code=items_by_id.get(imp.raw_material_item_id, ("?", "?"))[0],
                raw_material_description=items_by_id.get(imp.raw_material_item_id, ("?", "?"))[1],
                old_unit_price=imp.old_unit_price,
                new_unit_price=imp.new_unit_price,
                old_pa_cost=imp.old_pa_cost,
                new_pa_cost=imp.new_pa_cost,
                delta_cost=imp.delta_cost,
                delta_percent=imp.delta_percent,
                reference_date=imp.reference_date,
                changed_by=imp.changed_by,
                changed_reason=imp.changed_reason,
                created_at=imp.created_at,
            )
            for imp in impacts
        ]
        return BomCostImpactPaginatedResponse(
            items=responses, total=total, skip=skip, limit=limit
        )
