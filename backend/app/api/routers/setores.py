from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.setor import (
    SetorCreate,
    SetorPaginatedResponse,
    SetorResponse,
    SetorUpdate,
)
from app.services.setor_service import SetorService

router = APIRouter(tags=["setores"])


@router.get("/", response_model=SetorPaginatedResponse)
def list_setores(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> SetorPaginatedResponse:
    return SetorService(db).list(skip=skip, limit=limit, active_only=active_only)


@router.post("/", response_model=SetorResponse, status_code=201)
def create_setor(
    payload: SetorCreate,
    db: Session = Depends(get_db_session),
) -> SetorResponse:
    return SetorService(db).create(payload)


@router.get("/{id}", response_model=SetorResponse)
def get_setor(id: UUID, db: Session = Depends(get_db_session)) -> SetorResponse:
    return SetorService(db).get(id)


@router.put("/{id}", response_model=SetorResponse)
def update_setor(
    id: UUID,
    payload: SetorUpdate,
    db: Session = Depends(get_db_session),
) -> SetorResponse:
    return SetorService(db).update(id=id, payload=payload)


@router.patch("/{id}/inativar", response_model=SetorResponse)
def deactivate_setor(id: UUID, db: Session = Depends(get_db_session)) -> SetorResponse:
    return SetorService(db).deactivate(id)


@router.delete("/{id}", status_code=204)
def delete_setor(id: UUID, db: Session = Depends(get_db_session)) -> None:
    SetorService(db).delete(id)
