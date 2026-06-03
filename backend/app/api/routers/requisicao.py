from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.permissions import require
from app.models.user import User
from app.schemas.requisicao import RequisicaoCreate, RequisicaoListResponse, RequisicaoResponse, RequisicaoStatusUpdate
from app.services.requisicao_service import RequisicaoService

router = APIRouter(tags=["requisicoes"])


@router.post("/", response_model=RequisicaoResponse, status_code=201)
def create_requisicao(
    payload: RequisicaoCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require(area="ESTOQUE", nivel_min="REQUISITOR")),
) -> RequisicaoResponse:
    return RequisicaoService(db).create(payload, current_user)


@router.get("/", response_model=RequisicaoListResponse)
def list_requisicoes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require(area="ESTOQUE", nivel_min="REQUISITOR")),
) -> RequisicaoListResponse:
    return RequisicaoService(db).list(current_user, skip=skip, limit=limit)


@router.get("/{req_id}", response_model=RequisicaoResponse)
def get_requisicao(
    req_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require(area="ESTOQUE", nivel_min="REQUISITOR")),
) -> RequisicaoResponse:
    return RequisicaoService(db).get(req_id, current_user)


@router.patch("/{req_id}/status", response_model=RequisicaoResponse)
def update_status(
    req_id: UUID,
    payload: RequisicaoStatusUpdate,
    db: Session = Depends(get_db_session),
    _: User = Depends(require(area="ESTOQUE", nivel_min="ESTOQUISTA")),
) -> RequisicaoResponse:
    return RequisicaoService(db).update_status(req_id, payload)
