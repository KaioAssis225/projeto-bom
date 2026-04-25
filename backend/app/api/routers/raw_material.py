from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.import_result import ImportResult
from app.schemas.raw_material import (
    RawMaterialCreate,
    RawMaterialPaginatedResponse,
    RawMaterialResponse,
    RawMaterialUpdate,
)
from app.services.raw_material_import_service import RawMaterialImportService
from app.services.raw_material_service import RawMaterialService
from app.services.templates import build_template_xlsx

router = APIRouter(tags=["materias-primas"])

_HEADERS = [
    "code", "description", "unit_of_measure_code", "material_group_code",
    "supplier_code", "unidade_conversao_code", "peso_liquido", "notes",
]
_EXAMPLE = [
    "MP001", "EXEMPLO MATERIA PRIMA", "KG", "GRP01",
    "FOR01", "G", "1,250", "observacao opcional",
]
_TEMPLATE_CSV = ";".join(_HEADERS) + "\r\n" + ";".join(_EXAMPLE) + "\r\n"


@router.get("/", response_model=RawMaterialPaginatedResponse)
def list_raw_materials(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    active_only: bool = Query(default=True),
    group_id: UUID | None = Query(default=None),
    code: str | None = Query(default=None),
    desc: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> RawMaterialPaginatedResponse:
    return RawMaterialService(db).list(
        skip=skip, limit=limit, active_only=active_only,
        material_group_id=group_id, code_contains=code, description_contains=desc,
    )


@router.get("/template-csv", include_in_schema=False)
def raw_material_template_csv() -> Response:
    return Response(
        content="\ufeff" + _TEMPLATE_CSV,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="materias-primas-template.csv"'},
    )


@router.get("/template-xlsx", include_in_schema=False)
def raw_material_template_xlsx() -> Response:
    content = build_template_xlsx(
        sheet_name="Materias-Primas",
        headers=_HEADERS,
        example_row=_EXAMPLE,
    )
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="materias-primas-template.xlsx"'},
    )


@router.post("/import-csv", response_model=ImportResult)
def import_raw_materials_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> ImportResult:
    return RawMaterialImportService(db).import_csv(file)


@router.get("/{id}", response_model=RawMaterialResponse)
def get_raw_material(id: UUID, db: Session = Depends(get_db_session)) -> RawMaterialResponse:
    return RawMaterialService(db).get(id)


@router.post("/", response_model=RawMaterialResponse, status_code=201)
def create_raw_material(
    payload: RawMaterialCreate, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).create(payload)


@router.put("/{id}", response_model=RawMaterialResponse)
def update_raw_material(
    id: UUID, payload: RawMaterialUpdate, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).update(id, payload)


@router.patch("/{id}/inativar", response_model=RawMaterialResponse)
def deactivate_raw_material(
    id: UUID, db: Session = Depends(get_db_session)
) -> RawMaterialResponse:
    return RawMaterialService(db).deactivate(id)
