from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ItemNotFoundError
from app.core.time import now_sp
from app.models.calculation_execution_log import CalculationStatus
from app.repositories.calculation_log_repository import CalculationLogRepository
from app.schemas.log import ExecutionLogPaginatedResponse


class ExecutionLogService:
    def __init__(self, db: Session) -> None:
        self.repository = CalculationLogRepository(db)

    def start_log(
        self,
        *,
        requested_by: str,
        root_item_id: UUID,
        group_id: UUID | None,
        payload: dict,
        reference: str | None,
    ) -> UUID:
        started_at = now_sp().replace(tzinfo=None)
        log = self.repository.create(
            {
                "requested_by": requested_by,
                "root_item_id": root_item_id,
                "material_group_id": group_id,
                "simulation_reference": reference,
                "request_payload": payload,
                "generated_file_name": None,
                "status": CalculationStatus.PARTIAL,
                "message": None,
                "started_at": started_at,
                "finished_at": None,
                "duration_ms": None,
            }
        )
        return log.id

    def finish_log(
        self,
        log_id: UUID,
        status: CalculationStatus,
        file_name: str | None,
        message: str | None,
        duration_ms: int,
    ):
        finished_at = now_sp().replace(tzinfo=None)
        return self.repository.update(
            log_id,
            {
                "status": status,
                "generated_file_name": file_name,
                "message": message,
                "finished_at": finished_at,
                "duration_ms": duration_ms,
            },
        )

    def get(self, log_id: UUID):
        log = self.repository.get_by_id(log_id)
        if log is None:
            raise ItemNotFoundError("Log not found")
        return log

    def list_logs(
        self,
        *,
        skip: int,
        limit: int,
        status_filter: CalculationStatus | None,
        item_id_filter: UUID | None,
    ) -> ExecutionLogPaginatedResponse:
        items = self.repository.list_logs(
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            item_id_filter=item_id_filter,
        )
        total = self.repository.count_logs(
            status_filter=status_filter,
            item_id_filter=item_id_filter,
        )
        return ExecutionLogPaginatedResponse(items=items, total=total, skip=skip, limit=limit)
