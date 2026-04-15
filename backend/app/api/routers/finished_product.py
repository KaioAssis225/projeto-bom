from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.finished_product import (
    FinishedProductCreate,
    FinishedProductPaginatedResponse,
    FinishedProductResponse,
    FinishedProductUpdate,
)
from app.services.finished_product_service import FinishedProductService

router = APIRouter(tags=["produtos-acabados"])


@router.get("/", response_model=FinishedProductPaginatedResponse)
def list_finished_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    code: str | None = Query(default=None),
    desc: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> FinishedProductPaginatedResponse:
    return FinishedProductService(db).list(
        skip=skip, limit=limit, active_only=active_only,
        code_contains=code, description_contains=desc,
    )


@router.get("/{id}", response_model=FinishedProductResponse)
def get_finished_product(id: UUID, db: Session = Depends(get_db_session)) -> FinishedProductResponse:
    return FinishedProductService(db).get(id)


@router.post("/", response_model=FinishedProductResponse, status_code=201)
def create_finished_product(
    payload: FinishedProductCreate, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).create(payload)


@router.put("/{id}", response_model=FinishedProductResponse)
def update_finished_product(
    id: UUID, payload: FinishedProductUpdate, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).update(id, payload)


@router.patch("/{id}/inativar", response_model=FinishedProductResponse)
def deactivate_finished_product(
    id: UUID, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).deactivate(id)
