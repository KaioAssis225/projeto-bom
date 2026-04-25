# DESIGN.md — BOM Sistema

Documento de design em texto puro, lido por agentes de IA para gerar UI consistente.
Formato: 9 seções padrão [awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
Stack: React 18 + TypeScript + Vite + **Tailwind CSS** + shadcn/ui (Radix) + Lucide.

> Sempre que adicionar uma nova feature de UI, referencie este arquivo (ex.: "siga DESIGN.md §2 e §4") e atualize-o quando uma decisão nova for tomada.

---

## 1. Visual Theme & Atmosphere

Aplicação interna B2B para análise de custos industriais (BOM). Visual:

- **Clean enterprise tool** — denso de dados, mas com respiro. Inspiração: Linear / Stripe Dashboard.
- **Sóbrio**: paleta predominantemente neutra (slate), acentos pontuais em azul para CTAs.
- **Calmo, não festivo**: nada de gradientes, glassmorphism, ou animações decorativas. Apenas micro-transições funcionais (`transition` em hover/focus).
- **Confiável**: cantos arredondados moderados (`rounded-2xl` em containers, `rounded-lg` em controles), sombras sutis (`shadow-sm`).

---

## 2. Color Palette & Roles

Definidas em [`frontend/tailwind.config.ts`](frontend/tailwind.config.ts) e usadas via classes utilitárias do Tailwind.

### Tokens semânticos (preferir)

| Token | Hex | Papel |
|---|---|---|
| `background` | `#f8fafc` (slate-50) | fundo de página |
| `foreground` | `#0f172a` (slate-900) | texto principal |
| `border` | `#e2e8f0` (slate-200) | bordas neutras |
| `card` | `#ffffff` | superfície de cartão/modal |
| `primary` | `#2563eb` (blue-600) | CTAs, foco, link ativo |
| `primary.foreground` | `#ffffff` | texto sobre primary |
| `muted` | `#f1f5f9` (slate-100) | fundos secundários |
| `muted.foreground` | `#475569` (slate-600) | texto secundário |
| `success` | `#16a34a` (green-600) | confirmações, status ativo |
| `warning` | `#ca8a04` (yellow-600) | alertas brandos |
| `danger` | `#dc2626` (red-600) | erros, ações destrutivas |

### Escala slate (uso direto)

`slate-50` `slate-100` `slate-200` (bordas) `slate-300` (inputs) `slate-500` `slate-600` `slate-700` `slate-900` (títulos).

### Combinações canônicas

- **Status pill ativo**: `bg-green-100 text-green-800`
- **Status pill inativo**: `bg-slate-100 text-slate-600`
- **Erro inline**: `text-red-600` (mensagem) sobre `bg-red-50 border-red-200`
- **Aviso brando**: `text-amber-700` (texto) sobre fundo neutro
- **Overlay de modal**: `bg-slate-950/30`

**Don't:** introduzir cores fora desta paleta. Se precisar de uma nova cor (ex.: nova categoria de status), adicione aqui antes.

---

## 3. Typography Rules

Família declarada em [`frontend/src/index.css`](frontend/src/index.css):
`"Segoe UI", "Helvetica Neue", sans-serif` (system stack — sem download de fonte).

Para código/códigos de item: `font-mono` (system mono).

### Hierarquia (Tailwind)

| Uso | Classes |
|---|---|
| H1 página | `text-xl font-semibold text-slate-900` |
| H1 modal | `text-lg font-semibold text-slate-900` |
| H2 destaque card | `text-2xl font-semibold text-slate-900` |
| Subtítulo / lead | `text-sm text-slate-500 mt-1` |
| Body | `text-sm text-slate-700` |
| Body forte | `text-sm font-medium text-slate-900` |
| Label de form | `text-sm font-medium text-slate-700` |
| Caption / helper | `text-xs text-slate-500` |
| Tabela header | `text-xs font-semibold uppercase tracking-wide text-slate-600` |
| Código / SKU | `font-mono text-xs font-semibold text-slate-900` |

Decimais e moeda renderizados em pt-BR (vírgula como separador) via helpers `formatDecimal` / `formatCurrency` em [`frontend/src/lib/utils.ts`](frontend/src/lib/utils.ts).

---

## 4. Component Stylings

Baseclasses canônicas — sempre reutilizar.

### Botão primário (CTA)
```tsx
className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
```

### Botão secundário / outline
```tsx
className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
```

### Botão destrutivo inline (texto)
```tsx
className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
```

### Input / Select / Textarea
```tsx
className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
```
Quando readonly: adicionar `cursor-not-allowed bg-slate-100 text-slate-500`.
Estado de erro: mensagem em `<p className="text-sm text-red-600">` logo abaixo.

### Card / Painel
```tsx
className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
```
Card destacado / hero: `rounded-3xl ... p-6`.

### Modal
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4`
- Container: `w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl`
- Header: `flex items-center justify-between border-b border-slate-200 px-6 py-4`
- Body: `space-y-4 px-6 py-5 max-h-[80vh] overflow-y-auto`
- Footer: `flex justify-end gap-3 border-t border-slate-200 px-6 py-4`
- Botão fechar (canto): `<X />` em `rounded-md p-2 text-slate-500 hover:bg-slate-100`

### Tabela
- Container: `overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`
- `<thead>`: `bg-slate-50` + headers `text-xs font-semibold uppercase tracking-wide text-slate-600` (ou `text-left font-semibold text-slate-600`)
- `<tbody>`: `divide-y divide-slate-100`
- Linha: `hover:bg-slate-50`
- Padding célula: `px-4 py-3`

### Pill / Badge
```tsx
className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
```
Variantes: ativo `bg-green-100 text-green-800` · inativo `bg-slate-100 text-slate-600` · alerta `bg-amber-100 text-amber-800`.

### Tabs (página)
Lista horizontal; tab ativo ganha `border-b-2 border-blue-600 text-blue-700`; demais `text-slate-500 hover:text-slate-700`.

### Toast
Via `sonner`. `toast.success(msg)` · `toast.error(extractErrorMessage(error))`. Não rolar a própria implementação.

### Loading
- Inline: `<Loader2 className="h-4 w-4 animate-spin" />`
- Skeleton: `animate-pulse rounded bg-slate-200` no shape do conteúdo final.

### Empty state
```tsx
<div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
  Nenhum item encontrado.
</div>
```

---

## 5. Layout Principles

- **Escala de espaçamento** (Tailwind): `2 · 3 · 4 · 5 · 6 · 8` (= 8/12/16/20/24/32 px). Evitar valores fora desta escala.
- **Padding interno padrão**:
  - Card: `p-5` (24px) ou `p-6` (32px) para hero.
  - Célula de tabela: `px-4 py-3`.
  - Modal body: `px-6 py-5`.
- **Gaps**: `gap-2` (botões agrupados), `gap-3` (labels/inputs), `gap-4` (grids), `gap-5` (seções dentro de card).
- **Larguras máximas**: modal padrão `max-w-2xl`, modal de import/histórico `max-w-3xl`, cards de detalhe sem `max-w` (preenchem o pai).
- **Grid de formulário**: `grid gap-4 md:grid-cols-2` para pares de campos relacionados.
- **Página principal**: container com `space-y-6` entre seções; cabeçalho de filtros sempre dentro de um card próprio acima da tabela.

---

## 6. Depth & Elevation

Apenas três níveis. Não criar novos.

| Nível | Quando | Classe |
|---|---|---|
| 0 (flat) | superfícies internas dentro de um card | sem sombra |
| 1 (sutil) | cards e tabelas em página | `shadow-sm` |
| 2 (panel) | painéis flutuantes / dropdowns | `shadow-lg` ou `shadow-panel` (token custom) |
| 3 (modal) | diálogos | `shadow-xl` + overlay `bg-slate-950/30` |

Z-index: dropdowns `z-20`, modais `z-50`. Não inventar valores intermediários.

---

## 7. Do's and Don'ts

**Do**
- Reutilizar as classes canônicas da §4 — não recriar variações ad-hoc.
- Usar `cn(...)` (de `@/lib/utils`) para combinar classes condicionais.
- Aplicar `disabled:opacity-50/60` + `disabled:cursor-not-allowed` em todo controle interativo.
- Mostrar feedback de carregamento (`Loader2 animate-spin`) em qualquer botão que dispara mutation.
- Mensagens em **português pt-BR**, frases curtas, sem jargão técnico no usuário final.
- Datas e números formatados via helpers de `lib/utils.ts` (pt-BR).

**Don't**
- Não usar emojis decorativos na UI (exceto se o usuário explicitamente pedir). Botões dropdown legados com `✏️` / `🚫` são exceção tolerada — ao tocar, **migrar para ícone Lucide**.
- Não introduzir nova família de fonte ou peso fora dos listados na §3.
- Não usar `bg-gradient-*`, `backdrop-blur`, `mix-blend-*`.
- Não criar sombras customizadas além das três da §6.
- Não usar `<div>` clicável — sempre `<button type="button">`.
- Não confiar em cor para transmitir status sozinho — sempre acompanhar de label textual (ex.: pill "Ativo" + verde).

---

## 8. Responsive Behavior

Breakpoints Tailwind padrão:

| | px | uso típico |
|---|---|---|
| `sm` | 640 | refinamentos pontuais |
| `md` | 768 | grid 1→2 colunas em formulários |
| `lg` | 1024 | layouts de duas zonas (lateral + main) |
| `xl` | 1280 | header da página: empilhado → linha única (`xl:flex-row xl:items-center xl:justify-between`) |

- **Mobile first**: classes sem prefixo descrevem o estado mobile; adicionar prefixos (`md:`, `xl:`) só para sobrescrever no maior.
- **Tabelas**: envolver em `<div className="overflow-x-auto">` — não tentar reflow tipo card em mobile (esta é uma ferramenta interna, scroll horizontal é aceitável).
- **Alvos de toque**: mínimo `h-8` (32px) em controles densos, `h-9`/`h-10` em CTAs principais.
- **Modais**: ocupam até `max-w-2xl` em desktop; em mobile são preenchidos pela margem `px-4` do overlay.

---

## 9. Agent Prompt Guide

Prompts prontos para colar quando pedir UI nova:

> "Crie um modal de [X] seguindo DESIGN.md §4 (Modal) e §3 (Typography). Use as classes canônicas literais — não invente variações."

> "Adicione um botão de ação primária ao header da página [Y]. Use o snippet de Botão primário em DESIGN.md §4. Ao lado, um botão secundário usando o snippet de Botão outline."

> "Mostre uma tabela com colunas [a, b, c]. Siga DESIGN.md §4 (Tabela): container `rounded-2xl`, header `bg-slate-50` em uppercase tracking-wide, linhas com `hover:bg-slate-50` e divisor `divide-y divide-slate-100`."

> "Empty state quando não houver dados: copie o snippet de Empty state da §4. Não mostrar a tabela vazia com `<thead>` solto."

> "Toast de sucesso ao completar mutation, toast de erro com `extractErrorMessage(error)`. Sem alert nativo do navegador."

### Checklist antes de mergear UI
- [ ] Reusou snippet da §4 ou tem justificativa clara para variação
- [ ] Cores limitadas à paleta da §2
- [ ] Espaçamentos dentro da escala da §5
- [ ] Estados (`hover`, `focus`, `disabled`) cobertos
- [ ] Loading e empty state implementados
- [ ] Mensagens em pt-BR
- [ ] Sem regressão em mobile (scroll-x ok em tabelas, modal não estoura viewport)

---

**Manutenção:** ao alterar este documento, registrar a mudança em `C:\Users\koian\OneDrive\Desktop\Programador\ProjetoGH\README.md` (mesma convenção do log de mudanças).
