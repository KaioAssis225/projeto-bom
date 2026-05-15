# Controle de Estoque de Alumínios — Design

## Objetivo

Criar uma página dedicada ao controle de estoque das matérias-primas do grupo **ALU**, com registro de entradas e saídas, histórico por item, estoque mínimo configurável por item e sinalização visual quando o saldo está abaixo do mínimo.

## Decisões de Design

- **Abordagem**: tabela de movimentos com saldo calculado on-the-fly (`SUM entrada - SUM saída`). Sem saldo denormalizado — auditável e sem risco de inconsistência.
- **Saldo inicial**: zero. O usuário registra uma entrada para inicializar o estoque de cada material.
- **Estoque mínimo**: configurável na própria página de controle (não no cadastro de MP).
- **Saldo negativo**: permitido (divergências de contagem são comuns em produção; o sistema avisa mas não bloqueia).
- **Filtro ALU**: hardcoded por `material_group.code = 'ALU'` no backend.

## Modelo de Dados

### Nova coluna em `raw_material`

```sql
estoque_minimo NUMERIC(18,6) NULL
```

`NULL` significa "sem mínimo definido" — sem badge de status.

### Nova tabela `estoque_movimento`

| Campo | Tipo DB | Notas |
|---|---|---|
| `id` | UUID PK | auto |
| `item_id` | UUID FK → `item(id)` | ON DELETE CASCADE |
| `tipo` | VARCHAR(10) NOT NULL | `'entrada'` ou `'saida'` |
| `quantidade` | NUMERIC(18,6) NOT NULL | CHECK > 0 |
| `solicitante` | VARCHAR(120) NULL | preenchido apenas em saídas |
| `created_at` | TIMESTAMPTZ NOT NULL | DEFAULT now() |

Índice: `(item_id, created_at DESC)` para histórico eficiente.

### Cálculo de saldo

```sql
saldo_uom1 = COALESCE(SUM(q) FILTER WHERE tipo='entrada', 0)
           - COALESCE(SUM(q) FILTER WHERE tipo='saida', 0)

saldo_uom2 = saldo_uom1 * peso_liquido   -- NULL se peso_liquido for NULL
```

`abaixo_minimo = saldo_uom1 < estoque_minimo` (apenas quando `estoque_minimo IS NOT NULL`)

## Arquivos

### Backend (novos)

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/models/estoque_movimento.py` | Model SQLAlchemy `EstoqueMovimento` |
| `backend/app/schemas/estoque_aluminio.py` | Schemas Pydantic (payloads + responses) |
| `backend/app/repositories/estoque_aluminio_repository.py` | Queries: list com saldo, add movimento, historico, set mínimo |
| `backend/app/services/estoque_aluminio_service.py` | Validações, cálculo saldo_uom2, flag abaixo_minimo |
| `backend/app/api/routers/estoque_aluminio.py` | Endpoints REST |
| `backend/alembic/versions/20260514_0011_add_estoque_aluminio.py` | Migration |

### Backend (editados)

| Arquivo | Mudança |
|---|---|
| `backend/app/models/__init__.py` | Registrar `EstoqueMovimento` |
| `backend/app/main.py` | Incluir router `/api/v1/estoque-aluminio` |

### Frontend (novos)

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/api/estoque-aluminio.ts` | Cliente HTTP |
| `frontend/src/hooks/useEstoqueAluminio.ts` | Hooks React Query |
| `frontend/src/pages/EstoqueAluminioPage.tsx` | Página completa |

### Frontend (editados)

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/index.ts` | Novos tipos de estoque |
| `frontend/src/App.tsx` | Rota `/estoque-aluminio` |
| `frontend/src/components/layout/Sidebar.tsx` | Entrada "Alumínios" no menu primário |

## Endpoints da API

Prefixo: `/api/v1/estoque-aluminio`, tag: `"estoque-aluminio"`

| Método | Path | Body | Status |
|---|---|---|---|
| GET | `/` | — | 200 `EstoqueItemPaginatedResponse` |
| POST | `/{item_id}/entrada` | `{ quantidade }` | 201 `EstoqueMovimentoResponse` |
| POST | `/{item_id}/saida` | `{ quantidade, solicitante? }` | 201 `EstoqueMovimentoResponse` |
| GET | `/{item_id}/historico` | query: skip, limit | 200 `EstoqueHistoricoPaginatedResponse` |
| PATCH | `/{item_id}/estoque-minimo` | `{ estoque_minimo }` | 200 `EstoqueItemResponse` |

## Schemas Pydantic

```python
class EstoqueEntradaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))

class EstoqueSaidaPayload(BaseSchema):
    quantidade: Decimal = Field(gt=Decimal("0"))
    solicitante: str | None = Field(default=None, max_length=120)

class EstoqueMinimoPayload(BaseSchema):
    estoque_minimo: Decimal | None = Field(default=None, ge=Decimal("0"))

class EstoqueMovimentoResponse(BaseSchema):
    id: UUID
    item_id: UUID
    tipo: str           # 'entrada' | 'saida'
    quantidade: Decimal
    solicitante: str | None
    created_at: datetime

class EstoqueItemResponse(BaseSchema):
    item_id: UUID
    code: str
    description: str
    uom: str
    uom2: str | None
    saldo_uom1: Decimal
    saldo_uom2: Decimal | None
    estoque_minimo: Decimal | None
    abaixo_minimo: bool

EstoqueItemPaginatedResponse = PaginatedResponse[EstoqueItemResponse]
EstoqueHistoricoPaginatedResponse = PaginatedResponse[EstoqueMovimentoResponse]
```

## TypeScript Types

```ts
export interface EstoqueItem {
  item_id: string;
  code: string;
  description: string;
  uom: string;
  uom2: string | null;
  saldo_uom1: number;
  saldo_uom2: number | null;
  estoque_minimo: number | null;
  abaixo_minimo: boolean;
}

export interface EstoqueMovimento {
  id: string;
  item_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  solicitante: string | null;
  created_at: string;
}

export interface EstoqueEntradaPayload {
  quantidade: number;
}

export interface EstoqueSaidaPayload {
  quantidade: number;
  solicitante?: string;
}

export interface EstoqueMinimoPayload {
  estoque_minimo: number | null;
}
```

## Comportamento da Página

### Tabela principal

Colunas: **Código** · **Descrição** · **Saldo** (UoM1) · **Saldo** (UoM2, só se `uom2` existir) · **Estoque Mínimo** · **Status** · **Ações**

- **Status**: badge vermelho "Abaixo do mínimo" quando `abaixo_minimo = true`; badge verde "OK" quando mínimo definido e saldo OK; sem badge quando mínimo não definido.
- **Estoque mínimo**: clique na célula → mini-modal com campo numérico. "Limpar" define como `null`.
- **Busca**: campo de texto, filtra localmente por código ou descrição (case-insensitive).

### Ações por linha

- `+` → abre **Modal de Entrada**: campo "Quantidade" (número positivo), confirmar.
- `−` → abre **Modal de Saída**: campo "Quantidade" + campo "Solicitante" (opcional), confirmar.
- Relógio → abre **Modal de Histórico**: tabela Data/hora · Tipo · Quantidade UoM1 · Quantidade UoM2 · Solicitante, paginada 10/página.

### Tipo nos badges do histórico

- `entrada` → badge azul "Entrada"
- `saida` → badge slate "Saída"

## Migração (20260514_0011)

```sql
-- 1. Coluna estoque_minimo em raw_material
ALTER TABLE raw_material ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC(18,6) NULL;

-- 2. Tabela estoque_movimento
CREATE TABLE estoque_movimento (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id     UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade  NUMERIC(18,6) NOT NULL CHECK (quantidade > 0),
    solicitante VARCHAR(120),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_estoque_movimento_item_created
    ON estoque_movimento (item_id, created_at DESC);
```
