# Dimensões do Produto Acabado — Design

## Objetivo

Adicionar os campos de dimensão física (Largura, Profundidade, Altura) ao cadastro de Produto Acabado, expressos em milímetros. Os campos são opcionais e cobrem todos os formatos de produto (retangular, circular, irregular).

## Campos novos

| Campo | Coluna DB | Tipo DB | Tipo API | Obrigatório |
|---|---|---|---|---|
| Largura | `largura_mm` | `NUMERIC(10,2)` nullable | `float \| None` | não |
| Profundidade | `profundidade_mm` | `NUMERIC(10,2)` nullable | `float \| None` | não |
| Altura | `altura_mm` | `NUMERIC(10,2)` nullable | `float \| None` | não |

Unidade fixa: milímetros (mm). Não há campo de unidade nem campo de tipo de forma.

## Arquivos afetados

### Backend (novos/editados)

| Arquivo | Mudança |
|---|---|
| `backend/app/models/finished_product.py` | Adicionar 3 colunas `Mapped[Decimal \| None]` |
| `backend/app/schemas/finished_product.py` | Adicionar 3 campos `float \| None = None` em Create, Update e Response |
| `backend/alembic/versions/<rev>_add_dimensoes_finished_product.py` | Migration `ALTER TABLE finished_product ADD COLUMN ...` |

### Frontend (editados)

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/index.ts` | Adicionar `largura_mm`, `profundidade_mm`, `altura_mm` em `FinishedProduct`, `FinishedProductCreatePayload`, `FinishedProductUpdatePayload` |
| `frontend/src/pages/ProdutosAcabadosTab.tsx` | Formulário: nova linha de 3 inputs (L / P / H); tabela: coluna "Dimensões" |
| `backend/app/services/finished_product_import_service.py` | Aceitar colunas opcionais `largura_mm`, `profundidade_mm`, `altura_mm` no CSV |
| `backend/app/api/routers/finished_product.py` | Atualizar template CSV com as 3 novas colunas |

## Comportamento do formulário

- Inputs numéricos, step 0.01, sem valor mínimo obrigatório.
- Label do grupo: "Dimensões (mm)".
- Layout: 3 colunas (L | P | H) na mesma linha, abaixo de Peso Líquido.
- Campos vazios são enviados como `null`.

## Comportamento da tabela

- Nova coluna "Dimensões" após a coluna de Peso.
- Exibe `L × P × H mm` quando todos os três estão preenchidos.
- Se apenas alguns estão preenchidos, mostra apenas os não-nulos separados por ` × `.
- Se nenhum está preenchido, célula vazia (—).

## CSV import

- Template ganha 3 colunas opcionais: `largura_mm`, `profundidade_mm`, `altura_mm`.
- Separador `;`, decimal `,`. Strings vazias = `null`.
- Parsing idêntico ao de `peso_liquido` (troca `,` por `.`, converte para Decimal).
