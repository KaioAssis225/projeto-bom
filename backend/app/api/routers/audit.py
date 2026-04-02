from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.price import AuditPriceChangeResponse
from app.services.price_service import PriceService


router = APIRouter(tags=["auditoria"])


@router.get(
    "/precos/{item_id}",
    response_model=list[AuditPriceChangeResponse],
    summary="Consultar auditoria de preços",
    description="Retorna o histórico de alterações de preço registradas para um item.",
)
def get_price_audit_history(
    item_id: UUID,
    db: Session = Depends(get_db_session),
) -> list[AuditPriceChangeResponse]:
    service = PriceService(db)
    return service.get_audit_history(item_id)
