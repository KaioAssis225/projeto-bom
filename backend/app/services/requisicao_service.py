from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.requisicao import Requisicao, RequisicaoItem, RequisicaoStatus
from app.models.user import Nivel, User
from app.schemas.requisicao import (
    RequisicaoCreate,
    RequisicaoItemResponse,
    RequisicaoListResponse,
    RequisicaoResponse,
    RequisicaoStatusUpdate,
)


def _item_to_response(ri: RequisicaoItem) -> RequisicaoItemResponse:
    item = ri.item
    # UOM1: the item's primary unit of measure
    uom1_code = "UN"
    if item.unit_of_measure is not None:
        uom1_code = item.unit_of_measure.code

    # UOM2: raw material's unidade_conversao (only for RawMaterial items)
    uom2_code: str | None = None
    raw = getattr(item, "raw_material", None)
    if raw is not None and getattr(raw, "unidade_conversao", None) is not None:
        uom2_code = raw.unidade_conversao.code

    return RequisicaoItemResponse(
        id=ri.id,
        item_id=ri.item_id,
        item_code=item.code,
        item_description=item.description,
        quantidade=ri.quantidade,
        unidade_key=ri.unidade_key,
        uom1_code=uom1_code,
        uom2_code=uom2_code,
        notes=ri.notes,
    )


def _to_response(req: Requisicao) -> RequisicaoResponse:
    return RequisicaoResponse(
        id=req.id,
        user_id=req.user_id,
        user_name=req.user.full_name or req.user.email,
        group_id=req.group_id,
        group_name=req.group.name,
        status=req.status,
        notes=req.notes,
        created_at=req.created_at,
        itens=[_item_to_response(ri) for ri in req.itens],
    )


class RequisicaoService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: RequisicaoCreate, user: User) -> RequisicaoResponse:
        req = Requisicao(
            user_id=user.id,
            group_id=payload.group_id,
            notes=payload.notes,
            status=RequisicaoStatus.PENDENTE,
        )
        self.db.add(req)
        self.db.flush()

        for item_payload in payload.itens:
            self.db.add(RequisicaoItem(
                requisicao_id=req.id,
                item_id=item_payload.item_id,
                quantidade=item_payload.quantidade,
                unidade_key=item_payload.unidade_key,
                notes=item_payload.notes,
            ))

        self.db.commit()
        self.db.refresh(req)
        return _to_response(req)

    def list(self, user: User, skip: int = 0, limit: int = 50) -> RequisicaoListResponse:
        query = self.db.query(Requisicao)
        # REQUISITOR sees only their own; VIEWER+ sees all
        user_niveis = [r.nivel for r in user.roles]
        is_viewer_or_above = any(
            n in [Nivel.VIEWER, Nivel.ESTOQUISTA, Nivel.ANALISTA, Nivel.GESTOR, Nivel.ADMIN]
            for n in user_niveis
        )
        if not is_viewer_or_above:
            query = query.filter(Requisicao.user_id == user.id)

        total = query.count()
        items = query.order_by(Requisicao.created_at.desc()).offset(skip).limit(limit).all()
        return RequisicaoListResponse(items=[_to_response(r) for r in items], total=total)

    def get(self, req_id: UUID, user: User) -> RequisicaoResponse:
        req = self.db.get(Requisicao, req_id)
        if req is None:
            raise HTTPException(status_code=404, detail="Requisição não encontrada")
        return _to_response(req)

    def update_status(self, req_id: UUID, payload: RequisicaoStatusUpdate) -> RequisicaoResponse:
        req = self.db.get(Requisicao, req_id)
        if req is None:
            raise HTTPException(status_code=404, detail="Requisição não encontrada")
        req.status = payload.status
        if payload.notes:
            req.notes = payload.notes
        self.db.commit()
        self.db.refresh(req)
        return _to_response(req)
