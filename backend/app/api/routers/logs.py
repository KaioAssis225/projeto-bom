from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.calculation_execution_log import CalculationStatus
from app.schemas.log import ExecutionLogPaginatedResponse, ExecutionLogResponse
from app.services.execution_log_service import ExecutionLogService


router = APIRouter(tags=["logs"])


@router.get(
    "",
    response_model=ExecutionLogPaginatedResponse,
    summary="Listar logs de execução",
    description="Retorna logs paginados das execuções de cálculo com filtros opcionais.",
)
def list_logs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    status: CalculationStatus | None = Query(default=None),
    item_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> ExecutionLogPaginatedResponse:
    service = ExecutionLogService(db)
    return service.list_logs(
        skip=skip,
        limit=limit,
        status_filter=status,
        item_id_filter=item_id,
    )


@router.get(
    "/{log_id}",
    response_model=ExecutionLogResponse,
    summary="Consultar log de execução",
    description="Retorna os detalhes de uma execução de cálculo pelo identificador do log.",
)
def get_log(
    log_id: UUID,
    db: Session = Depends(get_db_session),
) -> ExecutionLogResponse:
    service = ExecutionLogService(db)
    return service.get(log_id)
