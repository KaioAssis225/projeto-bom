from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.estoque_aluminio_repository import EstoqueAluminioRepository
from app.schemas.estoque_aluminio import (
    EstoqueEntradaPayload,
    EstoqueHistoricoPaginatedResponse,
    EstoqueItemPaginatedResponse,
    EstoqueItemResponse,
    EstoqueMinimoPayload,
    EstoqueMovimentoResponse,
    EstoqueSaidaPayload,
)


class EstoqueAluminioService:
    def __init__(self, db: Session) -> None:
        self.repository = EstoqueAluminioRepository(db)

    def _row_to_response(self, row: dict) -> EstoqueItemResponse:
        saldo_uom1 = Decimal(str(row["saldo_uom1"]))
        peso_liquido = row.get("peso_liquido")
        estoque_minimo = row.get("estoque_minimo")
        saldo_uom2 = (
            (saldo_uom1 * Decimal(str(peso_liquido))) if peso_liquido is not None else None
        )
        abaixo_minimo = (
            (saldo_uom1 < Decimal(str(estoque_minimo))) if estoque_minimo is not None else False
        )
        return EstoqueItemResponse(
            item_id=row["item_id"],
            code=row["code"],
            description=row["description"],
            uom=row["uom"],
            uom2=row.get("uom2"),
            saldo_uom1=saldo_uom1,
            saldo_uom2=saldo_uom2,
            estoque_minimo=Decimal(str(estoque_minimo)) if estoque_minimo is not None else None,
            abaixo_minimo=abaixo_minimo,
        )

    def _require_alu_item(self, item_id: UUID) -> None:
        if not self.repository.item_exists_in_alu(item_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item ALU não encontrado",
            )

    def list_items(self, skip: int, limit: int) -> EstoqueItemPaginatedResponse:
        rows = self.repository.list_items(skip=skip, limit=limit)
        total = self.repository.count_items()
        return EstoqueItemPaginatedResponse(
            items=[self._row_to_response(r) for r in rows],
            total=total,
            skip=skip,
            limit=limit,
        )

    def add_entrada(self, item_id: UUID, payload: EstoqueEntradaPayload) -> EstoqueMovimentoResponse:
        self._require_alu_item(item_id)
        mov = self.repository.add_movimento(
            item_id=item_id,
            tipo="entrada",
            quantidade=payload.quantidade,
            solicitante=None,
        )
        return EstoqueMovimentoResponse.model_validate(mov)

    def add_saida(self, item_id: UUID, payload: EstoqueSaidaPayload) -> EstoqueMovimentoResponse:
        self._require_alu_item(item_id)
        mov = self.repository.add_movimento(
            item_id=item_id,
            tipo="saida",
            quantidade=payload.quantidade,
            solicitante=payload.solicitante,
        )
        return EstoqueMovimentoResponse.model_validate(mov)

    def get_historico(
        self, item_id: UUID, skip: int, limit: int
    ) -> EstoqueHistoricoPaginatedResponse:
        self._require_alu_item(item_id)
        items = self.repository.list_historico(item_id=item_id, skip=skip, limit=limit)
        total = self.repository.count_historico(item_id=item_id)
        return EstoqueHistoricoPaginatedResponse(
            items=[EstoqueMovimentoResponse.model_validate(m) for m in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    def set_estoque_minimo(
        self, item_id: UUID, payload: EstoqueMinimoPayload
    ) -> EstoqueItemResponse:
        self._require_alu_item(item_id)
        self.repository.set_estoque_minimo(
            item_id=item_id, estoque_minimo=payload.estoque_minimo
        )
        row = self.repository.get_item(item_id)
        assert row is not None
        return self._row_to_response(row)
