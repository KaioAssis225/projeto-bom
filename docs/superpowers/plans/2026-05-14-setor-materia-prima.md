# Setor de Matéria-Prima — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a entidade Setor ao sistema, permitindo gerenciar setores pré-estabelecidos e associar cada matéria-prima a um setor, seguindo o padrão exato de MaterialGroup/Grupos.

**Architecture:** Nova tabela `setor` com FK nullable `setor_id` em `raw_material`; setor obrigatório nos schemas de API de criação/edição; página de gerenciamento espelho de GruposPage; dropdown no formulário de MateriaPrima.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Pydantic v2 + Alembic (backend); React + TypeScript + TanStack Query + React Hook Form + Zod + Tailwind (frontend).

---

## File Map

**Novos (backend):**
- `backend/alembic/versions/20260514_0010_add_setor.py`
- `backend/app/models/setor.py`
- `backend/app/schemas/setor.py`
- `backend/app/repositories/setor_repository.py`
- `backend/app/services/setor_service.py`
- `backend/app/api/routers/setores.py`
- `backend/tests/test_setor_schema.py`

**Editados (backend):**
- `backend/app/models/raw_material.py` — add `setor_id` FK + relationship
- `backend/app/schemas/raw_material.py` — add `setor_id`, `_SetorSummary`, update Response
- `backend/app/services/raw_material_service.py` — add setor validation + `_to_response` fields
- `backend/app/repositories/raw_material_repository.py` — add `selectinload(RawMaterial.setor)`
- `backend/app/main.py` — register `/api/v1/setores` router

**Novos (frontend):**
- `frontend/src/api/setores.ts`
- `frontend/src/hooks/useSetores.ts`
- `frontend/src/pages/SetoresPage.tsx`

**Editados (frontend):**
- `frontend/src/types/index.ts` — add Setor types; update RawMaterial interfaces
- `frontend/src/App.tsx` — add `/setores` route
- `frontend/src/components/layout/Sidebar.tsx` — add "Setores" nav entry
- `frontend/src/pages/MateriaisPrimasTab.tsx` — setor dropdown in form + Setor column in table

---

## Task 1: Migration Alembic — tabela setor + setor_id em raw_material

**Files:**
- Create: `backend/alembic/versions/20260514_0010_add_setor.py`

- [ ] **Step 1: Criar o arquivo de migration**

```python
# backend/alembic/versions/20260514_0010_add_setor.py
"""add setor table and setor_id to raw_material

Revision ID: 20260514_0010
Revises: 20260512_0009
Create Date: 2026-05-14
"""
from alembic import op

revision = "20260514_0010"
down_revision = "20260512_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS setor (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(50) NOT NULL,
            active      BOOLEAN NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_setor_name UNIQUE (name)
        )
        """
    )
    op.execute(
        """
        ALTER TABLE raw_material
            ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES setor(id)
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE raw_material DROP COLUMN IF EXISTS setor_id")
    op.execute("DROP TABLE IF EXISTS setor")
```

- [ ] **Step 2: Verificar que o arquivo existe**

```
ls backend/alembic/versions/20260514_0010_add_setor.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/20260514_0010_add_setor.py
git commit -m "feat: migration add setor table and setor_id to raw_material"
```

---

## Task 2: Backend — entidade Setor (model, schema, repo, service, router, main.py)

**Files:**
- Create: `backend/app/models/setor.py`
- Create: `backend/app/schemas/setor.py`
- Create: `backend/app/repositories/setor_repository.py`
- Create: `backend/app/services/setor_service.py`
- Create: `backend/app/api/routers/setores.py`
- Create: `backend/tests/test_setor_schema.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Escrever os testes de schema (TDD — devem falhar)**

```python
# backend/tests/test_setor_schema.py
import pytest
from pydantic import ValidationError

from app.schemas.setor import SetorCreate, SetorUpdate


def test_setor_create_valid():
    s = SetorCreate(name="Produção")
    assert s.name == "Produção"


def test_setor_create_name_too_long():
    with pytest.raises(ValidationError):
        SetorCreate(name="A" * 51)


def test_setor_create_name_empty():
    with pytest.raises(ValidationError):
        SetorCreate(name="")


def test_setor_update_valid():
    s = SetorUpdate(name="Logística", active=True)
    assert s.name == "Logística"
    assert s.active is True


def test_setor_update_requires_active():
    with pytest.raises(ValidationError):
        SetorUpdate(name="Logística")
```

- [ ] **Step 2: Rodar os testes — esperado FAIL**

```
cd backend && python -m pytest tests/test_setor_schema.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.schemas.setor'`

- [ ] **Step 3: Criar o model**

```python
# backend/app/models/setor.py
from __future__ import annotations

from sqlalchemy import Boolean, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Setor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "setor"
    __table_args__ = (
        UniqueConstraint("name", name="uq_setor_name"),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
```

- [ ] **Step 4: Criar o schema**

```python
# backend/app/schemas/setor.py
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema, PaginatedResponse


class SetorCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=50)


class SetorUpdate(BaseSchema):
    name: str = Field(min_length=1, max_length=50)
    active: bool


class SetorResponse(BaseSchema):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime


SetorPaginatedResponse = PaginatedResponse[SetorResponse]
```

- [ ] **Step 5: Rodar os testes — esperado PASS**

```
cd backend && python -m pytest tests/test_setor_schema.py -v
```

Expected: `5 passed`

- [ ] **Step 6: Criar o repository**

```python
# backend/app/repositories/setor_repository.py
from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.setor import Setor


class SetorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: dict) -> Setor:
        setor = Setor(**data)
        self.db.add(setor)
        self.db.commit()
        self.db.refresh(setor)
        return setor

    def get_by_id(self, id: UUID) -> Setor | None:
        return self.db.get(Setor, id)

    def get_by_name(self, name: str) -> Setor | None:
        stmt = select(Setor).where(Setor.name == name)
        return self.db.scalar(stmt)

    def list_all(self, skip: int, limit: int, active_only: bool) -> list[Setor]:
        stmt = self._base_list_query(active_only).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_all(self, active_only: bool) -> int:
        stmt = select(func.count()).select_from(Setor)
        if active_only:
            stmt = stmt.where(Setor.active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def update(self, id: UUID, data: dict) -> Setor:
        setor = self.db.get(Setor, id)
        if setor is None:
            raise ValueError("Setor not found")
        for key, value in data.items():
            setattr(setor, key, value)
        self.db.commit()
        self.db.refresh(setor)
        return setor

    def deactivate(self, id: UUID) -> Setor:
        return self.update(id=id, data={"active": False})

    def delete(self, id: UUID) -> None:
        setor = self.db.get(Setor, id)
        if setor is None:
            raise ValueError("Setor not found")
        self.db.delete(setor)
        self.db.commit()

    @staticmethod
    def _base_list_query(active_only: bool) -> Select[tuple[Setor]]:
        stmt = select(Setor).order_by(Setor.name.asc())
        if active_only:
            stmt = stmt.where(Setor.active.is_(True))
        return stmt
```

- [ ] **Step 7: Criar o service**

```python
# backend/app/services/setor_service.py
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.setor_repository import SetorRepository
from app.schemas.setor import SetorCreate, SetorPaginatedResponse, SetorUpdate

logger = logging.getLogger("app.setor")


class SetorService:
    def __init__(self, db: Session) -> None:
        self.repository = SetorRepository(db)

    def create(self, payload: SetorCreate):
        if self.repository.get_by_name(payload.name) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um setor com este nome.",
            )
        created = self.repository.create(payload.model_dump())
        logger.info("Setor created: id=%s name=%s", created.id, created.name)
        return created

    def get(self, id: UUID):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        return setor

    def list(self, skip: int, limit: int, active_only: bool) -> SetorPaginatedResponse:
        items = self.repository.list_all(skip=skip, limit=limit, active_only=active_only)
        total = self.repository.count_all(active_only=active_only)
        return SetorPaginatedResponse(items=items, total=total, skip=skip, limit=limit)

    def update(self, id: UUID, payload: SetorUpdate):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        updated = self.repository.update(id=id, data=payload.model_dump())
        logger.info("Setor updated: id=%s name=%s", updated.id, updated.name)
        return updated

    def deactivate(self, id: UUID):
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        deactivated = self.repository.deactivate(id=id)
        logger.info("Setor deactivated: id=%s name=%s", deactivated.id, deactivated.name)
        return deactivated

    def delete(self, id: UUID) -> None:
        setor = self.repository.get_by_id(id)
        if setor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado.",
            )
        try:
            self.repository.delete(id=id)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Setor está vinculado a matérias-primas e não pode ser excluído. Inative-o.",
            )
        logger.info("Setor deleted: id=%s name=%s", setor.id, setor.name)
```

- [ ] **Step 8: Criar o router**

```python
# backend/app/api/routers/setores.py
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.setor import (
    SetorCreate,
    SetorPaginatedResponse,
    SetorResponse,
    SetorUpdate,
)
from app.services.setor_service import SetorService

router = APIRouter(tags=["setores"])


@router.get("/", response_model=SetorPaginatedResponse)
def list_setores(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db_session),
) -> SetorPaginatedResponse:
    return SetorService(db).list(skip=skip, limit=limit, active_only=active_only)


@router.post("/", response_model=SetorResponse, status_code=201)
def create_setor(
    payload: SetorCreate,
    db: Session = Depends(get_db_session),
) -> SetorResponse:
    return SetorService(db).create(payload)


@router.get("/{id}", response_model=SetorResponse)
def get_setor(id: UUID, db: Session = Depends(get_db_session)) -> SetorResponse:
    return SetorService(db).get(id)


@router.put("/{id}", response_model=SetorResponse)
def update_setor(
    id: UUID,
    payload: SetorUpdate,
    db: Session = Depends(get_db_session),
) -> SetorResponse:
    return SetorService(db).update(id=id, payload=payload)


@router.patch("/{id}/inativar", response_model=SetorResponse)
def deactivate_setor(id: UUID, db: Session = Depends(get_db_session)) -> SetorResponse:
    return SetorService(db).deactivate(id)


@router.delete("/{id}", status_code=204)
def delete_setor(id: UUID, db: Session = Depends(get_db_session)) -> None:
    SetorService(db).delete(id)
```

- [ ] **Step 9: Registrar o router em main.py**

Adicionar no topo de `backend/app/main.py`, junto aos outros imports de router:

```python
from app.api.routers.setores import router as setores_router
```

Adicionar no final do bloco de `app.include_router(...)`:

```python
app.include_router(setores_router, prefix="/api/v1/setores", tags=["setores"])
```

- [ ] **Step 10: Rodar todos os testes**

```
cd backend && python -m pytest tests/test_setor_schema.py -v
```

Expected: `5 passed`

- [ ] **Step 11: Commit**

```bash
git add backend/app/models/setor.py \
        backend/app/schemas/setor.py \
        backend/app/repositories/setor_repository.py \
        backend/app/services/setor_service.py \
        backend/app/api/routers/setores.py \
        backend/tests/test_setor_schema.py \
        backend/app/main.py
git commit -m "feat: add Setor entity (model, schema, repo, service, router)"
```

---

## Task 3: RawMaterial backend — FK setor_id, schema, service, repository

**Files:**
- Modify: `backend/app/models/raw_material.py`
- Modify: `backend/app/schemas/raw_material.py`
- Modify: `backend/app/services/raw_material_service.py`
- Modify: `backend/app/repositories/raw_material_repository.py`

- [ ] **Step 1: Atualizar o model RawMaterial**

Em `backend/app/models/raw_material.py`, adicionar ao bloco `TYPE_CHECKING`:

```python
    from app.models.setor import Setor
```

Adicionar após `supplier_id`:

```python
    setor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("setor.id"), nullable=True
    )
```

Adicionar após o relationship de `supplier`:

```python
    setor: Mapped["Setor | None"] = relationship()
```

O arquivo completo deve ficar assim:

```python
# backend/app/models/raw_material.py
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.material_group import MaterialGroup
    from app.models.setor import Setor
    from app.models.supplier import Supplier
    from app.models.unit_of_measure import UnitOfMeasure


class RawMaterial(Base):
    __tablename__ = "raw_material"

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("item.id", ondelete="CASCADE"), primary_key=True
    )
    material_group_id: Mapped[UUID] = mapped_column(
        ForeignKey("material_group.id"), nullable=False
    )
    setor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("setor.id"), nullable=True
    )
    supplier_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("supplier.id"), nullable=True
    )
    unidade_conversao_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("unit_of_measure.id"), nullable=True
    )
    peso_liquido: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)

    item: Mapped["Item"] = relationship(back_populates="raw_material")
    material_group: Mapped["MaterialGroup"] = relationship()
    setor: Mapped["Setor | None"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()
    unidade_conversao: Mapped["UnitOfMeasure | None"] = relationship()
```

- [ ] **Step 2: Atualizar o schema RawMaterial**

Em `backend/app/schemas/raw_material.py`:

Adicionar `setor_id: UUID` em `RawMaterialCreate` (após `material_group_id`):

```python
class RawMaterialCreate(BaseSchema):
    code: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    unit_of_measure_id: UUID
    material_group_id: UUID
    setor_id: UUID
    notes: str | None = None
    supplier_id: UUID | None = None
    unidade_conversao_id: UUID | None = None
    peso_liquido: Decimal | None = None
```

Adicionar `setor_id: UUID` em `RawMaterialUpdate` (após `material_group_id`):

```python
class RawMaterialUpdate(BaseSchema):
    description: str = Field(min_length=1, max_length=255)
    active: bool
    material_group_id: UUID
    setor_id: UUID
    notes: str | None = None
    supplier_id: UUID | None = None
    unidade_conversao_id: UUID | None = None
    peso_liquido: Decimal | None = None
```

Adicionar `_SetorSummary` após `_GroupSummary`:

```python
class _SetorSummary(BaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
```

Adicionar `setor_id` e `setor` em `RawMaterialResponse`:

```python
class RawMaterialResponse(BaseSchema):
    id: UUID
    code: str
    description: str
    active: bool
    notes: str | None
    unit_of_measure_id: UUID
    material_group_id: UUID
    setor_id: UUID | None
    supplier_id: UUID | None
    unidade_conversao_id: UUID | None
    peso_liquido: Decimal | None
    created_at: datetime
    updated_at: datetime
    unit_of_measure: _UomSummary
    material_group: _GroupSummary
    setor: _SetorSummary | None
    supplier: _SupplierSummary | None
    unidade_conversao: _UomSummary | None
```

- [ ] **Step 3: Atualizar o service RawMaterial**

Em `backend/app/services/raw_material_service.py`:

Adicionar import no topo (junto aos outros repository imports):

```python
from app.repositories.setor_repository import SetorRepository
```

Adicionar `"setor_id"` em `_RM_FIELDS`:

```python
_RM_FIELDS = {"material_group_id", "setor_id", "supplier_id", "unidade_conversao_id", "peso_liquido"}
```

Atualizar `_to_response` para incluir `setor_id` e `setor`:

```python
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
        setor_id=rm.setor_id,
        supplier_id=rm.supplier_id,
        unidade_conversao_id=rm.unidade_conversao_id,
        peso_liquido=rm.peso_liquido,
        created_at=item.created_at,
        updated_at=item.updated_at,
        unit_of_measure=item.unit_of_measure,
        material_group=rm.material_group,
        setor=rm.setor,
        supplier=rm.supplier,
        unidade_conversao=rm.unidade_conversao,
    )
```

Adicionar `self.setor_repo` em `__init__`:

```python
    def __init__(self, db: Session) -> None:
        self.repository = RawMaterialRepository(db)
        self.uom_repo = UnitOfMeasureRepository(db)
        self.group_repo = MaterialGroupRepository(db)
        self.supplier_repo = SupplierRepository(db)
        self.setor_repo = SetorRepository(db)
```

Atualizar a assinatura de `_validate` para aceitar `setor_id` e validar:

```python
    def _validate(
        self,
        uom_id: UUID,
        group_id: UUID,
        setor_id: UUID,
        supplier_id: UUID | None,
        conversao_id: UUID | None,
    ) -> None:
        if self.uom_repo.get_by_id(uom_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unidade de medida não encontrada")
        if self.group_repo.get_by_id(group_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Grupo de matéria-prima não encontrado")
        if self.setor_repo.get_by_id(setor_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Setor não encontrado")
        if supplier_id is not None and self.supplier_repo.get_by_id(supplier_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Fornecedor não encontrado")
        if conversao_id is not None and self.uom_repo.get_by_id(conversao_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unidade de conversão não encontrada")
```

Atualizar as chamadas de `_validate` em `create` e `update` para passar `setor_id`:

Em `create`:
```python
        self._validate(payload.unit_of_measure_id, payload.material_group_id,
                       payload.setor_id, payload.supplier_id, payload.unidade_conversao_id)
```

Em `update`:
```python
        self._validate(item.unit_of_measure_id, payload.material_group_id,
                       payload.setor_id, payload.supplier_id, payload.unidade_conversao_id)
```

Atualizar a linha de garantia de `material_group_id` em `update` para incluir `setor_id`:

```python
        if "material_group_id" not in rm_data:
            rm_data["material_group_id"] = payload.material_group_id
        if "setor_id" not in rm_data:
            rm_data["setor_id"] = payload.setor_id
```

- [ ] **Step 4: Atualizar o repository para eager-load do setor**

Em `backend/app/repositories/raw_material_repository.py`, na função `_base_query`, adicionar o `selectinload` de `setor` ao lado do de `material_group`:

```python
    @staticmethod
    def _base_query():
        return (
            select(Item)
            .join(RawMaterial, RawMaterial.item_id == Item.id)
            .where(Item.type == ItemType.RAW_MATERIAL)
            .options(
                selectinload(Item.unit_of_measure),
                selectinload(Item.raw_material).selectinload(RawMaterial.material_group),
                selectinload(Item.raw_material).selectinload(RawMaterial.setor),
                selectinload(Item.raw_material).selectinload(RawMaterial.supplier),
                selectinload(Item.raw_material).selectinload(RawMaterial.unidade_conversao),
            )
            .order_by(Item.code.asc())
        )
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/raw_material.py \
        backend/app/schemas/raw_material.py \
        backend/app/services/raw_material_service.py \
        backend/app/repositories/raw_material_repository.py
git commit -m "feat: add setor_id FK to RawMaterial model, schema, service, repository"
```

---

## Task 4: Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Adicionar interfaces de Setor**

Em `frontend/src/types/index.ts`, adicionar após as interfaces de `MaterialGroup`:

```typescript
export interface Setor {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface SetorCreatePayload {
  name: string;
}

export interface SetorUpdatePayload {
  name: string;
  active: boolean;
}
```

- [ ] **Step 2: Atualizar a interface RawMaterial**

Em `frontend/src/types/index.ts`, na interface `RawMaterial`, adicionar após `material_group_id`:

```typescript
  setor_id?: string | null;
```

Adicionar na seção de relacionamentos expandidos (após `material_group`):

```typescript
  setor?: { id: string; name: string } | null;
```

- [ ] **Step 3: Atualizar RawMaterialCreatePayload**

Adicionar após `material_group_id`:

```typescript
  setor_id: string;
```

- [ ] **Step 4: Atualizar RawMaterialUpdatePayload**

Adicionar após `material_group_id`:

```typescript
  setor_id: string;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add Setor TS types and setor_id to RawMaterial interfaces"
```

---

## Task 5: Frontend API Client + Hooks

**Files:**
- Create: `frontend/src/api/setores.ts`
- Create: `frontend/src/hooks/useSetores.ts`

- [ ] **Step 1: Criar o API client**

```typescript
// frontend/src/api/setores.ts
import { client } from "@/api/client";
import type {
  PaginatedResponse,
  PaginationParams,
  Setor,
  SetorCreatePayload,
  SetorUpdatePayload,
} from "@/types";

export async function list(
  params?: PaginationParams & { active_only?: boolean },
): Promise<PaginatedResponse<Setor>> {
  const response = await client.get<PaginatedResponse<Setor>>("/api/v1/setores/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
      active_only: params?.active_only ?? true,
    },
  });
  return response.data;
}

export async function getById(id: string): Promise<Setor> {
  const response = await client.get<Setor>(`/api/v1/setores/${id}`);
  return response.data;
}

export async function create(data: SetorCreatePayload): Promise<Setor> {
  const response = await client.post<Setor>("/api/v1/setores/", data);
  return response.data;
}

export async function update(id: string, data: SetorUpdatePayload): Promise<Setor> {
  const response = await client.put<Setor>(`/api/v1/setores/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<Setor> {
  const response = await client.patch<Setor>(`/api/v1/setores/${id}/inativar`);
  return response.data;
}

export async function remove(id: string): Promise<void> {
  await client.delete(`/api/v1/setores/${id}`);
}
```

- [ ] **Step 2: Criar os hooks**

```typescript
// frontend/src/hooks/useSetores.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as setoresApi from "@/api/setores";
import { extractErrorMessage } from "@/lib/utils";
import type { PaginationParams, SetorCreatePayload, SetorUpdatePayload } from "@/types";

export function useSetores(filters?: PaginationParams & { active_only?: boolean }) {
  return useQuery({
    queryKey: ["setores", filters],
    queryFn: () => setoresApi.list(filters),
  });
}

export function useSetor(id: string | null) {
  return useQuery({
    queryKey: ["setores", "detail", id],
    queryFn: () => setoresApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateSetor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetorCreatePayload) => setoresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      toast.success("Setor criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateSetor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetorUpdatePayload }) =>
      setoresApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      queryClient.invalidateQueries({ queryKey: ["setores", "detail", variables.id] });
      toast.success("Setor atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeleteSetor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setoresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      toast.success("Setor excluído com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateSetor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setoresApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      queryClient.invalidateQueries({ queryKey: ["setores", "detail", id] });
      toast.success("Setor inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/setores.ts frontend/src/hooks/useSetores.ts
git commit -m "feat: add Setor API client and React Query hooks"
```

---

## Task 6: SetoresPage + rota + navegação

**Files:**
- Create: `frontend/src/pages/SetoresPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Criar a página SetoresPage**

```tsx
// frontend/src/pages/SetoresPage.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import {
  useCreateSetor,
  useDeactivateSetor,
  useDeleteSetor,
  useSetores,
  useUpdateSetor,
} from "@/hooks/useSetores";
import { cn } from "@/lib/utils";
import type { Setor } from "@/types";

const setorSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(50, "Máximo de 50 caracteres"),
});

type SetorFormValues = z.infer<typeof setorSchema>;

function SetoresTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SetorModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Setor | null;
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createSetor = useCreateSetor();
  const updateSetor = useUpdateSetor();
  const isSubmitting = createSetor.isPending || updateSetor.isPending;

  const form = useForm<SetorFormValues>({
    resolver: zodResolver(setorSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ name: "" });
      return;
    }
    form.reset({ name: item?.name ?? "" });
  }, [form, item, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEditing && item) {
      await updateSetor.mutateAsync({
        id: item.id,
        data: { name: values.name.trim(), active: item.active },
      });
    } else {
      await createSetor.mutateAsync({ name: values.name.trim() });
    }
    onClose();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar Setor" : "Novo Setor"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize o nome do setor." : "Cadastre um novo setor."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label htmlFor="setor-name" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="setor-name"
              type="text"
              maxLength={50}
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetoresPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);

  const setoresQuery = useSetores({ skip: 0, limit: 200, active_only: false });
  const deactivateSetor = useDeactivateSetor();
  const deleteSetor = useDeleteSetor();
  const isMutating = deactivateSetor.isPending || deleteSetor.isPending;

  const filteredItems = useMemo(() => {
    const allItems = setoresQuery.data?.items ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return allItems;
    return allItems.filter((s) => s.name.toLowerCase().includes(normalizedSearch));
  }, [setoresQuery.data?.items, search]);

  const handleDeactivate = async (setor: Setor) => {
    if (!window.confirm(`Deseja inativar o setor "${setor.name}"?`)) return;
    await deactivateSetor.mutateAsync(setor.id);
  };

  const handleDelete = async (setor: Setor) => {
    if (
      !window.confirm(
        `Excluir definitivamente o setor "${setor.name}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    await deleteSetor.mutateAsync(setor.id);
  };

  const buildActions = (setor: Setor): RowAction[] => {
    const actions: RowAction[] = [
      {
        label: "Editar",
        icon: Pencil,
        onClick: () => {
          setSelectedSetor(setor);
          setModalOpen(true);
        },
      },
    ];
    if (setor.active) {
      actions.push({
        label: "Inativar",
        icon: Ban,
        onClick: () => void handleDeactivate(setor),
      });
    }
    actions.push({
      label: "Excluir",
      icon: Trash2,
      variant: "danger",
      onClick: () => void handleDelete(setor),
    });
    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Setores</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os setores usados para classificar matérias-primas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSetor(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Setor
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {setoresQuery.data ? `${filteredItems.length} setor(es) exibido(s)` : "Carregando..."}
          </span>
        </div>
      </div>

      {setoresQuery.isLoading ? <SetoresTableSkeleton /> : null}

      {setoresQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os setores.</p>
          <button
            type="button"
            onClick={() => void setoresQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!setoresQuery.isLoading && !setoresQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((setor) => (
                    <tr key={setor.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{setor.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            setor.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {setor.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <RowActionsMenu actions={buildActions(setor)} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum setor cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <SetorModal
        open={modalOpen}
        item={selectedSetor}
        onClose={() => {
          setModalOpen(false);
          setSelectedSetor(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Adicionar rota em App.tsx**

Em `frontend/src/App.tsx`, adicionar o import:

```typescript
import SetoresPage from "@/pages/SetoresPage";
```

Adicionar a rota (após a rota de `/grupos`):

```tsx
<Route path="/setores" element={<SetoresPage />} />
```

- [ ] **Step 3: Adicionar entrada no Sidebar**

Em `frontend/src/components/layout/Sidebar.tsx`, adicionar em `secondaryItems` (após "Grupos"):

```typescript
{ label: "Setores", to: "/setores", icon: Boxes },
```

Nota: `Boxes` já está importado. Se quiser um ícone diferente, pode usar `LayoutGrid` ou `Tag` do lucide-react — mas `Boxes` é o mesmo de Grupos, o que é aceitável. Caso prefira diferenciar, troque por `Tag`:

```typescript
import { ..., Tag } from "lucide-react";
// e no item:
{ label: "Setores", to: "/setores", icon: Tag },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SetoresPage.tsx \
        frontend/src/App.tsx \
        frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: SetoresPage, rota /setores e entrada no menu lateral"
```

---

## Task 7: MateriaisPrimasTab — dropdown Setor no formulário + coluna na tabela

**Files:**
- Modify: `frontend/src/pages/MateriaisPrimasTab.tsx`

- [ ] **Step 1: Adicionar import de useSetores e tipo Setor**

No topo de `frontend/src/pages/MateriaisPrimasTab.tsx`, adicionar `useSetores` ao bloco de imports de hooks:

```typescript
import { useSetores } from "@/hooks/useSetores";
```

Adicionar `Setor` ao import de tipos:

```typescript
import type { MaterialGroup, RawMaterial, Setor, Supplier, UnitOfMeasure } from "@/types";
```

- [ ] **Step 2: Adicionar setor_id ao Zod schema**

Em `materiaisSchema` (ao redor da linha 186), adicionar após `material_group_id`:

```typescript
    setor_id: z.string().min(1, "Selecione um setor válido"),
```

- [ ] **Step 3: Atualizar a assinatura do MateriaisPrimasModal**

A função `MateriaisPrimasModal` recebe props. Adicionar `setores: Setor[]`:

```typescript
function MateriaisPrimasModal({
  open,
  item,
  groups,
  units,
  suppliers,
  setores,
  onClose,
}: {
  open: boolean;
  item: RawMaterial | null;
  groups: MaterialGroup[];
  units: UnitOfMeasure[];
  suppliers: Supplier[];
  setores: Setor[];
  onClose: () => void;
})
```

- [ ] **Step 4: Atualizar defaultValues e form.reset() com setor_id**

No `defaultValues` do `useForm`:

```typescript
      setor_id: "",
```

No primeiro `form.reset` (quando `!open`):

```typescript
      setor_id: "",
```

No segundo `form.reset` (quando popula com dados do item):

```typescript
      setor_id: item?.setor_id ?? "",
```

- [ ] **Step 5: Adicionar setor_id aos payloads de mutação em onSubmit**

No bloco `updateItem.mutateAsync`:

```typescript
            setor_id: values.setor_id,
```

No bloco `createItem.mutateAsync`:

```typescript
            setor_id: values.setor_id,
```

- [ ] **Step 6: Adicionar o select de Setor no JSX do formulário**

Encontrar o bloco `{/* Unidade + Grupo */}` (grid de 2 colunas, ~linha 431). Após esse bloco (após o `</div>` que fecha o grid), adicionar o dropdown de Setor:

```tsx
            {/* Setor */}
            <div className="space-y-2">
              <label htmlFor="mp-setor" className="text-sm font-medium text-slate-700">
                Setor <span className="text-red-600">*</span>
              </label>
              <Controller
                name="setor_id"
                control={form.control}
                render={({ field }) => (
                  <select
                    id="mp-setor"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.setor_id ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.setor_id.message}
                </p>
              ) : null}
            </div>
```

- [ ] **Step 7: Atualizar o TableSkeleton de 9 para 10 colunas**

Em `TableSkeleton` (~linha 787):

```tsx
          <div key={i} className="grid grid-cols-10 gap-4">
            {Array.from({ length: 10 }).map((__, j) => (
```

- [ ] **Step 8: Adicionar coluna "Setor" no thead da tabela**

Encontrar o `<thead>` da tabela de MPs. Após o `<th>` de "Grupo", adicionar:

```tsx
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Setor</th>
```

- [ ] **Step 9: Adicionar célula Setor no tbody da tabela**

Após a `<td>` de `item.material_group?.name`, adicionar:

```tsx
                        <td className="px-4 py-3 text-slate-600">
                          {item.setor?.name ?? "—"}
                        </td>
```

- [ ] **Step 10: Atualizar colSpan do empty state de 9 para 10**

Encontrar `colSpan={9}` na linha de "Nenhuma matéria-prima encontrada" e mudar para `colSpan={10}`.

- [ ] **Step 11: Buscar setores no componente principal e passar para o modal**

Em `MateriaisPrimasTab` (componente principal, ~linha 811), adicionar junto aos outros queries:

```typescript
  const setoresQuery = useSetores({ active_only: true, skip: 0, limit: 200 });
```

Encontrar onde `<MateriaisPrimasModal>` é renderizado e adicionar a prop `setores`:

```tsx
      <MateriaisPrimasModal
        open={modalOpen}
        item={selectedItem}
        groups={(groupsQuery.data?.items ?? []).filter((g) => g.active)}
        units={unitsQuery.data?.items ?? []}
        suppliers={(fornecedoresQuery.data?.items ?? []).filter((s) => s.active)}
        setores={setoresQuery.data?.items ?? []}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
      />
```

- [ ] **Step 12: Commit**

```bash
git add frontend/src/pages/MateriaisPrimasTab.tsx
git commit -m "feat: setor dropdown no formulario de MP e coluna Setor na tabela"
```

---

## Verificação final

- [ ] **Rodar testes backend**

```
cd backend && python -m pytest tests/test_setor_schema.py tests/test_finished_product_schema.py tests/test_finished_product_import.py -v
```

Expected: todos passando.

- [ ] **Rodar `alembic upgrade head` no ambiente de dev** para aplicar a migration.

- [ ] **Testar manualmente:**
  1. Acessar `/setores` → criar ao menos 2 setores (ex: "Produção", "Logística").
  2. Acessar `/materias-primas` → clicar em "Nova Matéria-Prima" → verificar que o dropdown "Setor" aparece e lista os setores criados.
  3. Criar uma MP com setor → verificar que a coluna "Setor" na tabela exibe o nome correto.
  4. Editar a MP → verificar que o setor está pré-selecionado.
  5. Tentar excluir um setor vinculado a uma MP → deve receber mensagem de erro 409.
