from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.setor_repository import SetorRepository
from app.schemas.setor import SetorCreate, SetorPaginatedResponse, SetorUpdate

logger = logging.getLogger("app.setor")


class SetorService:
    def __init__(self, db: Session) -> None:
        self.repository = SetorRepository(db)

    def create(self, payload: SetorCreate):
        if self.repository.get_by_name(payload.name) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um setor com este nome.",
            )
        created = self.repository.create(payload.model_dump())
        logger.info("Setor created: id=%s name=%s", created.id, created.name)
        return created

    def get(self, id: UUID):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        return setor

    def list(self, skip: int, limit: int, active_only: bool) -> SetorPaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return SetorPaginatedResponse(items=items, total=total, skip=skip, limit=limit)

    def update(self, id: UUID, payload: SetorUpdate):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        updated = self.repository.update(id=id, data=payload.model_dump())
        logger.info("Setor updated: id=%s name=%s", updated.id, updated.name)
        return updated

    def deactivate(self, id: UUID):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        deactivated = self.repository.deactivate(id=id)
        logger.info("Setor deactivated: id=%s name=%s", deactivated.id, deactivated.name)
        return deactivated

    def delete(self, id: UUID) -> None:
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        try:
            self.repository.delete(id=id)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Setor está vinculado a matérias-primas e não pode ser excluído. Inative-o.",
            )
        logger.info("Setor deleted: id=%s name=%s", setor.id, setor.name)
