from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.item import ItemType
from app.schemas.item import (
    ItemCreate,
    ItemListFilter,
    ItemPaginatedResponse,
    ItemResponse,
    ItemUpdate,
)
from app.services.item_service import ItemService


router = APIRouter(tags=["itens"])


@router.get(
    "/",
    response_model=ItemPaginatedResponse,
    summary="Listar itens",
    description="Lista itens com filtros opcionais por tipo, grupo, código, descrição e status.",
)
def list_items(
    type: ItemType | None = Query(default=None),
    group_id: UUID | None = Query(default=None),
    code: str | None = Query(default=None),
    desc: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> ItemPaginatedResponse:
    filters = ItemListFilter(
        type=type,
        material_group_id=group_id,
        code_contains=code,
        description_contains=desc,
        active_only=active_only,
    )
    service = ItemService(db)
    return service.list(filters=filters, skip=skip, limit=limit)


@router.get(
    "/{id}",
    response_model=ItemResponse,
    summary="Consultar item",
    description="Retorna os dados completos de um item pelo identificador.",
)
def get_item(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> ItemResponse:
    service = ItemService(db)
    return service.get(id)


@router.post(
    "/",
    response_model=ItemResponse,
    status_code=201,
    summary="Criar item",
    description="Cria um novo item de matéria-prima, produto acabado, subconjunto, embalagem ou serviço.",
)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db_session),
) -> ItemResponse:
    service = ItemService(db)
    return service.create(payload)


@router.put(
    "/{id}",
    response_model=ItemResponse,
    summary="Atualizar item",
    description="Atualiza descrição, grupo, observações e status ativo de um item.",
)
def update_item(
    id: UUID,
    payload: ItemUpdate,
    db: Session = Depends(get_db_session),
) -> ItemResponse:
    service = ItemService(db)
    return service.update(id=id, payload=payload)


@router.patch(
    "/{id}/inativar",
    response_model=ItemResponse,
    summary="Inativar item",
    description="Realiza inativação lógica de um item sem remoção física do registro.",
)
def deactivate_item(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> ItemResponse:
    service = ItemService(db)
    return service.deactivate(id)
