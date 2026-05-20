# Arquitetura — ProjetoGH

## Diagrama Geral

```
┌───────────────────────────────────────────────────────────────┐
│                          Frontend                             │
│   React 18 + TypeScript + Vite + TanStack Query + Tailwind   │
└──────────────────────────────┬────────────────────────────────┘
                               │ HTTP/JSON (Axios)
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                        FastAPI API                            │
│                    /api/v1/* routers                          │
│           (ProxyHeadersMiddleware para Railway)               │
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                          Services                             │
│    Regras de negócio · Validação · Orquestração · Logs       │
└──────────────┬────────────────────────┬───────────────────────┘
               │                        │
               ▼                        ▼
┌─────────────────────────┐  ┌──────────────────────────────────┐
│      Repositories       │  │            Domain                │
│  SQLAlchemy / Queries   │  │  BomCalculator (lógica pura)     │
└─────────────┬───────────┘  └──────────────────────────────────┘
              ▼
┌───────────────────────────────────────────────────────────────┐
│                      PostgreSQL 15+                           │
│  BOM · Itens · Preços · Auditoria · Logs · NUMERIC(18,6)     │
└───────────────────────────────────────────────────────────────┘
```

---

## Camadas em Detalhe

### Router

Responsabilidades:
- Receber requisições HTTP e definir contratos de entrada/saída via Pydantic
- Delegar para o service correto
- Mapear exceções de domínio para códigos HTTP via `error_handlers.py`
- Não contém lógica de negócio

Localização: `backend/app/api/routers/`

Routers existentes:
- `health.py` — verificação de saúde
- `items.py` — itens genéricos (SEMI_FINISHED, PACKAGING, SERVICE)
- `raw_material.py` — matérias-primas
- `finished_product.py` — produtos acabados
- `material_groups.py` — grupos de matéria-prima
- `unit_of_measures.py` — unidades de medida
- `suppliers.py` — fornecedores
- `bom.py` — estrutura BOM
- `prices.py` — preços e vigências
- `calculations.py` — cálculo de custo e download Excel
- `audit.py` — auditoria de preços
- `logs.py` — logs de execução

### Service

Responsabilidades:
- Aplicar regras de negócio
- Validar estado do domínio (item ativo, preço existente, grupo existente)
- Orquestrar múltiplos repositórios em uma transação lógica
- Iniciar e finalizar logs de execução de cálculo
- Disparar geração de Excel via `ExportService`

Localização: `backend/app/services/`

Serviços existentes: `ItemService`, `RawMaterialService`, `FinishedProductService`, `MaterialGroupService`, `UnitOfMeasureService`, `SupplierService`, `BomService`, `PriceService`, `CalculationService`, `ExportService`, `ExecutionLogService`

### Repository

Responsabilidades:
- Encapsular todas as queries SQLAlchemy
- Isolar detalhes de banco do service
- Montar consultas recursivas quando necessário (BOM tree)
- Retornar entidades ORM ou DTOs

Localização: `backend/app/repositories/`

Repositórios: `ItemRepository`, `RawMaterialRepository`, `FinishedProductRepository`, `MaterialGroupRepository`, `UnitOfMeasureRepository`, `SupplierRepository`, `BomRepository`, `PriceRepository`, `CalculationLogRepository`

### Domain

Responsabilidades:
- Lógica pura sem qualquer dependência de banco ou I/O
- Totalmente testável de forma unitária

Localização: `backend/app/domain/bom_calculator.py`

Classes:
- `BomNode` — dataclass representando um nó da árvore BOM
- `CalculationLine` — dataclass com quantidade acumulada, preço e custo de linha
- `BomCalculator` — motor de cálculo:
  - `detect_cycle()` — DFS para detectar ciclo antes de inserir filho
  - `ensure_no_cycle()` — lança `BomCycleError` se ciclo seria criado
  - `explode()` — percorre a árvore acumulando quantidades (considerando `loss_factor`)
  - `calculate()` — aplica preços às quantidades acumuladas, suporta filtro por grupo
  - `total_cost()` — soma custos de todas as linhas com `Decimal`

---

## Fluxo de um Cálculo BOM

```
1. Frontend envia POST /api/v1/calculos/produto com root_item_id + quantidade
2. Router valida payload via Pydantic e chama CalculationService
3. CalculationService:
   a. Valida item raiz (existe e está ativo)
   b. Abre log de execução com status PENDING
   c. Carrega árvore BOM via BomRepository (query recursiva)
   d. Carrega preços vigentes na data de referência via PriceRepository
   e. Monta BomNode com filhos recursivos
4. BomCalculator.explode():
   - Percorre a árvore em profundidade
   - Multiplica quantidade de cada nó por quantity * loss_factor dos ancestrais
   - Retorna lista de CalculationLine com quantidades acumuladas
5. BomCalculator.calculate():
   - Aplica o preço unitário a cada CalculationLine
   - Filtra por material_group_id se informado
   - Retorna linhas com line_cost calculado
6. ExportService:
   - Gera arquivo Excel com openpyxl
   - Persiste em disco (diretório exports/)
7. CalculationService:
   - Atualiza log com status SUCCESS, duration_ms e nome do arquivo
8. Router retorna JSON com linhas, totais e caminho do Excel
9. Frontend exibe resultado e permite download
```

---

## Decisões Técnicas

### FastAPI

Escolhido por:
- Alta produtividade com tipagem forte via Pydantic
- Documentação OpenAPI gerada automaticamente (Swagger + ReDoc)
- Performance comparable a frameworks Node.js (ASGI/Starlette)
- Integração simples com SQLAlchemy via dependency injection

### PostgreSQL com NUMERIC

Decisão de precisão financeira:
- Campos monetários e quantitativos usam `NUMERIC(18,6)` no banco
- Python usa `Decimal` em toda a camada de cálculo
- Nunca há `float` no caminho crítico de cálculo
- Conversão para `float` ocorre apenas na escrita do Excel (limitação `openpyxl`)

Trade-off aceito: `Decimal` é mais lento que `float`, mas em sistema financeiro a precisão é inegociável.

### Sem Sobrescrita Destrutiva de Preços

Motivação: rastreabilidade e auditoria.

Implementação:
```
POST /api/v1/precos/{item_id}
  → encerra registro atual (valid_to = now, is_current = false)
  → cria novo registro (is_current = true)
  → grava audit_price_change com old_price, new_price, changed_by, reason
```

Consequência: nunca há `UPDATE` em `item_price_history` — apenas `INSERT`.

### Cálculo Transitório (Não Persistido)

O resultado detalhado do cálculo não é salvo no banco. Apenas:
- Log mínimo da execução (`calculation_execution_log`)
- Arquivo Excel gerado em disco
- Referência ao arquivo no log

Motivação: evitar crescimento descontrolado do banco com dados derivados que podem ser recalculados.

### Detecção de Ciclo em Memória

Antes de qualquer `INSERT` em `bom_item`, o `BomCalculator.detect_cycle()` executa DFS na estrutura atual em memória.

Se o filho proposto já for ancestral do pai atual, a operação é bloqueada antes de tocar o banco. A API retorna `422 CYCLE_DETECTED` com o caminho do ciclo.

### Class Table Inheritance

`item` é a tabela base. `raw_material` e `finished_product` estendem `item` com `item_id` como PK + FK com `ON DELETE CASCADE`.

```
item (id, code, description, type, unit_of_measure_id, active, notes)
  ├── raw_material   (item_id PK→item, material_group_id FK, supplier_id FK, ...)
  └── finished_product (item_id PK→item, catalogo, linha, designer, peso_liquido)
```

Motivação: evitar colunas nulas desnecessárias em uma tabela única. Cada tipo de item tem sua tabela de detalhe com apenas as colunas relevantes.

### TanStack Query no Frontend

Escolhido para:
- Cache automático com `staleTime: 30s`
- `retry: 1` em falhas de rede
- Invalidação automática de cache após mutations
- Separação clara entre estado de servidor (TanStack Query) e estado de UI (useState)

---

## Tipos de Item

| Tipo | Tabela de detalhe | Endpoint dedicado | Exige grupo |
|---|---|---|---|
| `RAW_MATERIAL` | `raw_material` | `/api/v1/materias-primas/` | Sim |
| `FINISHED_PRODUCT` | `finished_product` | `/api/v1/produtos-acabados/` | Não |
| `SEMI_FINISHED` | — | `/api/v1/itens/` | Não |
| `PACKAGING` | — | `/api/v1/itens/` | Não |
| `SERVICE` | — | `/api/v1/itens/` | Não |

O endpoint `/api/v1/itens/` rejeita criação de `RAW_MATERIAL` ou `FINISHED_PRODUCT` com `422`.

---

## Filtro por Grupo de Matéria-Prima

O filtro por `material_group_id` no cálculo é aplicado **apenas na visualização do resultado**, não na estrutura da BOM.

- A BOM continua explodindo todos os itens independente de grupo
- O filtro remove linhas cujo grupo não corresponde ao filtrado
- O total exibido reflete apenas as linhas filtradas
- Motivação: permitir análise de custo por grupo sem criar BOMs duplicadas por grupo

---

## Migrations Alembic

| Revisão | Descrição |
|---|---|
| `20260326_0001` | Schema inicial: item, bom, bom_item, price_history, logs |
| `20260326_0002` | Tabela de fornecedores + FK em item |
| `20260326_0003` | Campo `unidade_conversao_id` em item |
| `20260414_0004` | Campos `catalogo`, `linha`, `designer` em item |
| `20260415_0005` | Reparo de colunas ausentes por schema drift |
| `20260415_0006` | Class table inheritance: tabelas `raw_material` e `finished_product` com migração de dados |
