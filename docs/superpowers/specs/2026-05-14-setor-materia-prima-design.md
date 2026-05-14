# Setor de Matéria-Prima — Design

## Objetivo

Adicionar a entidade **Setor** ao sistema, permitindo que o usuário gerencie uma lista pré-estabelecida de setores e associe cada matéria-prima a um setor. O padrão segue exatamente o de **MaterialGroup** (Grupos).

## Entidade Setor

| Campo | Coluna DB | Tipo DB | Obrigatório |
|---|---|---|---|
| ID | `id` | `UUID` PK | sim (auto) |
| Nome | `name` | `VARCHAR(50)` NOT NULL UNIQUE | sim |
| Ativo | `active` | `BOOLEAN` default true | sim (auto) |
| Criado em | `created_at` | `TIMESTAMP` | sim (auto) |
| Atualizado em | `updated_at` | `TIMESTAMP` | sim (auto) |

Sem campo código — o nome é o identificador único e visível.

## Relação com Matéria-Prima

- Coluna `setor_id UUID` adicionada à tabela `raw_material`.
- **Nullable no banco** (registros existentes ficam com `NULL` até serem editados).
- **Obrigatória nos schemas de criação e edição** da API (Pydantic).
- FK com `ON DELETE RESTRICT` — excluir um setor com MPs vinculadas retorna `409 CONFLICT`.
- O serviço de matéria-prima valida que o setor existe antes de persistir.

## Arquivos afetados

### Backend (novos)

| Arquivo | Mudança |
|---|---|
| `backend/app/models/setor.py` | Modelo SQLAlchemy (`Setor`) |
| `backend/app/schemas/setor.py` | `SetorCreate`, `SetorUpdate`, `SetorResponse`, `SetorPaginatedResponse` |
| `backend/app/repositories/setor_repository.py` | CRUD + `get_by_name`, `list_all`, `count_all`, `deactivate`, `delete` |
| `backend/app/services/setor_service.py` | Validação de unicidade, hard delete com 409 se vinculado |
| `backend/app/api/routers/setores.py` | Endpoints REST |
| `backend/alembic/versions/<rev>_add_setor.py` | Migration: cria `setor`, adiciona `setor_id` em `raw_material` |

### Backend (editados)

| Arquivo | Mudança |
|---|---|
| `backend/app/models/raw_material.py` | Adicionar `setor_id` FK e relationship `setor` |
| `backend/app/schemas/raw_material.py` | Adicionar `setor_id` (obrigatório em Create/Update) e `_SetorSummary` em Response |
| `backend/app/services/raw_material_service.py` | Validar `setor_id` antes de criar/atualizar |
| `backend/app/main.py` | Registrar router `/api/v1/setores` |

### Frontend (novos)

| Arquivo | Mudança |
|---|---|
| `frontend/src/api/setores.ts` | Cliente HTTP (list, getById, create, update, deactivate, remove) |
| `frontend/src/hooks/useSetores.ts` | Hooks React Query (`useSetores`, `useCreateSetor`, etc.) |
| `frontend/src/pages/SetoresPage.tsx` | Página de gerenciamento (espelho de `GruposPage.tsx`) |

### Frontend (editados)

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/index.ts` | Adicionar `Setor`, `SetorCreatePayload`, `SetorUpdatePayload`; adicionar `setor_id` e `setor` em `RawMaterial` e payloads |
| `frontend/src/pages/MateriaisPrimasTab.tsx` | Dropdown "Setor" obrigatório no formulário; coluna "Setor" na tabela |
| `frontend/src/App.tsx` (ou rota equivalente) | Rota `/setores` → `SetoresPage` |
| Componente de navegação lateral | Nova entrada "Setores" no menu |

## Endpoints da API

Prefixo: `/api/v1/setores`, tag: `"setores"`

| Método | Path | Descrição | Status |
|---|---|---|---|
| GET | `/` | Lista paginada (skip, limit, active_only) | 200 |
| POST | `/` | Criar setor | 201 |
| GET | `/{id}` | Detalhe | 200 |
| PUT | `/{id}` | Editar nome e/ou active | 200 |
| PATCH | `/{id}/inativar` | Soft delete | 200 |
| DELETE | `/{id}` | Hard delete | 204 / 409 |

## Comportamento da página Setores

- Tabela: colunas **Nome**, **Status** (badge Ativo/Inativo), **Ações**.
- Ações por linha: Editar, Inativar (se ativo), Excluir.
- Confirmação antes de inativar ou excluir.
- Excluir com MPs vinculadas: exibe mensagem de erro (409 do backend).
- Modal de criação/edição: campo único "Nome" (máx 50 chars, obrigatório).

## Comportamento no formulário de Matéria-Prima

- Dropdown "Setor" obrigatório, posicionado próximo ao dropdown de Grupo.
- Popula apenas setores ativos (`active_only: true`).
- Exibe `{setor.name}` como opção.
- Tabela de MPs: nova coluna "Setor" exibindo `setor.name` ou `—` se `NULL`.

## Schemas Pydantic

```python
class SetorCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=50)

class SetorUpdate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=50)
    active: bool

class SetorResponse(BaseSchema):
    id: UUID
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime

class SetorPaginatedResponse(BaseSchema):
    items: list[SetorResponse]
    total: int
    skip: int
    limit: int
```

## TypeScript Types

```ts
interface Setor {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

interface SetorCreatePayload {
  name: string;
}

interface SetorUpdatePayload {
  name: string;
  active: boolean;
}
```

## Migração

Duas operações em uma única revisão Alembic:
1. `CREATE TABLE setor (...)` com unique constraint em `name`.
2. `ALTER TABLE raw_material ADD COLUMN setor_id UUID REFERENCES setor(id)` (nullable, sem default — registros existentes ficam `NULL`).
