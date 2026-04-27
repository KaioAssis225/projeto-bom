from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas.common import BaseSchema, PaginatedResponse


class BomCostImpactResponse(BaseSchema):
    id: UUID
    finished_product_item_id: UUID
    raw_material_item_id: UUID
    raw_material_code: str
    raw_material_description: str
    old_unit_price: Decimal | None
    new_unit_price: Decimal
    old_pa_cost: Decimal | None
    new_pa_cost: Decimal
    delta_cost: Decimal
    delta_percent: Decimal | None
    reference_date: datetime
    changed_by: str
    changed_reason: str | None
    created_at: datetime


BomCostImpactPaginatedResponse = PaginatedResponse[BomCostImpactResponse]
