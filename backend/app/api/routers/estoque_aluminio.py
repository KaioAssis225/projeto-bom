from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.permissions import require
from app.models.user import User
from app.schemas.estoque_aluminio import (
    EstoqueEntradaPayload,
    EstoqueHistoricoPaginatedResponse,
    EstoqueItemPaginatedResponse,
    EstoqueItemResponse,
    EstoqueMinimoPayload,
    EstoqueMovimentoRecenteResponse,
    EstoqueMovimentoResponse,
    EstoqueSaidaPayload,
    PercentualAlertaPayload,
)
from app.services.estoque_aluminio_service import EstoqueAluminioService

router = APIRouter(tags=["estoque-aluminio"])


@router.get("/ultimos-movimentos", response_model=list[EstoqueMovimentoRecenteResponse])
def get_ultimos_movimentos(
    group_id: UUID = Query(...),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="VIEWER")),
) -> list[EstoqueMovimentoRecenteResponse]:
    return EstoqueAluminioService(db).get_ultimos_movimentos(group_id=group_id, limit=limit)


@router.get("/", response_model=EstoqueItemPaginatedResponse)
def list_estoque(
    group_id: UUID = Query(...),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="VIEWER")),
) -> EstoqueItemPaginatedResponse:
    return EstoqueAluminioService(db).list_items(group_id=group_id, skip=skip, limit=limit)


@router.post("/{item_id}/entrada", response_model=EstoqueMovimentoResponse, status_code=201)
def add_entrada(
    item_id: UUID,
    payload: EstoqueEntradaPayload,
    group_id: UUID = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require(area="ESTOQUE", nivel_min="ESTOQUISTA")),
) -> EstoqueMovimentoResponse:
    return EstoqueAluminioService(db).add_entrada(
        group_id=group_id, item_id=item_id, payload=payload,
        solicitante=current_user.full_name or current_user.email,
    )


@router.post("/{item_id}/saida", response_model=EstoqueMovimentoResponse, status_code=201)
def add_saida(
    item_id: UUID,
    payload: EstoqueSaidaPayload,
    group_id: UUID = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require(area="ESTOQUE", nivel_min="ESTOQUISTA")),
) -> EstoqueMovimentoResponse:
    return EstoqueAluminioService(db).add_saida(
        group_id=group_id, item_id=item_id, payload=payload,
        solicitante=current_user.full_name or current_user.email,
    )


@router.get("/{item_id}/historico", response_model=EstoqueHistoricoPaginatedResponse)
def get_historico(
    item_id: UUID,
    group_id: UUID = Query(...),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="VIEWER")),
) -> EstoqueHistoricoPaginatedResponse:
    return EstoqueAluminioService(db).get_historico(group_id=group_id, item_id=item_id, skip=skip, limit=limit)


@router.patch("/{item_id}/estoque-minimo", response_model=EstoqueItemResponse)
def set_estoque_minimo(
    item_id: UUID,
    payload: EstoqueMinimoPayload,
    group_id: UUID = Query(...),
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="ESTOQUISTA")),
) -> EstoqueItemResponse:
    return EstoqueAluminioService(db).set_estoque_minimo(group_id=group_id, item_id=item_id, payload=payload)


@router.patch("/{item_id}/percentual-alerta", response_model=EstoqueItemResponse)
def set_percentual_alerta(
    item_id: UUID,
    payload: PercentualAlertaPayload,
    group_id: UUID = Query(...),
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="ESTOQUISTA")),
) -> EstoqueItemResponse:
    return EstoqueAluminioService(db).set_percentual_alerta(
        group_id=group_id, item_id=item_id, payload=payload
    )
