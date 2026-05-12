# Dimensões do Produto Acabado (L × P × H mm) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campos `largura_mm`, `profundidade_mm` e `altura_mm` (Numeric, nullable) ao cadastro de Produto Acabado — banco, schemas, import CSV e UI.

**Architecture:** Migration Alembic adiciona 3 colunas à tabela `finished_product`. Model + schemas Pydantic propagam os campos. Frontend ganha inputs no modal e coluna na tabela. Import CSV suporta as 3 novas colunas opcionais.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic · React/TypeScript/Tailwind · Zod (form validation)

---

## File Map

| Arquivo | Ação |
|---|---|
| `backend/alembic/versions/20260512_0009_add_dimensoes_finished_product.py` | Criar — migration |
| `backend/app/models/finished_product.py` | Editar — 3 colunas |
| `backend/app/schemas/finished_product.py` | Editar — 3 campos nos schemas |
| `backend/app/services/finished_product_import_service.py` | Editar — parse + persist dimensões |
| `backend/app/api/routers/finished_product.py` | Editar — template CSV |
| `frontend/src/types/index.ts` | Editar — 3 campos nos tipos TS |
| `frontend/src/pages/ProdutosAcabadosTab.tsx` | Editar — form + tabela |

---

## Task 1: Migration Alembic

**Files:**
- Create: `backend/alembic/versions/20260512_0009_add_dimensoes_finished_product.py`

- [ ] **Step 1: Criar o arquivo de migração**

```python
"""add dimensoes to finished_product

Revision ID: 20260512_0009
Revises: 20260427_0008
Create Date: 2026-05-12
"""
from alembic import op

revision = "20260512_0009"
down_revision = "20260427_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE finished_product
            ADD COLUMN IF NOT EXISTS largura_mm     NUMERIC(10, 2) NULL,
            ADD COLUMN IF NOT EXISTS profundidade_mm NUMERIC(10, 2) NULL,
            ADD COLUMN IF NOT EXISTS altura_mm      NUMERIC(10, 2) NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE finished_product
            DROP COLUMN IF EXISTS largura_mm,
            DROP COLUMN IF EXISTS profundidade_mm,
            DROP COLUMN IF EXISTS altura_mm
        """
    )
```

- [ ] **Step 2: Aplicar a migration**

```bash
cd backend
alembic upgrade head
```

Saída esperada: `Running upgrade 20260427_0008 -> 20260512_0009, add dimensoes to finished_product`

- [ ] **Step 3: Confirmar colunas no banco**

```bash
psql $DATABASE_URL -c "\d finished_product"
```

Esperado: colunas `largura_mm`, `profundidade_mm`, `altura_mm` listadas como `numeric(10,2)`.

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/20260512_0009_add_dimensoes_finished_product.py
git commit -m "feat: migration add dimensoes (L/P/H mm) to finished_product"
```

---

## Task 2: Model + Schemas

**Files:**
- Modify: `backend/app/models/finished_product.py`
- Modify: `backend/app/schemas/finished_product.py`

- [ ] **Step 1: Escrever teste que falha — schema aceita e retorna as dimensões**

```python
# backend/tests/test_finished_product_schema.py
from decimal import Decimal
from app.schemas.finished_product import FinishedProductCreate, FinishedProductUpdate


def test_create_schema_accepts_dimensoes():
    payload = FinishedProductCreate(
        code="PA001",
        description="Produto Teste",
        unit_of_measure_id="10000000-0000-0000-0000-000000000001",
        largura_mm=Decimal("100.50"),
        profundidade_mm=Decimal("50.00"),
        altura_mm=Decimal("30.25"),
    )
    assert payload.largura_mm == Decimal("100.50")
    assert payload.profundidade_mm == Decimal("50.00")
    assert payload.altura_mm == Decimal("30.25")


def test_create_schema_allows_null_dimensoes():
    payload = FinishedProductCreate(
        code="PA002",
        description="Produto Sem Dimensões",
        unit_of_measure_id="10000000-0000-0000-0000-000000000001",
    )
    assert payload.largura_mm is None
    assert payload.profundidade_mm is None
    assert payload.altura_mm is None


def test_update_schema_accepts_dimensoes():
    payload = FinishedProductUpdate(
        description="Atualizado",
        active=True,
        largura_mm=Decimal("200.00"),
        profundidade_mm=None,
        altura_mm=Decimal("80.00"),
    )
    assert payload.largura_mm == Decimal("200.00")
    assert payload.altura_mm == Decimal("80.00")
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
cd backend
pytest tests/test_finished_product_schema.py -v
```

Esperado: `AttributeError: 'FinishedProductCreate' object has no attribute 'largura_mm'`

- [ ] **Step 3: Atualizar o model**

```python
# backend/app/models/finished_product.py
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.item import Item


class FinishedProduct(Base):
    __tablename__ = "finished_product"

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), primary_key=True
    )
    peso_liquido: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    catalogo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    linha: Mapped[str | None] = mapped_column(String(120), nullable=True)
    designer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    largura_mm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    profundidade_mm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    altura_mm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    item: Mapped["Item"] = relationship(back_populates="finished_product")
```

- [ ] **Step 4: Atualizar os schemas**

```python
# backend/app/schemas/finished_product.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class FinishedProductCreate(BaseSchema):
    code: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    unit_of_measure_id: UUID
    notes: str | None = None
    peso_liquido: Decimal | None = None
    catalogo: str | None = Field(default=None, max_length=120)
    linha: str | None = Field(default=None, max_length=120)
    designer: str | None = Field(default=None, max_length=120)
    largura_mm: Decimal | None = None
    profundidade_mm: Decimal | None = None
    altura_mm: Decimal | None = None


class FinishedProductUpdate(BaseSchema):
    description: str = Field(min_length=1, max_length=255)
    active: bool
    notes: str | None = None
    peso_liquido: Decimal | None = None
    catalogo: str | None = Field(default=None, max_length=120)
    linha: str | None = Field(default=None, max_length=120)
    designer: str | None = Field(default=None, max_length=120)
    largura_mm: Decimal | None = None
    profundidade_mm: Decimal | None = None
    altura_mm: Decimal | None = None


class _UomSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str


class FinishedProductResponse(BaseSchema):
    id: UUID
    code: str
    description: str
    active: bool
    notes: str | None
    unit_of_measure_id: UUID
    peso_liquido: Decimal | None
    catalogo: str | None
    linha: str | None
    designer: str | None
    largura_mm: Decimal | None
    profundidade_mm: Decimal | None
    altura_mm: Decimal | None
    created_at: datetime
    updated_at: datetime
    unit_of_measure: _UomSummary


FinishedProductPaginatedResponse = PaginatedResponse[FinishedProductResponse]
```

- [ ] **Step 5: Rodar o teste para confirmar que passa**

```bash
cd backend
pytest tests/test_finished_product_schema.py -v
```

Esperado: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/finished_product.py backend/app/schemas/finished_product.py backend/tests/test_finished_product_schema.py
git commit -m "feat: add largura/profundidade/altura_mm to FinishedProduct model and schemas"
```

---

## Task 3: Import CSV — serviço + template

**Files:**
- Modify: `backend/app/services/finished_product_import_service.py`
- Modify: `backend/app/api/routers/finished_product.py`

- [ ] **Step 1: Escrever teste que falha — import com dimensões**

```python
# backend/tests/test_finished_product_import.py
import io
from unittest.mock import MagicMock
from fastapi import UploadFile
from app.services.finished_product_import_service import FinishedProductImportService


def _make_upload(content: str) -> UploadFile:
    f = MagicMock(spec=UploadFile)
    f.file = io.BytesIO(content.encode("utf-8-sig"))
    return f


def _make_db_with_uom():
    db = MagicMock()
    # UoM lookup returns {"UN": <uuid>}
    import uuid
    uom_id = uuid.uuid4()
    db.execute.return_value.all.return_value = [("UN", uom_id)]
    db.scalars.return_value.all.return_value = []
    return db, uom_id


def test_import_with_dimensoes():
    csv_content = (
        "code;description;unit_of_measure_code;largura_mm;profundidade_mm;altura_mm\r\n"
        "PA001;Produto Teste;UN;100,50;50,00;30,25\r\n"
    )
    db, uom_id = _make_db_with_uom()
    # mock existing codes query
    db.execute.side_effect = [
        MagicMock(all=lambda: [("UN", uom_id)]),   # UoM lookup
        MagicMock(all=lambda: []),                  # existing codes
    ]
    db.flush = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()

    upload = _make_upload(csv_content)
    service = FinishedProductImportService(db)
    result = service.import_csv(upload)

    assert result.errors == []
    assert result.imported == 1
    # Check FinishedProduct was added with correct dimensions
    fp_call_args = db.add.call_args_list[1][0][0]  # second add() is FinishedProduct
    from decimal import Decimal
    assert fp_call_args.largura_mm == Decimal("100.50")
    assert fp_call_args.profundidade_mm == Decimal("50.00")
    assert fp_call_args.altura_mm == Decimal("30.25")


def test_import_dimensoes_optional():
    csv_content = (
        "code;description;unit_of_measure_code\r\n"
        "PA002;Sem Dimensoes;UN\r\n"
    )
    db, uom_id = _make_db_with_uom()
    db.execute.side_effect = [
        MagicMock(all=lambda: [("UN", uom_id)]),
        MagicMock(all=lambda: []),
    ]
    db.flush = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()

    upload = _make_upload(csv_content)
    service = FinishedProductImportService(db)
    result = service.import_csv(upload)

    assert result.errors == []
    assert result.imported == 1
    fp_call_args = db.add.call_args_list[1][0][0]
    assert fp_call_args.largura_mm is None
    assert fp_call_args.profundidade_mm is None
    assert fp_call_args.altura_mm is None
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
cd backend
pytest tests/test_finished_product_import.py -v
```

Esperado: `KeyError` ou `AssertionError` — dimensões não salvas.

- [ ] **Step 3: Atualizar o import service**

```python
# backend/app/services/finished_product_import_service.py
from __future__ import annotations

import logging

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.finished_product import FinishedProduct
from app.models.item import Item, ItemType
from app.models.unit_of_measure import UnitOfMeasure
from app.schemas.import_result import ImportResult, ImportRowError
from app.services.csv_import import parse_csv, to_decimal

logger = logging.getLogger("app.finished_product.import")

REQUIRED = {"code", "description", "unit_of_measure_code"}
MAX_LEN = {"code": 60, "description": 255, "catalogo": 120, "linha": 120, "designer": 120}


class FinishedProductImportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def import_csv(self, file: UploadFile) -> ImportResult:
        rows = parse_csv(file, REQUIRED)

        uoms = {c: i for c, i in self.db.execute(select(UnitOfMeasure.code, UnitOfMeasure.id)).all()}
        existing_codes = {
            c for (c,) in self.db.execute(select(Item.code).where(Item.code.in_(
                [r.get("code") for r in rows if r.get("code")]
            ))).all()
        }

        errors: list[ImportRowError] = []
        seen_codes: set[str] = set()
        prepared: list[tuple[dict, dict]] = []

        for idx, row in enumerate(rows, start=2):
            code = row.get("code")
            description = row.get("description")
            uom_code = row.get("unit_of_measure_code")

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

            for f in ("catalogo", "linha", "designer"):
                v = row.get(f)
                if v and len(v) > MAX_LEN[f]:
                    err(f, f"Máximo de {MAX_LEN[f]} caracteres")

            try:
                peso_liquido = to_decimal(row.get("peso_liquido"))
            except ValueError as exc:
                peso_liquido = None
                err("peso_liquido", str(exc))

            largura_mm = profundidade_mm = altura_mm = None
            for dim_field in ("largura_mm", "profundidade_mm", "altura_mm"):
                try:
                    locals()[dim_field]  # noqa — assigned below
                except Exception:
                    pass
            try:
                largura_mm = to_decimal(row.get("largura_mm"))
            except ValueError as exc:
                err("largura_mm", str(exc))
            try:
                profundidade_mm = to_decimal(row.get("profundidade_mm"))
            except ValueError as exc:
                err("profundidade_mm", str(exc))
            try:
                altura_mm = to_decimal(row.get("altura_mm"))
            except ValueError as exc:
                err("altura_mm", str(exc))

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
            fp_data = {
                "peso_liquido": peso_liquido,
                "catalogo": row.get("catalogo"),
                "linha": row.get("linha"),
                "designer": row.get("designer"),
                "largura_mm": largura_mm,
                "profundidade_mm": profundidade_mm,
                "altura_mm": altura_mm,
            }
            prepared.append((item_data, fp_data))

        if errors:
            return ImportResult(imported=0, errors=errors)

        try:
            for item_data, fp_data in prepared:
                item = Item(**item_data, type=ItemType.FINISHED_PRODUCT)
                self.db.add(item)
                self.db.flush()
                self.db.add(FinishedProduct(item_id=item.id, **fp_data))
            self.db.commit()
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("finished_product_import_failed")
            return ImportResult(
                imported=0,
                errors=[ImportRowError(line=0, message=f"Falha ao salvar: {exc}")],
            )

        logger.info("finished_product_import_ok count=%d", len(prepared))
        return ImportResult(imported=len(prepared), errors=[])
```

> **Nota:** O bloco `try/except` com `locals()` acima é um artefato do processo de escrita — substitua por atribuições simples como o trecho abaixo. O código correto é:

```python
            largura_mm = None
            profundidade_mm = None
            altura_mm = None
            try:
                largura_mm = to_decimal(row.get("largura_mm"))
            except ValueError as exc:
                err("largura_mm", str(exc))
            try:
                profundidade_mm = to_decimal(row.get("profundidade_mm"))
            except ValueError as exc:
                err("profundidade_mm", str(exc))
            try:
                altura_mm = to_decimal(row.get("altura_mm"))
            except ValueError as exc:
                err("altura_mm", str(exc))
```

- [ ] **Step 4: Atualizar o template CSV no router**

Em `backend/app/api/routers/finished_product.py`, alterar `_HEADERS` e `_EXAMPLE`:

```python
_HEADERS = [
    "code", "description", "unit_of_measure_code",
    "peso_liquido", "catalogo", "linha", "designer",
    "largura_mm", "profundidade_mm", "altura_mm", "notes",
]
_EXAMPLE = [
    "PA001", "EXEMPLO PRODUTO ACABADO", "UN",
    "0,500", "CAT-2026", "Premium", "Designer X",
    "100,00", "50,00", "30,00", "observacao opcional",
]
```

- [ ] **Step 5: Rodar testes**

```bash
cd backend
pytest tests/test_finished_product_import.py -v
```

Esperado: `2 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/finished_product_import_service.py \
        backend/app/api/routers/finished_product.py \
        backend/tests/test_finished_product_import.py
git commit -m "feat: import CSV suporta largura/profundidade/altura_mm em produtos acabados"
```

---

## Task 4: Frontend — Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Adicionar os 3 campos aos tipos**

Nos três interfaces em `frontend/src/types/index.ts`, adicionar após `designer`:

```typescript
// Na interface FinishedProduct (linha ~187):
export interface FinishedProduct {
  id: string;
  code: string;
  description: string;
  active: boolean;
  notes?: string | null;
  unit_of_measure_id: string;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
  largura_mm?: number | null;
  profundidade_mm?: number | null;
  altura_mm?: number | null;
  created_at: string;
  updated_at: string;
  unit_of_measure?: { id: string; code: string };
}

// Na interface FinishedProductCreatePayload (linha ~200):
export interface FinishedProductCreatePayload {
  code: string;
  description: string;
  unit_of_measure_id: string;
  notes?: string | null;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
  largura_mm?: number | null;
  profundidade_mm?: number | null;
  altura_mm?: number | null;
}

// Na interface FinishedProductUpdatePayload (linha ~212):
export interface FinishedProductUpdatePayload {
  description: string;
  active: boolean;
  notes?: string | null;
  peso_liquido?: number | null;
  catalogo?: string | null;
  linha?: string | null;
  designer?: string | null;
  largura_mm?: number | null;
  profundidade_mm?: number | null;
  altura_mm?: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add largura/profundidade/altura_mm to FinishedProduct TS types"
```

---

## Task 5: Frontend — Formulário e Tabela

**Files:**
- Modify: `frontend/src/pages/ProdutosAcabadosTab.tsx`

- [ ] **Step 1: Adicionar campos ao schema Zod**

Dentro de `produtoSchema` (linha ~25), adicionar após `designer`:

```typescript
const produtoSchema = z.object({
  code: z.string().trim().min(1, "Informe o código").max(60, "Máximo de 60 caracteres"),
  description: z.string().trim().min(1, "Informe a descrição").max(255, "Máximo de 255 caracteres"),
  active: z.boolean(),
  peso_liquido: z.number().positive("Deve ser maior que zero").optional().nullable(),
  catalogo: z.string().max(120).optional().nullable(),
  linha: z.string().max(120).optional().nullable(),
  designer: z.string().max(120).optional().nullable(),
  largura_mm: z.number().positive("Deve ser maior que zero").optional().nullable(),
  profundidade_mm: z.number().positive("Deve ser maior que zero").optional().nullable(),
  altura_mm: z.number().positive("Deve ser maior que zero").optional().nullable(),
});
```

- [ ] **Step 2: Atualizar defaultValues e os dois form.reset**

No `useForm` defaultValues e nos dois `form.reset(...)` (fecha modal e abre com item), adicionar:

```typescript
largura_mm: null,
profundidade_mm: null,
altura_mm: null,
```

Ao reset com item existente:
```typescript
largura_mm: item?.largura_mm ?? null,
profundidade_mm: item?.profundidade_mm ?? null,
altura_mm: item?.altura_mm ?? null,
```

- [ ] **Step 3: Atualizar onSubmit para create e update**

No bloco `updateItem.mutateAsync`:
```typescript
largura_mm: values.largura_mm ?? undefined,
profundidade_mm: values.profundidade_mm ?? undefined,
altura_mm: values.altura_mm ?? undefined,
```

No bloco `createItem.mutateAsync`:
```typescript
largura_mm: values.largura_mm ?? undefined,
profundidade_mm: values.profundidade_mm ?? undefined,
altura_mm: values.altura_mm ?? undefined,
```

- [ ] **Step 4: Adicionar linha de inputs L / P / H no formulário**

Inserir após o bloco `{/* Designer + Peso */}` (depois do `</div>` que fecha o grid, linha ~262) e antes de `{/* Status */}`:

```tsx
{/* Dimensões */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700">
    Dimensões (mm)
  </label>
  <div className="grid grid-cols-3 gap-3">
    <div className="space-y-1">
      <label htmlFor="pa-largura" className="text-xs text-slate-500">
        L — Largura
      </label>
      <input
        id="pa-largura"
        type="number"
        step="0.01"
        min="0"
        disabled={isSubmitting}
        placeholder="0,00"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        {...form.register("largura_mm", {
          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
        })}
      />
      {form.formState.errors.largura_mm ? (
        <p className="text-xs text-red-600">{form.formState.errors.largura_mm.message}</p>
      ) : null}
    </div>

    <div className="space-y-1">
      <label htmlFor="pa-profundidade" className="text-xs text-slate-500">
        P — Profundidade
      </label>
      <input
        id="pa-profundidade"
        type="number"
        step="0.01"
        min="0"
        disabled={isSubmitting}
        placeholder="0,00"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        {...form.register("profundidade_mm", {
          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
        })}
      />
      {form.formState.errors.profundidade_mm ? (
        <p className="text-xs text-red-600">{form.formState.errors.profundidade_mm.message}</p>
      ) : null}
    </div>

    <div className="space-y-1">
      <label htmlFor="pa-altura" className="text-xs text-slate-500">
        H — Altura
      </label>
      <input
        id="pa-altura"
        type="number"
        step="0.01"
        min="0"
        disabled={isSubmitting}
        placeholder="0,00"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        {...form.register("altura_mm", {
          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
        })}
      />
      {form.formState.errors.altura_mm ? (
        <p className="text-xs text-red-600">{form.formState.errors.altura_mm.message}</p>
      ) : null}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Adicionar coluna Dimensões na tabela**

Adicionar helper function antes do componente `ProdutosAcabadosTab` (ou junto das outras helpers, no topo):

```typescript
function formatDimensoes(item: FinishedProduct): string {
  const parts = [
    item.largura_mm != null ? String(item.largura_mm) : null,
    item.profundidade_mm != null ? String(item.profundidade_mm) : null,
    item.altura_mm != null ? String(item.altura_mm) : null,
  ].filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.join(" × ") + " mm";
}
```

No `<thead>`, após o `<th>` de Peso e antes de Catálogo:

```tsx
<th className="px-4 py-3 text-left font-semibold text-slate-600">Dimensões</th>
```

No `<tbody>`, após o `<td>` de Peso e antes de Catálogo:

```tsx
<td className="px-4 py-3 text-slate-600 tabular-nums">{formatDimensoes(item)}</td>
```

No `<td colSpan={9}` do estado vazio, alterar para `colSpan={10}`.

Na função `TableSkeleton`, alterar o grid de `grid-cols-9` para `grid-cols-10` e o `Array.from({ length: 9 })` para `length: 10`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ProdutosAcabadosTab.tsx
git commit -m "feat: formulario e tabela de PA com campos de dimensoes L/P/H mm"
```

---

## Verificação end-to-end

Após todos os commits:

1. Subir backend: `cd backend && uvicorn app.main:app --reload`
2. Subir frontend: `cd frontend && npm run dev`
3. Abrir aba Produtos Acabados → Novo Produto → preencher L/P/H → salvar → confirmar na tabela
4. Abrir produto existente → editar dimensões → salvar → conferir atualização
5. Baixar template CSV → preencher linha com dimensões (separador `;`, decimal `,`) → importar → conferir
6. Produto sem dimensões: tabela deve mostrar `—` na coluna Dimensões
