# Agrupamento Setor → Grupo → MP no Breakdown de Custo do PA — Design

## Objetivo

No modal de histórico de custo do PA (`VariacoesCustoModal`), a seção "Matérias-Primas" exibe hoje uma tabela plana. O objetivo é agrupar visualmente as linhas em **Setor → Grupo → MP**, com subtotal de custo por setor.

## Escopo

Apenas leitura (display). Nenhuma migration necessária — `setor_id` já existe em `raw_material`.

## Arquivos afetados

### Backend (editados)

| Arquivo | Mudança |
|---|---|
| `backend/app/repositories/bom_repository.py` | Adicionar `LEFT JOIN setor` na query SQL; selecionar `setor_id`, `setor_name` |
| `backend/app/domain/bom_calculator.py` | Adicionar `setor_id: UUID | None` e `setor_name: str | None` em `BomNode` |
| `backend/app/schemas/calculation.py` | Adicionar `setor_id: UUID | None` e `setor_name: str | None` em `BomAnalysisLine` |
| `backend/app/services/calculation_service.py` | Passar `setor_id`/`setor_name` em `_build_nodes` e no loop de `get_bom_cost_analysis`; atualizar sort key |

### Frontend (editados)

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/index.ts` | Adicionar `setor_id: string | null` e `setor_name: string | null` em `BomAnalysisLine` |
| `frontend/src/components/VariacoesCustoModal.tsx` | Substituir `MpBreakdownTable` por componente agrupado |

## Comportamento visual

```
▼ Setor A                                     R$ 120,00
    ▼ Grupo X
        MP-001  Aço inox 304       R$ 80,00
        MP-002  Parafuso M8        R$ 40,00
    ▼ Grupo Y
        MP-003  Tinta epóxi        R$ 0,00 ⚠ sem preço
▼ Setor B                                     R$ 50,00
    ▼ Sem grupo
        MP-004  Embalagem kraft    R$ 50,00
▼ Sem setor                                   R$ 30,00
    ▼ Grupo Z
        MP-005  Cola PVA           R$ 30,00
```

- Cabeçalho de setor: nome em negrito + subtotal de custo do setor alinhado à direita.
- Cabeçalho de grupo: nome em cinza, recuado.
- Linha de MP: código, descrição, custo — igual ao design atual. Badge "sem preço" se `missing_price`.
- Setores sem nome → exibidos como **"Sem setor"** (MPs com `setor_name = null`).
- Grupos sem nome → exibidos como **"Sem grupo"**.
- Ordem: setores e grupos em ordem alfabética; MPs em ordem de código dentro do grupo.

## Lógica de agrupamento (frontend)

```ts
// Agrupa lines em: Map<setor_name | null, Map<group_name | null, BomAnalysisLine[]>>
// Subtotal por setor = soma de line_cost das MPs daquele setor
// Render: para cada setor → cabeçalho com subtotal → para cada grupo → linhas de MP
```

## Alterações no backend

### SQL (`get_calculation_structure`)

Adicionar ao SELECT:
```sql
s.id   AS setor_id,
s.name AS setor_name,
```

Adicionar ao FROM/JOIN:
```sql
LEFT JOIN setor s ON s.id = rm.setor_id
```

### Sort key em `get_bom_cost_analysis`

```python
lines.sort(key=lambda line: (line.setor_name or "￿", line.group_name or "￿", line.code))
```

## O que NÃO muda

- `BomCostAnalysis` mantém `lines: list[BomAnalysisLine]` — o agrupamento é feito no frontend.
- Subtotal por grupo não é exibido (só subtotal por setor).
- Nenhuma outra tela (BomAnalyzePage, CalculoPorMateriaPrima) é alterada.
