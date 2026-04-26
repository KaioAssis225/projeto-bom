from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.calculation import (
    BomBatchRequest,
    BomCalculationRequest,
    BomCostAnalysis,
    BomCostPreview,
    CalculationResponse,
)
from app.services.calculation_service import CalculationService
from app.services.templates import build_consumption_xlsx


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


@router.get(
    "/{item_id}/custo-bom-analise",
    response_model=BomCostAnalysis,
    summary="Análise detalhada do custo BOM",
    description="Retorna linhas da BOM com custo por item e por grupo. Tolerante a MPs sem preço vigente (price=0 + lista missing_prices).",
)
def get_bom_cost_analysis(
    item_id: UUID,
    db: Session = Depends(get_db_session),
) -> BomCostAnalysis:
    service = CalculationService(db)
    return service.get_bom_cost_analysis(item_id)


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


@router.post(
    "/lote/consumo-mp-xlsx",
    summary="Excel de consumo de matéria-prima",
    description="Roda o cálculo em lote e devolve um .xlsx agrupado por grupo, sem custos, com colunas UN1/QTD UN1 e UN2/QTD UN2 (esta última quando a MP tem unidade de conversão e peso_liquido).",
)
def calculate_batch_consumo_xlsx(
    payload: BomBatchRequest,
    db: Session = Depends(get_db_session),
) -> Response:
    service = CalculationService(db)
    response = service.calculate_batch(payload)
    content = build_consumption_xlsx(response.linhas)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="consumo-materia-prima.xlsx"'
        },
    )


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
