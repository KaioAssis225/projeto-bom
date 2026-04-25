from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException, UploadFile, status


def parse_csv(file: UploadFile, required_columns: set[str]) -> list[dict[str, str | None]]:
    """Read an UploadFile as UTF-8 (with optional BOM) CSV with ';' delimiter.

    Validates the header contains every column in ``required_columns``. Trims
    whitespace from every value and converts empty strings to ``None``.
    Returns rows as dicts keyed by header name.
    """
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Arquivo CSV vazio")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Arquivo deve estar em UTF-8") from exc

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    if reader.fieldnames is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="CSV sem cabeçalho")
    headers = {h.strip() for h in reader.fieldnames if h is not None}
    missing = required_columns - headers
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Colunas obrigatórias ausentes: {', '.join(sorted(missing))}",
        )

    rows: list[dict[str, str | None]] = []
    for row in reader:
        cleaned: dict[str, str | None] = {}
        for key, value in row.items():
            if key is None:
                continue
            if value is None:
                cleaned[key.strip()] = None
                continue
            stripped = value.strip()
            cleaned[key.strip()] = stripped if stripped else None
        rows.append(cleaned)
    return rows


def to_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(value.replace(",", "."))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"Valor decimal inválido: {value!r}") from exc
