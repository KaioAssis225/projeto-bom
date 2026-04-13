from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.supplier import (
    SupplierCreate,
    SupplierPaginatedResponse,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.supplier_service import SupplierService


router = APIRouter(tags=["fornecedores"])


@router.get(
    "/",
    response_model=SupplierPaginatedResponse,
    summary="Listar fornecedores",
    description="Retorna fornecedores com paginação e filtro de ativos.",
)
def list_suppliers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> SupplierPaginatedResponse:
    service = SupplierService(db)
    return service.list(skip=skip, limit=limit, active_only=active_only)


@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=201,
    summary="Criar fornecedor",
    description="Cria um novo fornecedor.",
)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db_session),
) -> SupplierResponse:
    service = SupplierService(db)
    return service.create(payload)


@router.get(
    "/{id}",
    response_model=SupplierResponse,
    summary="Consultar fornecedor",
    description="Retorna os detalhes de um fornecedor.",
)
def get_supplier(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> SupplierResponse:
    service = SupplierService(db)
    return service.get(id)


@router.put(
    "/{id}",
    response_model=SupplierResponse,
    summary="Atualizar fornecedor",
    description="Atualiza nome, descrição e status ativo do fornecedor.",
)
def update_supplier(
    id: UUID,
    payload: SupplierUpdate,
    db: Session = Depends(get_db_session),
) -> SupplierResponse:
    service = SupplierService(db)
    return service.update(id=id, payload=payload)


@router.patch(
    "/{id}/inativar",
    response_model=SupplierResponse,
    summary="Inativar fornecedor",
    description="Realiza soft delete do fornecedor, marcando-o como inativo.",
)
def deactivate_supplier(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> SupplierResponse:
    service = SupplierService(db)
    return service.deactivate(id)
