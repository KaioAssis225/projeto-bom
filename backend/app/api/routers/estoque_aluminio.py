from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.estoque_aluminio import (
    EstoqueEntradaPayload,
    EstoqueHistoricoPaginatedResponse,
    EstoqueItemPaginatedResponse,
    EstoqueItemResponse,
    EstoqueMinimoPayload,
    EstoqueMovimentoResponse,
    EstoqueSaidaPayload,
)
from app.services.estoque_aluminio_service import EstoqueAluminioService

router = APIRouter(tags=["estoque-aluminio"])


@router.get("/", response_model=EstoqueItemPaginatedResponse)
def list_estoque(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db_session),
) -> EstoqueItemPaginatedResponse:
    return EstoqueAluminioService(db).list_items(skip=skip, limit=limit)


@router.post("/{item_id}/entrada", response_model=EstoqueMovimentoResponse, status_code=201)
def add_entrada(
    item_id: UUID,
    payload: EstoqueEntradaPayload,
    db: Session = Depends(get_db_session),
) -> EstoqueMovimentoResponse:
    return EstoqueAluminioService(db).add_entrada(item_id=item_id, payload=payload)


@router.post("/{item_id}/saida", response_model=EstoqueMovimentoResponse, status_code=201)
def add_saida(
    item_id: UUID,
    payload: EstoqueSaidaPayload,
    db: Session = Depends(get_db_session),
) -> EstoqueMovimentoResponse:
    return EstoqueAluminioService(db).add_saida(item_id=item_id, payload=payload)


@router.get("/{item_id}/historico", response_model=EstoqueHistoricoPaginatedResponse)
def get_historico(
    item_id: UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> EstoqueHistoricoPaginatedResponse:
    return EstoqueAluminioService(db).get_historico(item_id=item_id, skip=skip, limit=limit)


@router.patch("/{item_id}/estoque-minimo", response_model=EstoqueItemResponse)
def set_estoque_minimo(
    item_id: UUID,
    payload: EstoqueMinimoPayload,
    db: Session = Depends(get_db_session),
) -> EstoqueItemResponse:
    return EstoqueAluminioService(db).set_estoque_minimo(item_id=item_id, payload=payload)
