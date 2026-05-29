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
    EstoqueMovimentoRecenteResponse,
    EstoqueMovimentoResponse,
    EstoqueSaidaPayload,
    PercentualAlertaPayload,
)

DEFAULT_PERCENTUAL_ALERTA = Decimal("0.80")


class EstoqueAluminioService:
    def __init__(self, db: Session) -> None:
        self.repository = EstoqueAluminioRepository(db)

    def _row_to_response(self, row: dict) -> EstoqueItemResponse:
        saldo_uom1 = Decimal(str(row["saldo_uom1"]))
        peso_liquido = row.get("peso_liquido")
        estoque_minimo = row.get("estoque_minimo")
        percentual_alerta_raw = row.get("percentual_alerta")

        saldo_uom2 = (
            (saldo_uom1 * Decimal(str(peso_liquido))) if peso_liquido is not None else None
        )

        percentual_alerta = (
            Decimal(str(percentual_alerta_raw)) if percentual_alerta_raw is not None else None
        )
        percentual_efetivo = percentual_alerta if percentual_alerta is not None else DEFAULT_PERCENTUAL_ALERTA

        if estoque_minimo is not None:
            estoque_minimo_dec = Decimal(str(estoque_minimo))
            abaixo_minimo = saldo_uom1 < estoque_minimo_dec
            limite_alerta = estoque_minimo_dec / percentual_efetivo
            proximo_vencer = (not abaixo_minimo) and (saldo_uom1 <= limite_alerta)
        else:
            estoque_minimo_dec = None
            abaixo_minimo = False
            limite_alerta = None
            proximo_vencer = False

        return EstoqueItemResponse(
            item_id=row["item_id"],
            code=row["code"],
            description=row["description"],
            uom=row["uom"],
            uom2=row.get("uom2"),
            saldo_uom1=saldo_uom1,
            saldo_uom2=saldo_uom2,
            estoque_minimo=estoque_minimo_dec,
            abaixo_minimo=abaixo_minimo,
            percentual_alerta=percentual_alerta,
            proximo_vencer=proximo_vencer,
            limite_alerta=limite_alerta,
        )

    def _require_item_in_group(self, group_id: UUID, item_id: UUID) -> None:
        if not self.repository.item_exists_in_group(group_id=group_id, item_id=item_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item não encontrado no grupo de estoque informado",
            )

    def list_items(self, group_id: UUID, skip: int, limit: int) -> EstoqueItemPaginatedResponse:
        rows = self.repository.list_items(group_id=group_id, skip=skip, limit=limit)
        total = self.repository.count_items(group_id=group_id)
        return EstoqueItemPaginatedResponse(
            items=[self._row_to_response(r) for r in rows],
            total=total,
            skip=skip,
            limit=limit,
        )

    def add_entrada(self, group_id: UUID, item_id: UUID, payload: EstoqueEntradaPayload, solicitante: str) -> EstoqueMovimentoResponse:
        self._require_item_in_group(group_id=group_id, item_id=item_id)
        mov = self.repository.add_movimento(
            item_id=item_id, tipo="entrada", quantidade=payload.quantidade, solicitante=solicitante,
        )
        return EstoqueMovimentoResponse.model_validate(mov)

    def add_saida(self, group_id: UUID, item_id: UUID, payload: EstoqueSaidaPayload, solicitante: str) -> EstoqueMovimentoResponse:
        self._require_item_in_group(group_id=group_id, item_id=item_id)
        mov = self.repository.add_movimento(
            item_id=item_id, tipo="saida", quantidade=payload.quantidade, solicitante=solicitante,
        )
        return EstoqueMovimentoResponse.model_validate(mov)

    def get_historico(self, group_id: UUID, item_id: UUID, skip: int, limit: int) -> EstoqueHistoricoPaginatedResponse:
        self._require_item_in_group(group_id=group_id, item_id=item_id)
        items = self.repository.list_historico(item_id=item_id, skip=skip, limit=limit)
        total = self.repository.count_historico(item_id=item_id)
        return EstoqueHistoricoPaginatedResponse(
            items=[EstoqueMovimentoResponse.model_validate(m) for m in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    def get_ultimos_movimentos(self, group_id: UUID, limit: int) -> list[EstoqueMovimentoRecenteResponse]:
        rows = self.repository.get_ultimos_movimentos(group_id=group_id, limit=limit)
        return [EstoqueMovimentoRecenteResponse(**r) for r in rows]

    def set_estoque_minimo(self, group_id: UUID, item_id: UUID, payload: EstoqueMinimoPayload) -> EstoqueItemResponse:
        self._require_item_in_group(group_id=group_id, item_id=item_id)
        self.repository.set_estoque_minimo(item_id=item_id, estoque_minimo=payload.estoque_minimo)
        row = self.repository.get_item(group_id=group_id, item_id=item_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Item não pôde ser recuperado após atualização")
        return self._row_to_response(row)

    def set_percentual_alerta(self, group_id: UUID, item_id: UUID, payload: PercentualAlertaPayload) -> EstoqueItemResponse:
        self._require_item_in_group(group_id=group_id, item_id=item_id)
        self.repository.set_percentual_alerta(
            item_id=item_id, percentual_alerta=payload.percentual_alerta
        )
        row = self.repository.get_item(group_id=group_id, item_id=item_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Item não pôde ser recuperado após atualização")
        return self._row_to_response(row)
