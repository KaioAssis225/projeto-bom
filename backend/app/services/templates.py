from __future__ import annotations

import io

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


def build_template_xlsx(
    sheet_name: str,
    headers: list[str],
    example_row: list[str],
    column_widths: dict[str, int] | None = None,
) -> bytes:
    """Build an .xlsx file with a styled header row and one example row.

    The result is what the user will fill in and re-export as CSV (UTF-8, ;).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]  # Excel limit

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    center = Alignment(horizontal="center", vertical="center")

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        letter = get_column_letter(col_idx)
        ws.column_dimensions[letter].width = (column_widths or {}).get(header, max(14, len(header) + 4))

    for col_idx, value in enumerate(example_row, start=1):
        ws.cell(row=2, column=col_idx, value=value)

    ws.freeze_panes = "A2"

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
