from __future__ import annotations

import logging

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.item import Item, ItemType
from app.models.material_group import MaterialGroup
from app.models.raw_material import RawMaterial
from app.models.supplier import Supplier
from app.models.unit_of_measure import UnitOfMeasure
from app.schemas.import_result import ImportResult, ImportRowError
from app.services.csv_import import parse_csv, to_decimal

logger = logging.getLogger("app.raw_material.import")

REQUIRED = {"code", "description", "unit_of_measure_code", "material_group_code"}
OPTIONAL = {"supplier_code", "unidade_conversao_code", "peso_liquido", "notes"}
MAX_LEN = {"code": 60, "description": 255}


class RawMaterialImportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def import_csv(self, file: UploadFile) -> ImportResult:
        rows = parse_csv(file, REQUIRED)

        uoms = {c: i for c, i in self.db.execute(select(UnitOfMeasure.code, UnitOfMeasure.id)).all()}
        groups = {c: i for c, i in self.db.execute(select(MaterialGroup.code, MaterialGroup.id)).all()}
        suppliers = {c: i for c, i in self.db.execute(select(Supplier.code, Supplier.id)).all()}

        existing_codes = {
            c for (c,) in self.db.execute(select(Item.code).where(Item.code.in_(
                [r.get("code") for r in rows if r.get("code")]
            ))).all()
        }

        errors: list[ImportRowError] = []
        seen_codes: set[str] = set()
        prepared: list[tuple[dict, dict]] = []

        for idx, row in enumerate(rows, start=2):  # header is line 1
            code = row.get("code")
            description = row.get("description")
            uom_code = row.get("unit_of_measure_code")
            group_code = row.get("material_group_code")

            line_errors: list[ImportRowError] = []

            def err(field: str, message: str) -> None:
                line_errors.append(ImportRowError(line=idx, code=code, field=field, message=message))

            if not code:
                err("code", "Código obrigatório")
            elif len(code) > MAX_LEN["code"]:
                err("code", f"Máximo de {MAX_LEN['code']} caracteres")
            elif code in seen_codes:
                err("code", "Código duplicado dentro do CSV")
            elif code in existing_codes:
                err("code", "Código já cadastrado no sistema")

            if not description:
                err("description", "Descrição obrigatória")
            elif len(description) > MAX_LEN["description"]:
                err("description", f"Máximo de {MAX_LEN['description']} caracteres")

            uom_id = uoms.get(uom_code) if uom_code else None
            if not uom_code:
                err("unit_of_measure_code", "Unidade obrigatória")
            elif uom_id is None:
                err("unit_of_measure_code", f"Unidade '{uom_code}' não encontrada")

            group_id = groups.get(group_code) if group_code else None
            if not group_code:
                err("material_group_code", "Grupo obrigatório")
            elif group_id is None:
                err("material_group_code", f"Grupo '{group_code}' não encontrado")

            supplier_code = row.get("supplier_code")
            supplier_id = None
            if supplier_code:
                supplier_id = suppliers.get(supplier_code)
                if supplier_id is None:
                    err("supplier_code", f"Fornecedor '{supplier_code}' não encontrado")

            conv_code = row.get("unidade_conversao_code")
            conv_id = None
            if conv_code:
                conv_id = uoms.get(conv_code)
                if conv_id is None:
                    err("unidade_conversao_code", f"Unidade de conversão '{conv_code}' não encontrada")

            try:
                peso_liquido = to_decimal(row.get("peso_liquido"))
            except ValueError as exc:
                peso_liquido = None
                err("peso_liquido", str(exc))

            if line_errors:
                errors.extend(line_errors)
                continue

            assert code is not None and description is not None
            seen_codes.add(code)
            item_data = {
                "code": code,
                "description": description,
                "unit_of_measure_id": uom_id,
                "notes": row.get("notes"),
            }
            rm_data = {
                "material_group_id": group_id,
                "supplier_id": supplier_id,
                "unidade_conversao_id": conv_id,
                "peso_liquido": peso_liquido,
            }
            prepared.append((item_data, rm_data))

        if errors:
            return ImportResult(imported=0, errors=errors)

        try:
            for item_data, rm_data in prepared:
                item = Item(**item_data, type=ItemType.RAW_MATERIAL)
                self.db.add(item)
                self.db.flush()
                self.db.add(RawMaterial(item_id=item.id, **rm_data))
            self.db.commit()
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("raw_material_import_failed")
            return ImportResult(
                imported=0,
                errors=[ImportRowError(line=0, message=f"Falha ao salvar: {exc}")],
            )

        logger.info("raw_material_import_ok count=%d", len(prepared))
        return ImportResult(imported=len(prepared), errors=[])
