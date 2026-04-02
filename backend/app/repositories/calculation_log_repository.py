from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select

from app.models.calculation_execution_log import CalculationExecutionLog
from sqlalchemy.orm import Session


class CalculationLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> CalculationExecutionLog:
        log = CalculationExecutionLog(**data)
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_by_id(self, log_id: UUID) -> CalculationExecutionLog | None:
        return self.db.get(CalculationExecutionLog, log_id)

    def update(self, log_id: UUID, data: dict) -> CalculationExecutionLog:
        log = self.db.get(CalculationExecutionLog, log_id)
        if log is None:
            raise ValueError("Calculation log not found")
        for key, value in data.items():
            setattr(log, key, value)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_logs(
        self,
        *,
        skip: int,
        limit: int,
        status_filter=None,
        item_id_filter: UUID | None = None,
    ) -> list[CalculationExecutionLog]:
        stmt = select(CalculationExecutionLog).order_by(CalculationExecutionLog.started_at.desc())
        if status_filter is not None:
            stmt = stmt.where(CalculationExecutionLog.status == status_filter)
        if item_id_filter is not None:
            stmt = stmt.where(CalculationExecutionLog.root_item_id == item_id_filter)
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_logs(self, *, status_filter=None, item_id_filter: UUID | None = None) -> int:
        stmt = select(func.count()).select_from(CalculationExecutionLog)
        if status_filter is not None:
            stmt = stmt.where(CalculationExecutionLog.status == status_filter)
        if item_id_filter is not None:
            stmt = stmt.where(CalculationExecutionLog.root_item_id == item_id_filter)
        return int(self.db.scalar(stmt) or 0)
