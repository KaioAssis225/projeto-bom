from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.price import (
    CurrentPriceResponse,
    PriceCreate,
    PriceHistoryPaginatedResponse,
    PriceResponse,
)
from app.services.price_service import PriceService


router = APIRouter(tags=["precos"])


@router.post(
    "/{item_id}",
    response_model=PriceResponse,
    status_code=201,
    summary="Cadastrar novo preço",
    description="Fecha a vigência do preço atual e cria um novo registro de preço para o item.",
)
def set_price(
    item_id: UUID,
    payload: PriceCreate,
    db: Session = Depends(get_db_session),
) -> PriceResponse:
    service = PriceService(db)
    data = payload.model_copy(update={"item_id": item_id})
    return service.set_price(data)


@router.get(
    "/{item_id}/historico",
    response_model=PriceHistoryPaginatedResponse,
    summary="Listar histórico de preços",
    description="Retorna o histórico paginado de vigência de preços do item.",
)
def get_price_history(
    item_id: UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> PriceHistoryPaginatedResponse:
    service = PriceService(db)
    return service.get_history(item_id=item_id, skip=skip, limit=limit)


@router.get(
    "/{item_id}/vigente",
    response_model=CurrentPriceResponse,
    summary="Consultar preço vigente",
    description="Retorna o preço atual ou o preço válido para uma data/hora específica.",
)
def get_current_or_at_date(
    item_id: UUID,
    data: datetime | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> CurrentPriceResponse:
    service = PriceService(db)
    if data is not None:
        return service.get_price_at(item_id=item_id, reference_date=data)
    return service.get_current(item_id=item_id)
