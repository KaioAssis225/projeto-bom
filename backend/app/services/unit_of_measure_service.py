from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError
from app.models.unit_of_measure import UnitOfMeasure
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.unit_of_measure import (
    UnitConversionResponse,
    UnitOfMeasureCreate,
    UnitOfMeasurePaginatedResponse,
    UnitOfMeasureResponse,
    UnitOfMeasureUpdate,
)


logger = logging.getLogger("app.unit_of_measure")


def _to_response(unit: UnitOfMeasure) -> UnitOfMeasureResponse:
    conversions = sorted(
        [
            UnitConversionResponse(
                to_unit_id=c.to_unit_id,
                to_unit_code=c.to_unit.code,
                to_unit_description=c.to_unit.description,
                factor=c.factor,
            )
            for c in unit.conversions
            if c.to_unit is not None
        ],
        key=lambda x: x.to_unit_code,
    )
    return UnitOfMeasureResponse(
        id=unit.id,
        code=unit.code,
        description=unit.description,
        decimal_places=unit.decimal_places,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        conversions=conversions,
    )


class UnitOfMeasureService:
    def __init__(self, db: Session) -> None:
        self.repository = UnitOfMeasureRepository(db)

    def create(self, payload: UnitOfMeasureCreate) -> UnitOfMeasureResponse:
        existing = self.repository.get_by_code(payload.code)
        if existing is not None:
            raise DuplicateCodeError("Unit of measure code already exists")

        created = self.repository.create(payload.model_dump())
        logger.info("Unit of measure created: id=%s code=%s", created.id, created.code)
        return _to_response(created)

    def get(self, id: UUID) -> UnitOfMeasureResponse:
        unit = self.repository.get_by_id(id)
        if unit is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )
        return _to_response(unit)

    def list(self, skip: int, limit: int, active_only: bool) -> UnitOfMeasurePaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return UnitOfMeasurePaginatedResponse(
            items=[_to_response(u) for u in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    def update(self, id: UUID, payload: UnitOfMeasureUpdate) -> UnitOfMeasureResponse:
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )

        updated = self.repository.update(id=id, data=payload.model_dump(exclude_none=True))
        logger.info("Unit of measure updated: id=%s code=%s", updated.id, updated.code)
        return _to_response(updated)

    def deactivate(self, id: UUID) -> UnitOfMeasureResponse:
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
