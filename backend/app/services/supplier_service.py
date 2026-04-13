from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.supplier import SupplierCreate, SupplierPaginatedResponse, SupplierUpdate


logger = logging.getLogger("app.supplier")


class SupplierService:
    def __init__(self, db: Session) -> None:
        self.repository = SupplierRepository(db)

    def create(self, payload: SupplierCreate):
        existing = self.repository.get_by_code(payload.code)
        if existing is not None:
            raise DuplicateCodeError("Supplier code already exists")

        created = self.repository.create(payload.model_dump())
        logger.info("Supplier created: id=%s code=%s", created.id, created.code)
        return created

    def get(self, id: UUID):
        supplier = self.repository.get_by_id(id)
        if supplier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )
        return supplier

    def list(self, skip: int, limit: int, active_only: bool) -> SupplierPaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return SupplierPaginatedResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit,
        )

    def update(self, id: UUID, payload: SupplierUpdate):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )

        updated = self.repository.update(id=id, data=payload.model_dump())
        logger.info("Supplier updated: id=%s code=%s", updated.id, updated.code)
        return updated

    def deactivate(self, id: UUID):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )

        deactivated = self.repository.deactivate(id=id)
        logger.info("Supplier deactivated: id=%s code=%s", deactivated.id, deactivated.code)
        return deactivated
