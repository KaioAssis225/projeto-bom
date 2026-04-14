from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.calculation import BomBatchRequest, BomCalculationRequest, BomCostPreview, CalculationResponse
from app.services.calculation_service import CalculationService


router = APIRouter(tags=["calculos"])


@router.get(
    "/{item_id}/custo-bom",
    response_model=BomCostPreview,
    summary="Prévia do custo BOM",
    description="Retorna o custo total da BOM para quantidade 1 sem gerar Excel nem gravar log de execução.",
)
def get_bom_cost_preview(
    item_id: UUID,
    db: Session = Depends(get_db_session),
) -> BomCostPreview:
    service = CalculationService(db)
    return service.get_bom_cost_preview(item_id)


@router.post(
    "/produto",
    response_model=CalculationResponse,
    summary="Calcular custo de um produto",
    description="Explode a BOM de um produto, aplica preços vigentes e gera o arquivo Excel consolidado.",
)
def calculate_product(
    payload: BomCalculationRequest,
    db: Session = Depends(get_db_session),
) -> CalculationResponse:
    service = CalculationService(db)
    return service.calculate_product(payload)


@router.post(
    "/lote",
    response_model=CalculationResponse,
    summary="Calcular custo em lote",
    description="Acumula quantidades de vários produtos antes de calcular custo e exportar o resultado.",
)
def calculate_batch(
    payload: BomBatchRequest,
    db: Session = Depends(get_db_session),
) -> CalculationResponse:
    service = CalculationService(db)
    return service.calculate_batch(payload)


@router.get(
    "/download/{filename}",
    summary="Baixar arquivo de cálculo",
    description="Realiza o download do arquivo Excel gerado em uma execução de cálculo.",
)
def download_calculation_file(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    file_path = Path("exports") / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
