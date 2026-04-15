from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError, ItemNotFoundError
from app.models.item import Item
from app.repositories.finished_product_repository import FinishedProductRepository
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.finished_product import (
    FinishedProductCreate,
    FinishedProductPaginatedResponse,
    FinishedProductResponse,
    FinishedProductUpdate,
)

logger = logging.getLogger("app.finished_product")

_ITEM_FIELDS = {"code", "description", "unit_of_measure_id", "notes", "active"}
_FP_FIELDS = {"peso_liquido", "catalogo", "linha", "designer"}


def _to_response(item: Item) -> FinishedProductResponse:
    fp = item.finished_product
    return FinishedProductResponse(
        id=item.id,
        code=item.code,
        description=item.description,
        active=item.active,
        notes=item.notes,
        unit_of_measure_id=item.unit_of_measure_id,
        peso_liquido=fp.peso_liquido if fp else None,
        catalogo=fp.catalogo if fp else None,
        linha=fp.linha if fp else None,
        designer=fp.designer if fp else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
        unit_of_measure=item.unit_of_measure,
    )


class FinishedProductService:
    def __init__(self, db: Session) -> None:
        self.repository = FinishedProductRepository(db)
        self.uom_repo = UnitOfMeasureRepository(db)

    def create(self, payload: FinishedProductCreate) -> FinishedProductResponse:
        if self.repository.get_by_code(payload.code) is not None:
            raise DuplicateCodeError("Código de produto acabado já existe")
        if self.uom_repo.get_by_id(payload.unit_of_measure_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unidade de medida não encontrada")
        data = payload.model_dump()
        item_data = {k: v for k, v in data.items() if k in _ITEM_FIELDS}
        fp_data = {k: v for k, v in data.items() if k in _FP_FIELDS}
        item = self.repository.create(item_data, fp_data)
        logger.info("FinishedProduct created: id=%s code=%s", item.id, item.code)
        return _to_response(item)

    def get(self, item_id: UUID) -> FinishedProductResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        return _to_response(item)

    def list(
        self,
        skip: int,
        limit: int,
        active_only: bool = True,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> FinishedProductPaginatedResponse:
        items = self.repository.list_filtered(
            skip=skip, limit=limit, active_only=active_only,
            code_contains=code_contains, description_contains=description_contains,
        )
        total = self.repository.count_filtered(
            active_only=active_only,
            code_contains=code_contains, description_contains=description_contains,
        )
        return FinishedProductPaginatedResponse(
            items=[_to_response(i) for i in items],
            total=total, skip=skip, limit=limit,
        )

    def update(self, item_id: UUID, payload: FinishedProductUpdate) -> FinishedProductResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        data = payload.model_dump(exclude_none=True)
        item_data = {k: v for k, v in data.items() if k in _ITEM_FIELDS}
        fp_data = {k: v for k, v in data.items() if k in _FP_FIELDS}
        updated = self.repository.update(item_id, item_data, fp_data)
        logger.info("FinishedProduct updated: id=%s code=%s", updated.id, updated.code)
        return _to_response(updated)

    def deactivate(self, item_id: UUID) -> FinishedProductResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        deactivated = self.repository.deactivate(item_id)
        logger.info("FinishedProduct deactivated: id=%s", deactivated.id)
        return _to_response(deactivated)
