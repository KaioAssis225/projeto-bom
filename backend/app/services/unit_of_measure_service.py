from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.unit_of_measure import (
    UnitOfMeasureCreate,
    UnitOfMeasurePaginatedResponse,
    UnitOfMeasureUpdate,
)


logger = logging.getLogger("app.unit_of_measure")


class UnitOfMeasureService:
    def __init__(self, db: Session) -> None:
        self.repository = UnitOfMeasureRepository(db)

    def create(self, payload: UnitOfMeasureCreate):
        existing = self.repository.get_by_code(payload.code)
        if existing is not None:
            raise DuplicateCodeError("Unit of measure code already exists")

        created = self.repository.create(payload.model_dump())
        logger.info("Unit of measure created: id=%s code=%s", created.id, created.code)
        return created

    def get(self, id: UUID):
        unit = self.repository.get_by_id(id)
        if unit is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )
        return unit

    def list(self, skip: int, limit: int, active_only: bool) -> UnitOfMeasurePaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return UnitOfMeasurePaginatedResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit,
        )

    def update(self, id: UUID, payload: UnitOfMeasureUpdate):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )

        updated = self.repository.update(id=id, data=payload.model_dump(exclude_none=True))
        logger.info("Unit of measure updated: id=%s code=%s", updated.id, updated.code)
        return updated

    def deactivate(self, id: UUID):
        unit = self.repository.get_by_id(id)
        if unit is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit of measure does not support deactivation",
        )
