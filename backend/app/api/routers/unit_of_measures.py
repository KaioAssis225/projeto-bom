from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.unit_of_measure import (
    UnitOfMeasureCreate,
    UnitOfMeasurePaginatedResponse,
    UnitOfMeasureResponse,
    UnitOfMeasureUpdate,
)
from app.services.unit_of_measure_service import UnitOfMeasureService


router = APIRouter(tags=["unidades"])


@router.get(
    "/",
    response_model=UnitOfMeasurePaginatedResponse,
    summary="Listar unidades de medida",
    description="Retorna unidades de medida com paginação.",
)
def list_units_of_measure(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> UnitOfMeasurePaginatedResponse:
    service = UnitOfMeasureService(db)
    return service.list(skip=skip, limit=limit, active_only=active_only)


@router.post(
    "/",
    response_model=UnitOfMeasureResponse,
    status_code=201,
    summary="Criar unidade de medida",
    description="Cria uma nova unidade de medida com precisão decimal configurável.",
)
def create_unit_of_measure(
    payload: UnitOfMeasureCreate,
    db: Session = Depends(get_db_session),
) -> UnitOfMeasureResponse:
    service = UnitOfMeasureService(db)
    return service.create(payload)


@router.get(
    "/{id}",
    response_model=UnitOfMeasureResponse,
    summary="Consultar unidade de medida",
    description="Retorna os detalhes de uma unidade de medida.",
)
def get_unit_of_measure(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> UnitOfMeasureResponse:
    service = UnitOfMeasureService(db)
    return service.get(id)


@router.put(
    "/{id}",
    response_model=UnitOfMeasureResponse,
    summary="Atualizar unidade de medida",
    description="Atualiza descrição e quantidade de casas decimais da unidade.",
)
def update_unit_of_measure(
    id: UUID,
    payload: UnitOfMeasureUpdate,
    db: Session = Depends(get_db_session),
) -> UnitOfMeasureResponse:
    service = UnitOfMeasureService(db)
    return service.update(id=id, payload=payload)


@router.patch(
    "/{id}/inativar",
    response_model=UnitOfMeasureResponse,
    summary="Inativar unidade de medida",
    description="Endpoint mantido por compatibilidade, mas a entidade não suporta inativação lógica.",
)
def deactivate_unit_of_measure(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> UnitOfMeasureResponse:
    service = UnitOfMeasureService(db)
    return service.deactivate(id)
