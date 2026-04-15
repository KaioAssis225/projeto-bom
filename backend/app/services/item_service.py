from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError, ItemNotFoundError
from app.models.item import ItemType
from app.repositories.item_repository import ItemRepository
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.item import ItemCreate, ItemListFilter, ItemPaginatedResponse, ItemUpdate


logger = logging.getLogger("app.item")

_DISALLOWED_TYPES = {ItemType.RAW_MATERIAL, ItemType.FINISHED_PRODUCT}


class ItemService:
    def __init__(self, db: Session) -> None:
        self.repository = ItemRepository(db)
        self.unit_of_measure_repository = UnitOfMeasureRepository(db)

    def create(self, payload: ItemCreate):
        if payload.type in _DISALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Use /api/v1/materias-primas or /api/v1/produtos-acabados to create {payload.type} items",
            )
        if self.repository.get_by_code(payload.code) is not None:
            raise DuplicateCodeError("Item code already exists")
        if self.unit_of_measure_repository.get_by_id(payload.unit_of_measure_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )
        created = self.repository.create(payload.model_dump())
        logger.info("Item created: id=%s code=%s", created.id, created.code)
        return created

    def get(self, id: UUID):
        item = self.repository.get_by_id(id)
        if item is None:
            raise ItemNotFoundError()
        return item

    def list(self, filters: ItemListFilter, skip: int, limit: int) -> ItemPaginatedResponse:
        items = self.repository.list_filtered(filters=filters, skip=skip, limit=limit)
        total = self.repository.count_filtered(filters=filters)
        return ItemPaginatedResponse(items=items, total=total, skip=skip, limit=limit)

    def update(self, id: UUID, payload: ItemUpdate):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise ItemNotFoundError()
        updated = self.repository.update(id=id, data=payload.model_dump(exclude_none=True))
        logger.info("Item updated: id=%s code=%s", updated.id, updated.code)
        return updated

    def deactivate(self, id: UUID):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise ItemNotFoundError()
        deactivated = self.repository.deactivate(id)
        logger.info("Item deactivated: id=%s code=%s", deactivated.id, deactivated.code)
        return deactivated
