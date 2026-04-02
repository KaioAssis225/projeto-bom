from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import asdict
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import InactiveItemError, ItemNotFoundError, PriceNotFoundError
from app.core.time import now_sp
from app.domain.bom_calculator import BomCalculator, BomNode
from app.models.calculation_execution_log import CalculationStatus
from app.repositories.bom_repository import BomRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.material_group_repository import MaterialGroupRepository
from app.repositories.price_repository import PriceRepository
from app.schemas.calculation import (
    BomBatchRequest,
    BomCalculationRequest,
    CalculationLineResponse,
    CalculationResponse,
    CalculationTotals,
)
from app.services.execution_log_service import ExecutionLogService
from app.services.export_service import ExportService


logger = logging.getLogger("app.calculation")


class CalculationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bom_repository = BomRepository(db)
        self.item_repository = ItemRepository(db)
        self.material_group_repository = MaterialGroupRepository(db)
        self.price_repository = PriceRepository(db)
        self.export_service = ExportService()
        self.log_service = ExecutionLogService(db)

    def calculate_product(self, payload: BomCalculationRequest) -> CalculationResponse:
        started_at = now_sp()
        log_id = self.log_service.start_log(
            requested_by=payload.requested_by,
            root_item_id=payload.root_item_id,
            group_id=payload.material_group_id,
            payload=payload.model_dump(mode="json"),
            reference=payload.simulation_reference,
        )
        try:
            reference_date = payload.reference_date or now_sp().replace(tzinfo=None)
            root_item = self._get_active_root_item(payload.root_item_id)

            structure_rows = self.bom_repository.get_calculation_structure(
                root_item_id=payload.root_item_id,
                reference_date=reference_date.date(),
            )
            if not structure_rows:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="BOM vazia")

            calculator = BomCalculator(
                nodes=self._build_nodes(structure_rows),
                price_map={},
            )
            accumulated = calculator.explode(root_id=payload.root_item_id, quantity=payload.quantity)
            price_map = self._build_price_map(accumulated.keys(), reference_date)
            calculator.price_map = price_map
            lines = calculator.calculate(
                accumulated=accumulated,
                price_map=price_map,
                group_filter=payload.material_group_id,
            )
            return self._build_response(
                lines=lines,
                root_item_id=root_item.id,
                requested_by=payload.requested_by,
                material_group_id=payload.material_group_id,
                simulation_reference=payload.simulation_reference,
                request_payload=payload.model_dump(mode="json"),
                started_at=started_at,
                log_id=log_id,
                prefix=f"produto_{root_item.code}",
            )
        except Exception as exc:
            message = exc.detail if isinstance(exc, HTTPException) else str(exc)
            self.log_service.finish_log(
                log_id=log_id,
                status=CalculationStatus.ERROR,
                file_name=None,
                message=str(message),
                duration_ms=self._duration_ms(started_at),
            )
            logger.info("Calculation logged: root_item_id=%s status=%s", payload.root_item_id, CalculationStatus.ERROR.value)
            raise

    def calculate_batch(self, payload: BomBatchRequest) -> CalculationResponse:
        started_at = now_sp()
        first_requested_item = payload.itens[0].produto_id
        log_id = self.log_service.start_log(
            requested_by=payload.requested_by,
            root_item_id=first_requested_item,
            group_id=payload.material_group_id,
            payload=payload.model_dump(mode="json"),
            reference=payload.simulation_reference,
        )
        try:
            reference_date = payload.reference_date or now_sp().replace(tzinfo=None)
            aggregated_quantities: dict[UUID, Decimal] = defaultdict(lambda: Decimal("0"))
            nodes: list[BomNode] = []
            first_root_item_id: UUID | None = None

            for item in payload.itens:
                root_item = self._get_active_root_item(item.produto_id)
                first_root_item_id = first_root_item_id or root_item.id
                structure_rows = self.bom_repository.get_calculation_structure(
                    root_item_id=item.produto_id,
                    reference_date=reference_date.date(),
                )
                if not structure_rows:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"BOM vazia para item {root_item.code}",
                    )

                batch_nodes = self._build_nodes(structure_rows)
                nodes.extend(batch_nodes)

                calculator = BomCalculator(nodes=batch_nodes, price_map={})
                exploded = calculator.explode(root_id=item.produto_id, quantity=item.quantidade)
                for key, value in exploded.items():
                    aggregated_quantities[key] += value

            price_map = self._build_price_map(aggregated_quantities.keys(), reference_date)
            calculator = BomCalculator(nodes=nodes, price_map=price_map)
            lines = calculator.calculate(
                accumulated=dict(aggregated_quantities),
                price_map=price_map,
                group_filter=payload.material_group_id,
            )
            return self._build_response(
                lines=lines,
                root_item_id=first_root_item_id or first_requested_item,
                requested_by=payload.requested_by,
                material_group_id=payload.material_group_id,
                simulation_reference=payload.simulation_reference,
                request_payload=payload.model_dump(mode="json"),
                started_at=started_at,
                log_id=log_id,
                prefix="lote",
            )
        except Exception as exc:
            message = exc.detail if isinstance(exc, HTTPException) else str(exc)
            self.log_service.finish_log(
                log_id=log_id,
                status=CalculationStatus.ERROR,
                file_name=None,
                message=str(message),
                duration_ms=self._duration_ms(started_at),
            )
            logger.info("Calculation logged: root_item_id=%s status=%s", first_requested_item, CalculationStatus.ERROR.value)
            raise

    def _build_nodes(self, rows: list[dict]) -> list[BomNode]:
        children_map: dict[UUID | None, list[UUID]] = defaultdict(list)
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
                )
            )
        return nodes

    def _build_price_map(self, item_ids, reference_date: datetime) -> dict[UUID, Decimal]:
        ids = list(item_ids)
        price_map = self.price_repository.get_prices_for_items_at_date(ids, reference_date)
        missing = [item for item in ids if item not in price_map]
        if missing:
            first_missing = self.item_repository.get_by_id(missing[0])
            item_code = first_missing.code if first_missing is not None else str(missing[0])
            raise PriceNotFoundError(f"Item sem preco vigente na data: {item_code}")
        return price_map

    def _build_response(
        self,
        *,
        lines,
        root_item_id: UUID,
        requested_by: str,
        material_group_id: UUID | None,
        simulation_reference: str | None,
        request_payload: dict,
        started_at: datetime,
        log_id: UUID,
        prefix: str,
    ) -> CalculationResponse:
        root_item = self.item_repository.get_by_id(root_item_id)
        reference_date = request_payload.get("reference_date") or now_sp().replace(tzinfo=None).isoformat()
        file_name = self.export_service.export(
            lines=lines,
            params={
                "requested_by": requested_by,
                "reference_date": reference_date,
                "material_group": self._group_name(material_group_id),
                "simulation_reference": simulation_reference,
                "generated_at": now_sp().strftime("%Y-%m-%d %H:%M:%S"),
                "product_data": {
                    "root_label": f"{root_item.code} - {root_item.description}" if root_item is not None else prefix,
                },
            },
        )
        total_cost = BomCalculator.total_cost(lines)
        self.log_service.finish_log(
            log_id=log_id,
            status=CalculationStatus.SUCCESS,
            file_name=file_name,
            message=None,
            duration_ms=self._duration_ms(started_at),
        )
        logger.info("Calculation logged: root_item_id=%s status=%s", root_item_id, CalculationStatus.SUCCESS.value)
        return CalculationResponse(
            linhas=[CalculationLineResponse.model_validate(asdict(line)) for line in lines],
            totais=CalculationTotals(
                quantidade_itens=len(lines),
                custo_geral=total_cost,
            ),
            arquivo_excel=file_name,
        )

    def _group_name(self, material_group_id: UUID | None) -> str | None:
        if material_group_id is None:
            return None
        group = self.material_group_repository.get_by_id(material_group_id)
        return group.name if group is not None else None

    def _get_active_root_item(self, item_id: UUID):
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        if not item.active:
            raise InactiveItemError("Produto inativo")
        return item

    @staticmethod
    def _duration_ms(started_at: datetime) -> int:
        return max(0, int((now_sp() - started_at).total_seconds() * 1000))
