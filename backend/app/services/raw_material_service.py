from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateCodeError, ItemNotFoundError
from app.models.item import Item
from app.repositories.material_group_repository import MaterialGroupRepository
from app.repositories.raw_material_repository import RawMaterialRepository
from app.repositories.supplier_repository import SupplierRepository
from app.repositories.unit_of_measure_repository import UnitOfMeasureRepository
from app.schemas.raw_material import (
    RawMaterialCreate,
    RawMaterialPaginatedResponse,
    RawMaterialResponse,
    RawMaterialUpdate,
)

logger = logging.getLogger("app.raw_material")

_ITEM_FIELDS = {"code", "description", "unit_of_measure_id", "notes", "active"}
_RM_FIELDS = {"material_group_id", "supplier_id", "unidade_conversao_id", "peso_liquido"}


def _to_response(item: Item) -> RawMaterialResponse:
    rm = item.raw_material
    return RawMaterialResponse(
        id=item.id,
        code=item.code,
        description=item.description,
        active=item.active,
        notes=item.notes,
        unit_of_measure_id=item.unit_of_measure_id,
        material_group_id=rm.material_group_id,
        supplier_id=rm.supplier_id,
        unidade_conversao_id=rm.unidade_conversao_id,
        peso_liquido=rm.peso_liquido,
        created_at=item.created_at,
        updated_at=item.updated_at,
        unit_of_measure=item.unit_of_measure,
        material_group=rm.material_group,
        supplier=rm.supplier,
        unidade_conversao=rm.unidade_conversao,
    )


class RawMaterialService:
    def __init__(self, db: Session) -> None:
        self.repository = RawMaterialRepository(db)
        self.uom_repo = UnitOfMeasureRepository(db)
        self.group_repo = MaterialGroupRepository(db)
        self.supplier_repo = SupplierRepository(db)

    def create(self, payload: RawMaterialCreate) -> RawMaterialResponse:
        if self.repository.get_by_code(payload.code) is not None:
            raise DuplicateCodeError("Código de matéria-prima já existe")
        self._validate(payload.unit_of_measure_id, payload.material_group_id,
                       payload.supplier_id, payload.unidade_conversao_id)
        data = payload.model_dump()
        item_data = {k: v for k, v in data.items() if k in _ITEM_FIELDS}
        rm_data = {k: v for k, v in data.items() if k in _RM_FIELDS}
        item = self.repository.create(item_data, rm_data)
        logger.info("RawMaterial created: id=%s code=%s", item.id, item.code)
        return _to_response(item)

    def get(self, item_id: UUID) -> RawMaterialResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        return _to_response(item)

    def list(
        self,
        skip: int,
        limit: int,
        active_only: bool = True,
        material_group_id: UUID | None = None,
        code_contains: str | None = None,
        description_contains: str | None = None,
    ) -> RawMaterialPaginatedResponse:
        items = self.repository.list_filtered(
            skip=skip, limit=limit, active_only=active_only,
            material_group_id=material_group_id,
            code_contains=code_contains, description_contains=description_contains,
        )
        total = self.repository.count_filtered(
            active_only=active_only, material_group_id=material_group_id,
            code_contains=code_contains, description_contains=description_contains,
        )
        return RawMaterialPaginatedResponse(
            items=[_to_response(i) for i in items],
            total=total, skip=skip, limit=limit,
        )

    def update(self, item_id: UUID, payload: RawMaterialUpdate) -> RawMaterialResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        self._validate(item.unit_of_measure_id, payload.material_group_id,
                       payload.supplier_id, payload.unidade_conversao_id)
        data = payload.model_dump(exclude_none=True)
        item_data = {k: v for k, v in data.items() if k in _ITEM_FIELDS}
        rm_data = {k: v for k, v in data.items() if k in _RM_FIELDS}
        # material_group_id is required on update — ensure it's present
        if "material_group_id" not in rm_data:
            rm_data["material_group_id"] = payload.material_group_id
        updated = self.repository.update(item_id, item_data, rm_data)
        logger.info("RawMaterial updated: id=%s code=%s", updated.id, updated.code)
        return _to_response(updated)

    def deactivate(self, item_id: UUID) -> RawMaterialResponse:
        item = self.repository.get_by_id(item_id)
        if item is None:
            raise ItemNotFoundError()
        deactivated = self.repository.deactivate(item_id)
        logger.info("RawMaterial deactivated: id=%s code=%s", deactivated.id, deactivated.code)
        return _to_response(deactivated)

    def _validate(
        self,
        uom_id: UUID,
        group_id: UUID,
        supplier_id: UUID | None,
        conversao_id: UUID | None,
    ) -> None:
        if self.uom_repo.get_by_id(uom_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unidade de medida não encontrada")
        if self.group_repo.get_by_id(group_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Grupo de matéria-prima não encontrado")
        if supplier_id is not None and self.supplier_repo.get_by_id(supplier_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Fornecedor não encontrado")
        if conversao_id is not None and self.uom_repo.get_by_id(conversao_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unidade de conversão não encontrada")
