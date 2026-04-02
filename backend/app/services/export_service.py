from __future__ import annotations

from pathlib import Path

from app.domain.bom_calculator import CalculationLine
from app.utils.excel_builder import BomExcelBuilder


class ExportService:
    def __init__(self) -> None:
        self.base_dir = Path("exports")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def export(self, lines: list[CalculationLine], params: dict) -> str:
        builder = BomExcelBuilder(
            lines=lines,
            params=params,
            product_data=params["product_data"],
            output_dir=self.base_dir,
        )
        return builder.build()
