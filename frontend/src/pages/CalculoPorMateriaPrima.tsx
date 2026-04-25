import { ChevronDown, ChevronRight, Loader2, Sigma } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { useCalcularLote } from "@/hooks/useCalculos";
import { useGrupos } from "@/hooks/useGrupos";
import { useItens } from "@/hooks/useItens";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import type { CalculationLine, CalculationResponse } from "@/types";

type ParsedLine =
  | { ok: true; line: number; code: string; quantity: number }
  | { ok: false; line: number; raw: string; error: string };

const PLACEHOLDER = "PA001\t10\nPA002\t5\nPA003;25";

function parseInput(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, idx) => {
      const line = idx + 1;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const parts = trimmed.split(/[\t;,|\s]+/).filter(Boolean);
      if (parts.length < 2) {
        return { ok: false as const, line, raw, error: "Formato esperado: CODIGO  QUANTIDADE" };
      }
      const code = parts[0].toUpperCase();
      const qtyRaw = parts[1].replace(",", ".");
      const quantity = Number(qtyRaw);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { ok: false as const, line, raw, error: `Quantidade inválida: ${parts[1]}` };
      }
      return { ok: true as const, line, code, quantity };
    })
    .filter((x): x is ParsedLine => x !== null);
}

type GroupAggregate = {
  groupId: string;
  groupName: string;
  lines: CalculationLine[];
  itemCount: number;
  totalCost: number;
  uomTotals: { uom: string; quantity: number }[];
};

function aggregateByGroup(lines: CalculationLine[]): GroupAggregate[] {
  const map = new Map<string, GroupAggregate>();
  for (const line of lines) {
    const key = line.group_id ?? "__sem_grupo__";
    let agg = map.get(key);
    if (!agg) {
      agg = {
        groupId: key,
        groupName: line.group_name ?? "Sem grupo",
        lines: [],
        itemCount: 0,
        totalCost: 0,
        uomTotals: [],
      };
      map.set(key, agg);
    }
    agg.lines.push(line);
    agg.itemCount += 1;
    agg.totalCost += Number(line.line_cost);
    const existingUom = agg.uomTotals.find((u) => u.uom === line.uom);
    if (existingUom) existingUom.quantity += Number(line.accumulated_quantity);
    else agg.uomTotals.push({ uom: line.uom, quantity: Number(line.accumulated_quantity) });
  }
  return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName, "pt-BR"));
}

export default function CalculoPorMateriaPrima() {
  const [text, setText] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const calcularLote = useCalcularLote();
  const groupsQuery = useGrupos({ active_only: true, skip: 0, limit: 200 });
  const productsQuery = useItens({
    type: "FINISHED_PRODUCT",
    active_only: true,
    skip: 0,
    limit: 5000,
  });

  const productsByCode = useMemo(() => {
    const map = new Map<string, { id: string; description: string }>();
    for (const item of productsQuery.data?.items ?? []) {
      map.set(item.code.toUpperCase(), { id: item.id, description: item.description });
    }
    return map;
  }, [productsQuery.data?.items]);

  const parsed = useMemo(() => parseInput(text), [text]);

  const resolved = useMemo(() => {
    return parsed.map((p) => {
      if (!p.ok) return p;
      const product = productsByCode.get(p.code);
      if (!product) {
        return { ok: false as const, line: p.line, raw: p.code, error: `Código não encontrado: ${p.code}` };
      }
      return { ok: true as const, line: p.line, code: p.code, quantity: p.quantity, productId: product.id, description: product.description };
    });
  }, [parsed, productsByCode]);

  const validRows = resolved.filter((r) => r.ok) as Extract<typeof resolved[number], { ok: true }>[];
  const invalidRows = resolved.filter((r) => !r.ok) as Extract<typeof resolved[number], { ok: false }>[];

  const handleCalculate = async () => {
    if (validRows.length === 0 || !requestedBy.trim()) return;
    const response = await calcularLote.mutateAsync({
      itens: validRows.map((r) => ({ produto_id: r.productId, quantidade: r.quantity })),
      requested_by: requestedBy.trim(),
    });
    setResult(response);
    setExpanded(new Set());
  };

  const filteredLines = useMemo(() => {
    if (!result) return [];
    const onlyRm = result.linhas.filter((l) => l.type === "RAW_MATERIAL");
    if (!groupFilter) return onlyRm;
    return onlyRm.filter((l) => (l.group_id ?? "__sem_grupo__") === groupFilter);
  }, [result, groupFilter]);

  const groups = useMemo(() => aggregateByGroup(filteredLines), [filteredLines]);

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => {
        acc.itemCount += g.itemCount;
        acc.totalCost += g.totalCost;
        return acc;
      },
      { itemCount: 0, totalCost: 0 },
    );
  }, [groups]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCalculate =
    validRows.length > 0 && invalidRows.length === 0 && !!requestedBy.trim() && !calcularLote.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div>
              <label htmlFor="codes-input" className="text-sm font-medium text-slate-700">
                Códigos de Produto Acabado
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Cole do Excel: uma linha por produto, código e quantidade separados por TAB, espaço, vírgula ou ponto-e-vírgula.
              </p>
            </div>
            <textarea
              id="codes-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                <strong className="text-slate-700">{validRows.length}</strong> linha(s) válida(s)
              </span>
              {invalidRows.length > 0 ? (
                <span className="text-red-600">
                  <strong>{invalidRows.length}</strong> com erro
                </span>
              ) : null}
              {productsQuery.isLoading ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando catálogo de PAs...
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="cmp-requested-by" className="text-sm font-medium text-slate-700">
                Solicitante
              </label>
              <input
                id="cmp-requested-by"
                type="text"
                maxLength={100}
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleCalculate()}
              disabled={!canCalculate}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calcularLote.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sigma className="mr-2 h-4 w-4" />
              )}
              Calcular Matéria-Prima
            </button>

            {invalidRows.length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-semibold">Corrija antes de calcular:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {invalidRows.slice(0, 5).map((r, i) => (
                    <li key={i}>
                      Linha {r.line}: {r.error}
                    </li>
                  ))}
                  {invalidRows.length > 5 ? <li>... e mais {invalidRows.length - 5}</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Grupos</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{groups.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Itens (MP)</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{totals.itemCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Custo total</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">R$ {formatCurrency(totals.totalCost)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Consumo por Grupo</h2>
                <p className="text-xs text-slate-500">Clique em um grupo para ver as matérias-primas individuais.</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="cmp-group-filter" className="text-sm text-slate-600">
                  Filtrar grupo:
                </label>
                <select
                  id="cmp-group-filter"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Todos os grupos</option>
                  {(groupsQuery.data?.items ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value="__sem_grupo__">Sem grupo</option>
                </select>
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma matéria-prima para o filtro aplicado.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-10 px-3 py-3" />
                    <th className="px-4 py-3 text-left">Grupo</th>
                    <th className="px-4 py-3 text-right">Itens</th>
                    <th className="px-4 py-3 text-left">Quantidades por UN</th>
                    <th className="px-4 py-3 text-right">Custo total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((g) => {
                    const isOpen = expanded.has(g.groupId);
                    return (
                      <Fragment key={g.groupId}>
                        <tr
                          className="cursor-pointer bg-white transition hover:bg-slate-50"
                          onClick={() => toggle(g.groupId)}
                        >
                          <td className="px-3 py-3 text-slate-500">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{g.groupName}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{g.itemCount}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="flex flex-wrap gap-1.5">
                              {g.uomTotals.map((u) => (
                                <span
                                  key={u.uom}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                                >
                                  <span>{formatDecimal(u.quantity, 3)}</span>
                                  <span className="text-slate-500">{u.uom}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            R$ {formatCurrency(g.totalCost)}
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="bg-slate-50/40">
                            <td className="px-3" />
                            <td colSpan={4} className="px-4 py-3">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="px-2 py-1.5 text-left font-semibold">Código</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Descrição</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">UN</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Qtd acumulada</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Preço</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Custo</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.lines
                                    .slice()
                                    .sort((a, b) => a.code.localeCompare(b.code, "pt-BR"))
                                    .map((line) => (
                                      <tr key={line.item_id} className="border-t border-slate-200/60">
                                        <td className="px-2 py-1.5 font-mono font-semibold text-slate-900">
                                          {line.code}
                                        </td>
                                        <td className="px-2 py-1.5 text-slate-700">{line.description}</td>
                                        <td className="px-2 py-1.5 text-slate-600">{line.uom}</td>
                                        <td className="px-2 py-1.5 text-right text-slate-700">
                                          {formatDecimal(Number(line.accumulated_quantity), 3)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-slate-600">
                                          R$ {formatCurrency(line.price)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-900">
                                          R$ {formatCurrency(line.line_cost)}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-3 py-3" />
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{totals.itemCount}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                      R$ {formatCurrency(totals.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
