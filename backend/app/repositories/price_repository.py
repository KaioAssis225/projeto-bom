from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit_price_change import AuditPriceChange
from app.models.item_price_history import ItemPriceHistory


class PriceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_current_price(self, item_id: UUID) -> ItemPriceHistory | None:
        stmt = (
            select(ItemPriceHistory)
            .where(
                ItemPriceHistory.item_id == item_id,
                ItemPriceHistory.is_current.is_(True),
            )
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_price_at_date(self, item_id: UUID, reference_date: datetime) -> ItemPriceHistory | None:
        stmt = (
            select(ItemPriceHistory)
            .where(
                ItemPriceHistory.item_id == item_id,
                ItemPriceHistory.valid_from <= reference_date,
                ((ItemPriceHistory.valid_to.is_(None)) | (ItemPriceHistory.valid_to > reference_date)),
            )
            .order_by(ItemPriceHistory.valid_from.desc())
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_history(self, item_id: UUID, skip: int, limit: int) -> list[ItemPriceHistory]:
        stmt = (
            select(ItemPriceHistory)
            .where(ItemPriceHistory.item_id == item_id)
            .order_by(ItemPriceHistory.valid_from.desc(), ItemPriceHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_history(self, item_id: UUID) -> int:
        stmt = select(func.count()).select_from(ItemPriceHistory).where(ItemPriceHistory.item_id == item_id)
        return int(self.db.scalar(stmt) or 0)

    def set_price(
        self,
        item_id: UUID,
        price_value: Decimal,
        valid_from: datetime,
        created_by: str,
        reason: str | None,
    ) -> ItemPriceHistory:
        changed_reason = reason or "Price update"
        try:
            current = self.db.scalar(
                select(ItemPriceHistory)
                .where(
                    ItemPriceHistory.item_id == item_id,
                    ItemPriceHistory.is_current.is_(True),
                )
                .with_for_update()
            )

            old_price = current.price_value if current is not None else None
            old_valid_from = current.valid_from if current is not None else None
            old_valid_to = current.valid_to if current is not None else None

            if current is not None:
                current.is_current = False
                current.valid_to = valid_from

            audit = AuditPriceChange(
                item_id=item_id,
                old_price=old_price,
                new_price=price_value,
                old_valid_from=old_valid_from,
                old_valid_to=old_valid_to,
                new_valid_from=valid_from,
                changed_by=created_by,
                changed_reason=changed_reason,
            )
            self.db.add(audit)

            new_price = ItemPriceHistory(
                item_id=item_id,
                price_value=price_value,
                valid_from=valid_from,
                valid_to=None,
                is_current=True,
                changed_reason=changed_reason,
                created_by=created_by,
            )
            self.db.add(new_price)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(new_price)
        return new_price

    def get_prices_for_items_at_date(self, item_ids: list[UUID], reference_date: datetime) -> dict[UUID, Decimal]:
        if not item_ids:
            return {}

        stmt = (
            select(ItemPriceHistory)
            .where(
                ItemPriceHistory.item_id.in_(item_ids),
                ItemPriceHistory.valid_from <= reference_date,
                ((ItemPriceHistory.valid_to.is_(None)) | (ItemPriceHistory.valid_to > reference_date)),
            )
            .order_by(ItemPriceHistory.item_id.asc(), ItemPriceHistory.valid_from.desc())
        )

        rows = self.db.scalars(stmt).all()
        result: dict[UUID, Decimal] = {}
        for row in rows:
            if row.item_id not in result:
                result[row.item_id] = row.price_value
        return result

    def get_audit_history(self, item_id: UUID) -> list[AuditPriceChange]:
        stmt = (
            select(AuditPriceChange)
            .where(AuditPriceChange.item_id == item_id)
            .order_by(AuditPriceChange.changed_at.desc())
        )
        return list(self.db.scalars(stmt).all())
