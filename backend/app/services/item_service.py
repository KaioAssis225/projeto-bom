from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError, ItemNotFoundError
from app.models.item import ItemType
from app.repositories.item_repository import ItemRepository
from app.repositories.material_group_repository import MaterialGroupRepository
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.item import ItemCreate, ItemListFilter, ItemPaginatedResponse, ItemUpdate


logger = logging.getLogger("app.item")


class ItemService:
    def __init__(self, db: Session) -> None:
        self.repository = ItemRepository(db)
        self.material_group_repository = MaterialGroupRepository(db)
        self.unit_of_measure_repository = UnitOfMeasureRepository(db)

    def create(self, payload: ItemCreate):
        if self.repository.get_by_code(payload.code) is not None:
            raise DuplicateCodeError("Item code already exists")

        self._validate_relations(
            item_type=payload.type,
            unit_of_measure_id=payload.unit_of_measure_id,
            material_group_id=payload.material_group_id,
        )

        data = payload.model_dump()
        if payload.type != ItemType.RAW_MATERIAL and payload.material_group_id is None:
            data["material_group_id"] = None

        created = self.repository.create(data)
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

        self._validate_relations(
            item_type=existing.type,
            unit_of_measure_id=existing.unit_of_measure_id,
            material_group_id=payload.material_group_id,
        )

        updated = self.repository.update(id=id, data=payload.model_dump())
        logger.info("Item updated: id=%s code=%s", updated.id, updated.code)
        return updated

    def deactivate(self, id: UUID):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise ItemNotFoundError()

        deactivated = self.repository.deactivate(id)
        logger.info("Item deactivated: id=%s code=%s", deactivated.id, deactivated.code)
        return deactivated

    def _validate_relations(
        self,
        item_type: ItemType,
        unit_of_measure_id: UUID,
        material_group_id: UUID | None,
    ) -> None:
        if self.unit_of_measure_repository.get_by_id(unit_of_measure_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )

        if item_type == ItemType.RAW_MATERIAL and material_group_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="material_group_id is required for RAW_MATERIAL items",
            )

        if material_group_id is not None:
            if self.material_group_repository.get_by_id(material_group_id) is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Material group not found",
                )
