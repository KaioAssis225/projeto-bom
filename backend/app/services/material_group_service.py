from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError
from app.repositories.material_group_repository import MaterialGroupRepository
from app.schemas.material_group import MaterialGroupCreate, MaterialGroupPaginatedResponse, MaterialGroupUpdate


logger = logging.getLogger("app.material_group")


class MaterialGroupService:
    def __init__(self, db: Session) -> None:
        self.repository = MaterialGroupRepository(db)

    def create(self, payload: MaterialGroupCreate):
        existing = self.repository.get_by_code(payload.code)
        if existing is not None:
            raise DuplicateCodeError("Material group code already exists")

        created = self.repository.create(payload.model_dump())
        logger.info("Material group created: id=%s code=%s", created.id, created.code)
        return created

    def get(self, id: UUID):
        material_group = self.repository.get_by_id(id)
        if material_group is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material group not found",
            )
        return material_group

    def list(self, skip: int, limit: int, active_only: bool) -> MaterialGroupPaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return MaterialGroupPaginatedResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit,
        )

    def update(self, id: UUID, payload: MaterialGroupUpdate):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material group not found",
            )

        updated = self.repository.update(id=id, data=payload.model_dump(exclude_none=True))
        logger.info("Material group updated: id=%s code=%s", updated.id, updated.code)
        return updated

    def deactivate(self, id: UUID):
        existing = self.repository.get_by_id(id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material group not found",
            )

        deactivated = self.repository.deactivate(id=id)
        logger.info("Material group deactivated: id=%s code=%s", deactivated.id, deactivated.code)
        return deactivated
