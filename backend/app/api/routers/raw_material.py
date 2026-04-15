from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.raw_material import (
    RawMaterialCreate,
    RawMaterialPaginatedResponse,
    RawMaterialResponse,
    RawMaterialUpdate,
)
from app.services.raw_material_service import RawMaterialService

router = APIRouter(tags=["materias-primas"])


@router.get("/", response_model=RawMaterialPaginatedResponse)
def list_raw_materials(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    group_id: UUID | None = Query(default=None),
    code: str | None = Query(default=None),
    desc: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> RawMaterialPaginatedResponse:
    return RawMaterialService(db).list(
        skip=skip, limit=limit, active_only=active_only,
        material_group_id=group_id, code_contains=code, description_contains=desc,
    )


@router.get("/{id}", response_model=RawMaterialResponse)
def get_raw_material(id: UUID, db: Session = Depends(get_db_session)) -> RawMaterialResponse:
    return RawMaterialService(db).get(id)


@router.post("/", response_model=RawMaterialResponse, status_code=201)
def create_raw_material(
    payload: RawMaterialCreate, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).create(payload)


@router.put("/{id}", response_model=RawMaterialResponse)
def update_raw_material(
    id: UUID, payload: RawMaterialUpdate, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).update(id, payload)


@router.patch("/{id}/inativar", response_model=RawMaterialResponse)
def deactivate_raw_material(
    id: UUID, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).deactivate(id)
