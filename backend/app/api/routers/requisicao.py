from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.permissions import require
from app.models.material_group import MaterialGroup
from app.models.raw_material import RawMaterial
from app.models.user import User
from app.schemas.requisicao import RequisicaoCreate, RequisicaoListResponse, RequisicaoResponse, RequisicaoStatusUpdate
from app.services.requisicao_service import RequisicaoService

router = APIRouter(tags=["requisicoes"])

_REQ_DEP = require(area="ESTOQUE", nivel_min="REQUISITOR")


# ─── Endpoints auxiliares para o formulário ───────────────────────────────────

@router.get("/grupos-estoque")
def list_grupos_estoque(
    db: Session = Depends(get_db_session),
    _: User = Depends(_REQ_DEP),
):
    """Grupos com controle de estoque ativo — visíveis ao Requisitor."""
    grupos = (
        db.query(MaterialGroup)
        .filter(MaterialGroup.controla_estoque.is_(True), MaterialGroup.active.is_(True))
        .order_by(MaterialGroup.name)
        .all()
    )
    return [{"id": str(g.id), "code": g.code, "name": g.name} for g in grupos]


@router.get("/grupos/{group_id}/materias-primas")
def list_materias_por_grupo(
    group_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(_REQ_DEP),
):
    """Matérias-primas ativas de um grupo — para modo 'Item Direto'."""
    rows = (
        db.execute(
            text("""
                SELECT
                    i.id, i.code, i.description,
                    uom.code AS uom1_code,
                    uom2.code AS uom2_code,
                    rm.peso_liquido
                FROM raw_material rm
                JOIN item i ON i.id = rm.item_id
                JOIN unit_of_measure uom ON uom.id = i.unit_of_measure_id
                LEFT JOIN unit_of_measure uom2 ON uom2.id = rm.unidade_conversao_id
                WHERE rm.material_group_id = :gid AND i.active = TRUE
                ORDER BY i.code
            """),
            {"gid": group_id},
        )
        .mappings()
        .all()
    )
    return [
        {
            "id": str(r["id"]),
            "code": r["code"],
            "description": r["description"],
            "uom1_code": r["uom1_code"],
            "uom2_code": r["uom2_code"],
        }
        for r in rows
    ]


@router.get("/pa/{pa_id}/itens-bom")
def list_itens_bom_por_grupo(
    pa_id: UUID,
    group_id: UUID = Query(...),
    db: Session = Depends(get_db_session),
    _: User = Depends(_REQ_DEP),
):
    """Matérias-primas no BOM de um PA que pertencem ao grupo informado."""
    rows = db.execute(
        text("""
            WITH RECURSIVE bom_edges AS (
                SELECT bi.child_item_id AS item_id
                FROM bom b
                JOIN bom_item bi ON bi.bom_id = b.id
                WHERE b.parent_item_id = :pa_id
                  AND b.is_active = TRUE
                  AND b.valid_from <= :today
                  AND (b.valid_to IS NULL OR b.valid_to >= :today)

                UNION

                SELECT bi.child_item_id
                FROM bom_edges be
                JOIN bom b ON b.parent_item_id = be.item_id
                JOIN bom_item bi ON bi.bom_id = b.id
                WHERE b.is_active = TRUE
                  AND b.valid_from <= :today
                  AND (b.valid_to IS NULL OR b.valid_to >= :today)
            )
            SELECT DISTINCT
                i.id, i.code, i.description,
                uom.code AS uom1_code,
                uom2.code AS uom2_code
            FROM bom_edges be
            JOIN item i ON i.id = be.item_id
            JOIN raw_material rm ON rm.item_id = i.id
            JOIN unit_of_measure uom ON uom.id = i.unit_of_measure_id
            LEFT JOIN unit_of_measure uom2 ON uom2.id = rm.unidade_conversao_id
            WHERE rm.material_group_id = :gid AND i.active = TRUE
            ORDER BY i.code
        """),
        {"pa_id": pa_id, "gid": group_id, "today": date.today()},
    ).mappings().all()

    return [
        {
            "id": str(r["id"]),
            "code": r["code"],
            "description": r["description"],
            "uom1_code": r["uom1_code"],
            "uom2_code": r["uom2_code"],
        }
        for r in rows
    ]


@router.get("/produtos-acabados")
def list_pa_para_requisicao(
    db: Session = Depends(get_db_session),
    _: User = Depends(_REQ_DEP),
):
    """Produtos acabados ativos — para o modo 'Via PA'."""
    rows = db.execute(
        text("""
            SELECT i.id, i.code, i.description
            FROM item i
            WHERE i.type = 'FINISHED_PRODUCT' AND i.active = TRUE
            ORDER BY i.code
        """)
    ).mappings().all()
    return [{"id": str(r["id"]), "code": r["code"], "description": r["description"]} for r in rows]


# ─── CRUD de requisições ──────────────────────────────────────────────────────

@router.post("/", response_model=RequisicaoResponse, status_code=201)
def create_requisicao(
    payload: RequisicaoCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(_REQ_DEP),
) -> RequisicaoResponse:
    return RequisicaoService(db).create(payload, current_user)


@router.get("/", response_model=RequisicaoListResponse)
def list_requisicoes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(_REQ_DEP),
) -> RequisicaoListResponse:
    return RequisicaoService(db).list(current_user, skip=skip, limit=limit)


@router.get("/{req_id}", response_model=RequisicaoResponse)
def get_requisicao(
    req_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(_REQ_DEP),
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
