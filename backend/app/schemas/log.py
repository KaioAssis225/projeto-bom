from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.models.calculation_execution_log import CalculationStatus
from app.schemas.common import BaseSchema, PaginatedResponse


class ExecutionLogResponse(BaseSchema):
    id: UUID
    requested_by: str
    root_item_id: UUID
    material_group_id: UUID | None
    simulation_reference: str | None
    request_payload: dict
    generated_file_name: str | None
    status: CalculationStatus
    message: str | None
    started_at: datetime
    finished_at: datetime | None
    duration_ms: int | None


ExecutionLogPaginatedResponse = PaginatedResponse[ExecutionLogResponse]
