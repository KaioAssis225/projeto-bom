from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.material_group import (
    MaterialGroupCreate,
    MaterialGroupPaginatedResponse,
    MaterialGroupResponse,
    MaterialGroupUpdate,
)
from app.services.material_group_service import MaterialGroupService


router = APIRouter(tags=["grupos"])


@router.get(
    "/",
    response_model=MaterialGroupPaginatedResponse,
    summary="Listar grupos de matéria-prima",
    description="Retorna grupos de matéria-prima com paginação e filtro de ativos.",
)
def list_material_groups(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> MaterialGroupPaginatedResponse:
    service = MaterialGroupService(db)
    return service.list(skip=skip, limit=limit, active_only=active_only)


@router.post(
    "/",
    response_model=MaterialGroupResponse,
    status_code=201,
    summary="Criar grupo de matéria-prima",
    description="Cria um novo grupo lógico para classificação de matérias-primas.",
)
def create_material_group(
    payload: MaterialGroupCreate,
    db: Session = Depends(get_db_session),
) -> MaterialGroupResponse:
    service = MaterialGroupService(db)
    return service.create(payload)


@router.get(
    "/{id}",
    response_model=MaterialGroupResponse,
    summary="Consultar grupo de matéria-prima",
    description="Retorna os detalhes de um grupo de matéria-prima.",
)
def get_material_group(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> MaterialGroupResponse:
    service = MaterialGroupService(db)
    return service.get(id)


@router.put(
    "/{id}",
    response_model=MaterialGroupResponse,
    summary="Atualizar grupo de matéria-prima",
    description="Atualiza nome, descrição e status ativo do grupo.",
)
def update_material_group(
    id: UUID,
    payload: MaterialGroupUpdate,
    db: Session = Depends(get_db_session),
) -> MaterialGroupResponse:
    service = MaterialGroupService(db)
    return service.update(id=id, payload=payload)


@router.patch(
    "/{id}/inativar",
    response_model=MaterialGroupResponse,
    summary="Inativar grupo de matéria-prima",
    description="Realiza soft delete do grupo, marcando-o como inativo.",
)
def deactivate_material_group(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> MaterialGroupResponse:
    service = MaterialGroupService(db)
    return service.deactivate(id)
