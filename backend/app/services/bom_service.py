from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import BomCycleError, InactiveItemError, ItemNotFoundError
from app.core.time import today_sp
from app.models.item import Item
from app.repositories.bom_repository import BomRepository
from app.repositories.item_repository import ItemRepository
from app.schemas.bom import (
    BomCreate,
    BomExplosionRow,
    BomItemAdd,
    BomItemCreate,
    BomItemUpdate,
    BomResponse,
    BomTreeNodeResponse,
    BomTreeResponse,
    CycleValidationRequest,
    CycleValidationResponse,
)


logger = logging.getLogger("app.bom")


class BomService:
    def __init__(self, db: Session) -> None:
        self.repository = BomRepository(db)
        self.item_repository = ItemRepository(db)

    def create_bom(self, payload: BomCreate):
        parent_item = self._get_active_item(payload.parent_item_id, field_name="parent_item_id")
        existing = self.repository.get_bom_by_parent_and_version(
            parent_item_id=payload.parent_item_id,
            version_code=payload.version_code,
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="BOM version already exists for this parent item",
            )

        bom = self.repository.create_bom(
            {
                **payload.model_dump(),
                "created_by": "system",
            }
        )
        logger.info("BOM created: id=%s parent_item=%s", bom.id, parent_item.code)
        return bom

    def get_tree(self, item_pai_id: UUID, reference_date: date) -> BomTreeResponse:
        root_item = self.item_repository.get_by_id(item_pai_id)
        if root_item is None:
            raise ItemNotFoundError()

        bom = self.repository.get_active_bom_for_item(item_pai_id, reference_date)
        if bom is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active BOM not found")

        children = [
            self._build_tree_node(
                child_item,
                level=1,
                path=root_item.code,
                reference_date=reference_date,
                accumulated_quantity=Decimal("1"),
            )
            for child_item in sorted(bom.items, key=lambda row: row.line_number)
        ]

        return BomTreeResponse(
            bom_id=bom.id,
            item_id=root_item.id,
            code=root_item.code,
            description=root_item.description,
            type=root_item.type.value,
            version_code=bom.version_code,
            valid_from=bom.valid_from,
            valid_to=bom.valid_to,
            children=children,
        )

    def add_item(self, bom_id: UUID, payload: BomItemAdd):
        bom = self._get_bom_or_404(bom_id)
        return self._create_bom_item(
            BomItemCreate(
                bom_id=bom_id,
                parent_item_id=bom.parent_item_id,
                child_item_id=payload.child_item_id,
                line_number=payload.line_number,
                quantity=payload.quantity,
                scrap_percent=payload.scrap_percent,
                notes=payload.notes,
            )
        )

    def add_item_with_parent(self, payload: BomItemCreate):
        return self._create_bom_item(payload)

    def update_item(self, bom_item_id: UUID, payload: BomItemUpdate):
        existing = self.repository.get_bom_item_by_id(bom_item_id)
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM item not found")

        updated = self.repository.update_item(bom_item_id, payload.model_dump(exclude_none=True))
        logger.info("BOM item updated: id=%s bom_id=%s", updated.id, updated.bom_id)
        return updated

    def remove_item(self, bom_item_id: UUID) -> None:
        existing = self.repository.get_bom_item_by_id(bom_item_id)
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM item not found")
        self.repository.remove_item(bom_item_id)
        logger.info("BOM item removed: id=%s bom_id=%s", existing.id, existing.bom_id)

    def validate_cycle(self, payload: CycleValidationRequest) -> CycleValidationResponse:
        self._get_bom_or_404(payload.bom_id)
        self._ensure_no_cycle(
            bom_id=payload.bom_id,
            parent_item_id=payload.parent_item_id,
            child_item_id=payload.child_item_id,
        )
        return CycleValidationResponse(valid=True, message="Nenhum ciclo detectado", path=None)

    def explode_bom(self, root_item_id: UUID, reference_date: date) -> list[BomExplosionRow]:
        root_item = self.item_repository.get_by_id(root_item_id)
        if root_item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

        rows = self.repository.explode_bom_rows(root_item_id=root_item_id, reference_date=reference_date)
        return [BomExplosionRow.model_validate(row) for row in rows]

    def _create_bom_item(self, payload: BomItemCreate):
        bom = self._get_bom_or_404(payload.bom_id)

        if payload.parent_item_id != bom.parent_item_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="parent_item_id must match BOM parent item",
            )

        self._get_active_item(payload.parent_item_id, field_name="parent_item_id")
        self._get_active_item(payload.child_item_id, field_name="child_item_id")

        if payload.parent_item_id == payload.child_item_id:
            raise BomCycleError(
                detail="Ciclo detectado: parent_item_id and child_item_id must be different",
                path=None,
            )

        existing = self.repository.get_bom_item_by_parent_child(
            bom_id=payload.bom_id,
            parent_item_id=payload.parent_item_id,
            child_item_id=payload.child_item_id,
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This child item already exists in the BOM for the same parent",
            )

        self._ensure_no_cycle(
            bom_id=payload.bom_id,
            parent_item_id=payload.parent_item_id,
            child_item_id=payload.child_item_id,
        )

        created = self.repository.add_item(payload.model_dump())
        logger.info(
            "BOM item created: id=%s bom_id=%s parent_item_id=%s child_item_id=%s loss_factor=%s",
            created.id,
            created.bom_id,
            created.parent_item_id,
            created.child_item_id,
            created.loss_factor,
        )
        return created

    def _ensure_no_cycle(self, bom_id: UUID, parent_item_id: UUID, child_item_id: UUID) -> None:
        if parent_item_id == child_item_id:
            parent_item = self.item_repository.get_by_id(parent_item_id)
            code = parent_item.code if parent_item is not None else str(parent_item_id)
            path = f"{code} -> {code}"
            raise BomCycleError(detail=f"Ciclo detectado: {path}", path=path)

        parent_item = self.item_repository.get_by_id(parent_item_id)
        child_item = self.item_repository.get_by_id(child_item_id)
        if parent_item is None or child_item is None:
            return

        reference_date = today_sp()
        stack: list[tuple[UUID, list[Item]]] = [(child_item.id, [child_item])]
        visited: set[UUID] = set()

        while stack:
            current_item_id, path_items = stack.pop()
            if current_item_id in visited:
                continue
            visited.add(current_item_id)

            active_bom = self.repository.get_active_bom_for_item(current_item_id, reference_date)
            if active_bom is None:
                continue

            for row in sorted(active_bom.items, key=lambda item: item.line_number, reverse=True):
                next_item = row.child_item
                next_path = [*path_items, next_item]
                if next_item.id == parent_item_id:
                    readable_path = " -> ".join(item.code for item in [parent_item, *next_path])
                    raise BomCycleError(detail=f"Ciclo detectado: {readable_path}", path=readable_path)
                stack.append((next_item.id, next_path))

    def _build_tree_node(
        self,
        bom_item,
        level: int,
        path: str,
        reference_date: date,
        accumulated_quantity: Decimal,
    ) -> BomTreeNodeResponse:
        child = bom_item.child_item
        node_path = f"{path} > {child.code}"
        node_accumulated_quantity = accumulated_quantity * bom_item.quantity * bom_item.loss_factor
        active_child_bom = self.repository.get_active_bom_for_item(child.id, reference_date)
        children = []
        if active_child_bom is not None:
            children = [
                self._build_tree_node(
                    row,
                    level=level + 1,
                    path=node_path,
                    reference_date=reference_date,
                    accumulated_quantity=node_accumulated_quantity,
                )
                for row in sorted(active_child_bom.items, key=lambda item: item.line_number)
            ]

        return BomTreeNodeResponse(
            bom_item_id=bom_item.id,
            item_id=child.id,
            code=child.code,
            description=child.description,
            type=child.type.value,
            level=level,
            path=node_path,
            quantity=bom_item.quantity,
            scrap_percent=bom_item.scrap_percent,
            loss_factor=bom_item.loss_factor,
            accumulated_quantity=node_accumulated_quantity,
            children=children,
        )

    def _get_bom_or_404(self, bom_id: UUID):
        bom = self.repository.get_bom_by_id(bom_id)
        if bom is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM not found")
        return bom

    def _get_active_item(self, item_id: UUID, field_name: str) -> Item:
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError(f"{field_name} not found")
        if not item.active:
            raise InactiveItemError(f"{field_name} must reference an active item")
        return item
