from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.bom_cost_impact import BomCostImpactPaginatedResponse, BomCostImpactSummary
from app.schemas.finished_product import (
    FinishedProductCreate,
    FinishedProductPaginatedResponse,
    FinishedProductResponse,
    FinishedProductUpdate,
)
from app.schemas.import_result import ImportResult
from app.services.bom_cost_impact_service import BomCostImpactService
from app.services.finished_product_import_service import FinishedProductImportService
from app.services.finished_product_service import FinishedProductService
from app.services.templates import build_template_xlsx

router = APIRouter(tags=["produtos-acabados"])

_HEADERS = [
    "code", "description", "unit_of_measure_code",
    "peso_liquido", "catalogo", "linha", "designer", "notes",
]
_EXAMPLE = [
    "PA001", "EXEMPLO PRODUTO ACABADO", "UN",
    "0,500", "CAT-2026", "Premium", "Designer X", "observacao opcional",
]
_TEMPLATE_CSV = ";".join(_HEADERS) + "\r\n" + ";".join(_EXAMPLE) + "\r\n"


@router.get("/", response_model=FinishedProductPaginatedResponse)
def list_finished_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    code: str | None = Query(default=None),
    desc: str | None = Query(default=None),
    without_bom: bool = Query(default=False),
    db: Session = Depends(get_db_session),
) -> FinishedProductPaginatedResponse:
    return FinishedProductService(db).list(
        skip=skip, limit=limit, active_only=active_only,
        code_contains=code, description_contains=desc,
        without_bom=without_bom,
    )


@router.get("/template-csv", include_in_schema=False)
def finished_product_template_csv() -> Response:
    return Response(
        content="\ufeff" + _TEMPLATE_CSV,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="produtos-acabados-template.csv"'},
    )


@router.get("/template-xlsx", include_in_schema=False)
def finished_product_template_xlsx() -> Response:
    content = build_template_xlsx(
        sheet_name="Produtos-Acabados",
        headers=_HEADERS,
        example_row=_EXAMPLE,
    )
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="produtos-acabados-template.xlsx"'},
    )


@router.post("/import-csv", response_model=ImportResult)
def import_finished_products_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> ImportResult:
    return FinishedProductImportService(db).import_csv(file)


@router.get(
    "/{id}/variacoes-custo",
    response_model=BomCostImpactPaginatedResponse,
    summary="Histórico de variações de custo do PA",
    description="Lista impactos no custo BOM deste PA gerados por alterações de preço de matérias-primas que ele consome.",
)
def list_pa_cost_variations(
    id: UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db_session),
) -> BomCostImpactPaginatedResponse:
    return BomCostImpactService(db).list_for_pa(
        finished_product_item_id=id, skip=skip, limit=limit
    )


@router.get(
    "/{id}/variacoes-custo/resumo",
    response_model=BomCostImpactSummary,
    summary="Resumo das variações de custo do PA",
    description="Retorna a contagem, soma dos deltas, primeiro e ultimo custo registrados para este PA.",
)
def pa_cost_variations_summary(
    id: UUID,
    db: Session = Depends(get_db_session),
) -> BomCostImpactSummary:
    return BomCostImpactService(db).summary_for_pa(finished_product_item_id=id)


@router.get("/{id}", response_model=FinishedProductResponse)
def get_finished_product(id: UUID, db: Session = Depends(get_db_session)) -> FinishedProductResponse:
    return FinishedProductService(db).get(id)


@router.post("/", response_model=FinishedProductResponse, status_code=201)
def create_finished_product(
    payload: FinishedProductCreate, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).create(payload)


@router.put("/{id}", response_model=FinishedProductResponse)
def update_finished_product(
    id: UUID, payload: FinishedProductUpdate, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).update(id, payload)


@router.patch("/{id}/inativar", response_model=FinishedProductResponse)
def deactivate_finished_product(
    id: UUID, db: Session = Depends(get_db_session)
) -> FinishedProductResponse:
    return FinishedProductService(db).deactivate(id)
