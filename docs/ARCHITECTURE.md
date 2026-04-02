# Arquitetura do BOM Sistema

## Visão Geral

O sistema foi construído para suportar cadastro e cálculo de custo de estruturas BOM multinível, preservando histórico de preços, evitando sobrescrita destrutiva e mantendo cálculo como operação transitória.

## Diagrama Textual da Arquitetura

```text
┌────────────────────────────────────────────────────────────┐
│                         Frontend                           │
│ React + TypeScript + Vite + TanStack Query + Tailwind CSS │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTP/JSON
                               ▼
┌────────────────────────────────────────────────────────────┐
│                         FastAPI API                        │
│                    /api/v1/* routers                       │
└──────────────────────────────┬─────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────┐
│                         Services                           │
│ Regras de negócio, validações, orquestração, logs, Excel  │
└───────────────┬───────────────────────┬────────────────────┘
                │                       │
                ▼                       ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│       Repositories       │   │          Domain             │
│ SQLAlchemy / consultas   │   │ BomCalculator (lógica pura) │
└───────────────┬──────────┘   └──────────────┬──────────────┘
                │                             
                ▼                             
┌────────────────────────────────────────────────────────────┐
│                       PostgreSQL 15+                       │
│ BOM, itens, preços, auditoria, logs, constraints, views   │
└────────────────────────────────────────────────────────────┘
```

## Fluxo de um Cálculo BOM

```text
1. Usuário envia requisição de cálculo pelo frontend
2. Router recebe payload e delega ao CalculationService
3. CalculationService:
   - valida item raiz
   - abre log de execução
   - carrega árvore da BOM via bom_repository
   - carrega preços vigentes por data
   - monta nós de domínio
4. BomCalculator:
   - explode quantidades
   - acumula consumo por item
   - aplica preços
   - retorna linhas consolidadas
5. CalculationService:
   - aplica filtro por grupo, se informado
   - calcula totais
   - chama ExportService
   - grava log final de sucesso ou erro
6. API retorna JSON com linhas, totais e caminho do Excel
7. Frontend permite download do arquivo
```

## Camadas da Aplicação

## `router`

Responsável por:

- receber requisições HTTP
- validar parâmetros de rota, query e body
- serializar respostas
- mapear exceções em códigos HTTP

Exemplo:

```text
/api/v1/itens
/api/v1/bom
/api/v1/precos
/api/v1/calculos
```

## `service`

Responsável por:

- aplicar regras de negócio
- validar estado do domínio
- orquestrar múltiplos repositórios
- controlar transações lógicas
- disparar geração de Excel e logs

Exemplos:

- `ItemService`
- `BomService`
- `PriceService`
- `CalculationService`

## `repository`

Responsável por:

- encapsular queries SQLAlchemy
- isolar o acesso ao banco
- retornar entidades persistidas
- montar consultas recursivas quando necessário

Exemplos:

- `ItemRepository`
- `BomRepository`
- `PriceRepository`

## `domain`

Responsável por:

- lógica pura, sem dependência de banco
- regras algorítmicas e testáveis

Exemplo:

- `BomCalculator`

## Decisões Técnicas

## FastAPI no backend

Foi escolhido por oferecer:

- alta produtividade
- tipagem forte com Pydantic
- documentação OpenAPI automática
- integração simples com SQLAlchemy

## SQLAlchemy 2.x + Alembic

Permitem:

- modelagem explícita
- controle de migrations
- queries expressivas
- compatibilidade com PostgreSQL

## PostgreSQL

Foi adotado por:

- suporte sólido a `NUMERIC`
- `WITH RECURSIVE`
- constraints e índices parciais
- suporte robusto a `JSONB`

## React + Vite

No frontend, essa combinação entrega:

- build rápido
- boa DX
- tipagem forte com TypeScript
- modularidade por hooks e páginas

## TanStack Query

Foi escolhido para:

- cache de dados por chave
- invalidação automática
- tratamento padronizado de loading/error
- integração simples com mutations

## Regras de Negócio Críticas

## BOM multinível

- A estrutura suporta profundidade arbitrária.
- Cada nó pode ter filhos e netos sem limite fixo.
- O cálculo percorre toda a árvore.

## Histórico de preços sem sobrescrita

- Nunca há `UPDATE` destrutivo do preço vigente.
- Ao registrar novo preço:
  - o registro atual é encerrado com `valid_to`
  - `is_current` passa para `false`
  - um novo registro é criado
  - a auditoria é gravada

## Cálculo não persistido

- O resultado detalhado do cálculo não é salvo no banco.
- O sistema só persiste:
  - log mínimo da execução
  - auditoria operacional
  - arquivo Excel gerado em disco

## Validação de ciclo

- Antes de inserir um filho na BOM, a aplicação verifica se isso criaria ciclo.
- Se um item filho já for ancestral do pai atual, a operação é bloqueada.
- A API retorna erro claro com o caminho do ciclo detectado.

## Uso de `Decimal` e nunca `float`

- Preço, quantidade e custo usam `Decimal` no Python.
- No banco, os campos monetários e quantitativos usam `NUMERIC`.
- Conversão para `float` só ocorre no momento de escrita em Excel, por limitação do `openpyxl`.

## Observações Importantes

- `loss_factor` é coluna gerada no banco e não calculada manualmente no Python.
- O filtro por grupo de matéria-prima é uma visão do resultado do cálculo, não uma duplicação estrutural da BOM.
- `RAW_MATERIAL` exige grupo de matéria-prima associado.
