from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import InactiveItemError, ItemNotFoundError, PriceNotFoundError
from app.repositories.item_repository import ItemRepository
from app.repositories.price_repository import PriceRepository
from app.schemas.price import (
    AuditPriceChangeResponse,
    CurrentPriceResponse,
    PriceCreate,
    PriceHistoryPaginatedResponse,
)


logger = logging.getLogger("app.price")


class PriceService:
    def __init__(self, db: Session) -> None:
        self.item_repository = ItemRepository(db)
        self.repository = PriceRepository(db)

    def set_price(self, payload: PriceCreate):
        item = self.item_repository.get_by_id(payload.item_id)
        if item is None:
            raise ItemNotFoundError()
        if not item.active:
            raise InactiveItemError("Price can only be set for active items")

        price = self.repository.set_price(
            item_id=payload.item_id,
            price_value=payload.price_value,
            valid_from=payload.valid_from,
            created_by=payload.created_by,
            reason=payload.changed_reason,
        )
        logger.info(
            "price_set",
            extra={
                "extra_data": {
                    "item_id": str(payload.item_id),
                    "price_value": str(payload.price_value),
                    "valid_from": payload.valid_from.isoformat(),
                    "created_by": payload.created_by,
                }
            },
        )
        return price

    def get_current(self, item_id: UUID) -> CurrentPriceResponse:
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()

        current = self.repository.get_current_price(item_id)
        if current is None:
            raise PriceNotFoundError("Current price not found")

        return CurrentPriceResponse(
            item_id=current.item_id,
            price_value=current.price_value,
            valid_from=current.valid_from,
            created_by=current.created_by,
        )

    def get_history(self, item_id: UUID, skip: int, limit: int) -> PriceHistoryPaginatedResponse:
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()

        items = self.repository.get_history(item_id=item_id, skip=skip, limit=limit)
        total = self.repository.count_history(item_id=item_id)
        return PriceHistoryPaginatedResponse(items=items, total=total, skip=skip, limit=limit)

    def get_price_at(self, item_id: UUID, reference_date: datetime):
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()

        price = self.repository.get_price_at_date(item_id=item_id, reference_date=reference_date)
        if price is None:
            raise PriceNotFoundError("Price not found for the reference date")

        return CurrentPriceResponse(
            item_id=price.item_id,
            price_value=price.price_value,
            valid_from=price.valid_from,
            created_by=price.created_by,
        )

    def get_audit_history(self, item_id: UUID) -> list[AuditPriceChangeResponse]:
        item = self.item_repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        audits = self.repository.get_audit_history(item_id)
        return [AuditPriceChangeResponse.model_validate(audit) for audit in audits]
