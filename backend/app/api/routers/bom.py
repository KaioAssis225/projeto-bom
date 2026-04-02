from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.bom import (
    BomCreate,
    BomItemAdd,
    BomItemCreate,
    BomItemUpdate,
    BomResponse,
    BomTreeResponse,
    CycleValidationRequest,
    CycleValidationResponse,
)
from app.services.bom_service import BomService


router = APIRouter(tags=["bom"])


@router.get(
    "/{item_pai_id}",
    response_model=BomTreeResponse,
    summary="Consultar árvore da BOM",
    description="Retorna a árvore completa da BOM ativa do item pai na data de referência.",
)
def get_bom_tree(
    item_pai_id: UUID,
    reference_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db_session),
) -> BomTreeResponse:
    service = BomService(db)
    return service.get_tree(item_pai_id=item_pai_id, reference_date=reference_date)


@router.post(
    "/",
    response_model=BomResponse,
    status_code=201,
    summary="Criar cabeçalho da BOM",
    description="Cria uma nova versão de BOM para um item pai.",
)
def create_bom(
    payload: BomCreate,
    db: Session = Depends(get_db_session),
) -> BomResponse:
    service = BomService(db)
    return service.create_bom(payload)


@router.post(
    "/{bom_id}/itens",
    response_model=BomResponse,
    status_code=201,
    summary="Adicionar filho à BOM",
    description="Adiciona um item filho direto à BOM informada, com validação de ciclo.",
)
def add_bom_item(
    bom_id: UUID,
    payload: BomItemAdd,
    db: Session = Depends(get_db_session),
) -> BomResponse:
    service = BomService(db)
    if payload.parent_item_id is not None:
        service.add_item_with_parent(
            BomItemCreate(
                bom_id=bom_id,
                parent_item_id=payload.parent_item_id,
                child_item_id=payload.child_item_id,
                line_number=payload.line_number,
                quantity=payload.quantity,
                scrap_percent=payload.scrap_percent,
                notes=payload.notes,
            )
        )
    else:
        service.add_item(bom_id=bom_id, payload=payload)
    bom = service.repository.get_bom_by_id(bom_id)
    if bom is None:
        raise RuntimeError("BOM was not found after item creation")
    return bom


@router.put(
    "/itens/{bom_item_id}",
    response_model=BomResponse,
    summary="Atualizar item da BOM",
    description="Atualiza quantidade, sucata e observações de um item já cadastrado na BOM.",
)
def update_bom_item(
    bom_item_id: UUID,
    payload: BomItemUpdate,
    db: Session = Depends(get_db_session),
) -> BomResponse:
    service = BomService(db)
    updated = service.update_item(bom_item_id=bom_item_id, payload=payload)
    bom = service.repository.get_bom_by_id(updated.bom_id)
    if bom is None:
        raise RuntimeError("BOM was not found after item update")
    return bom


@router.delete(
    "/itens/{bom_item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover item da BOM",
    description="Remove um item filho da BOM.",
)
def delete_bom_item(
    bom_item_id: UUID,
    db: Session = Depends(get_db_session),
) -> Response:
    service = BomService(db)
    service.remove_item(bom_item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/validar-ciclo",
    response_model=CycleValidationResponse,
    summary="Validar ciclo na BOM",
    description="Executa a validação de ciclo sem persistir alterações.",
)
def validate_bom_cycle(
    payload: CycleValidationRequest,
    db: Session = Depends(get_db_session),
) -> CycleValidationResponse:
    service = BomService(db)
    return service.validate_cycle(payload)
