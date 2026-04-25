import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Eraser,
  Loader2,
  Plus,
  Sigma,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCalcularLote } from "@/hooks/useCalculos";
import { useGrupos } from "@/hooks/useGrupos";
import { useItens } from "@/hooks/useItens";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import type { CalculationLine, CalculationResponse } from "@/types";

type Row = { id: string; code: string; quantity: string };

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2),
  code: "",
  quantity: "",
});

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
    const u = agg.uomTotals.find((x) => x.uom === line.uom);
    if (u) u.quantity += Number(line.accumulated_quantity);
    else agg.uomTotals.push({ uom: line.uom, quantity: Number(line.accumulated_quantity) });
  }
  for (const g of map.values()) {
    g.lines.sort((a, b) => a.code.localeCompare(b.code, "pt-BR"));
    g.uomTotals.sort((a, b) => a.uom.localeCompare(b.uom));
  }
  return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName, "pt-BR"));
}

// ─── PasteModal ──────────────────────────────────────────────────────────────

function PasteModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (rows: Row[]) => void;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  if (!open) return null;

  const parsed: Row[] = text
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const parts = raw.split(/[\t;,|\s]+/).filter(Boolean);
      return {
        id: Math.random().toString(36).slice(2),
        code: (parts[0] ?? "").toUpperCase(),
        quantity: (parts[1] ?? "").replace(",", "."),
      };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Colar do Excel</h2>
            <p className="text-sm text-slate-500">
              Selecione duas colunas (código e quantidade) e cole. TAB / ; / espaço aceitos.
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

        <div className="space-y-4 px-6 py-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="PA001\t10\nPA002\t5\nPA003;25"
            rows={8}
            spellCheck={false}
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{parsed.length} linha(s) detectada(s)</span>
            <div className="ml-auto flex gap-3">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="radio"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="accent-blue-600"
                />
                Substituir
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="radio"
                  checked={mode === "append"}
                  onChange={() => setMode("append")}
                  className="accent-blue-600"
                />
                Adicionar
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={parsed.length === 0}
            onClick={() => {
              onApply(mode === "replace" ? parsed : parsed);
              onClose();
            }}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === "replace" ? "Substituir linhas" : "Adicionar linhas"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalculoPorMateriaPrima() {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [requestedBy, setRequestedBy] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("__all__");
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

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

  const resolved = useMemo(() => {
    return rows.map((r) => {
      const code = r.code.trim().toUpperCase();
      const qty = Number((r.quantity || "").replace(",", "."));
      const isEmpty = !code && !r.quantity;
      const product = code ? productsByCode.get(code) : undefined;
      return {
        ...r,
        normalizedCode: code,
        qty,
        isEmpty,
        product,
        valid: !!product && Number.isFinite(qty) && qty > 0,
        codeError: code && !product ? "Não encontrado" : null,
        qtyError: r.quantity && (!Number.isFinite(qty) || qty <= 0) ? "Inválida" : null,
      };
    });
  }, [rows, productsByCode]);

  const validRows = resolved.filter((r) => r.valid);
  const lineErrors = resolved.filter((r) => !r.isEmpty && !r.valid).length;

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  const clearAll = () => {
    setRows([newRow(), newRow(), newRow()]);
    setResult(null);
    setActiveGroup("__all__");
    setOpenCards(new Set());
  };

  const handleCalculate = async () => {
    if (validRows.length === 0 || !requestedBy.trim()) return;
    const response = await calcularLote.mutateAsync({
      itens: validRows.map((r) => ({ produto_id: r.product!.id, quantidade: r.qty })),
      requested_by: requestedBy.trim(),
    });
    setResult(response);
    setActiveGroup("__all__");
    setOpenCards(new Set());
  };

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const allRmLines = useMemo(
    () => (result?.linhas ?? []).filter((l) => l.type === "RAW_MATERIAL"),
    [result],
  );

  const allGroups = useMemo(() => aggregateByGroup(allRmLines), [allRmLines]);
  const visibleGroups = useMemo(
    () => (activeGroup === "__all__" ? allGroups : allGroups.filter((g) => g.groupId === activeGroup)),
    [allGroups, activeGroup],
  );

  const totals = useMemo(
    () =>
      visibleGroups.reduce(
        (acc, g) => {
          acc.itemCount += g.itemCount;
          acc.totalCost += g.totalCost;
          return acc;
        },
        { itemCount: 0, totalCost: 0 },
      ),
    [visibleGroups],
  );

  const toggleCard = (id: string) =>
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => setOpenCards(new Set(visibleGroups.map((g) => g.groupId)));
  const collapseAll = () => setOpenCards(new Set());

  const canCalculate =
    validRows.length > 0 && lineErrors === 0 && !!requestedBy.trim() && !calcularLote.isPending;

  return (
    <>
      {/* Input — planilha-like editável */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Lista de Produtos Acabados</h2>
            <p className="text-xs text-slate-500">
              Digite o código do PA e a quantidade. A descrição aparece automaticamente quando o código existir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <ClipboardPaste className="h-4 w-4" />
              Colar do Excel
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Adicionar linha
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Eraser className="h-4 w-4" />
              Limpar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2 text-left">#</th>
                <th className="w-40 px-3 py-2 text-left">Código PA</th>
                <th className="w-32 px-3 py-2 text-left">Quantidade</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resolved.map((r, idx) => (
                <tr key={r.id} className={cn("transition", r.valid && "bg-green-50/30")}>
                  <td className="px-3 py-2 text-xs text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={r.code}
                      onChange={(e) => updateRow(r.id, { code: e.target.value.toUpperCase() })}
                      placeholder="Código"
                      className={cn(
                        "w-full rounded-md border bg-white px-2 py-1.5 font-mono text-sm outline-none transition focus:ring-2",
                        r.codeError
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-100",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.id, { quantity: e.target.value })}
                      placeholder="0"
                      className={cn(
                        "w-full rounded-md border bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none transition focus:ring-2",
                        r.qtyError
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-100",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {r.product ? (
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {r.product.description}
                      </span>
                    ) : r.codeError ? (
                      <span className="inline-flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Código não cadastrado
                      </span>
                    ) : r.qtyError ? (
                      <span className="inline-flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Quantidade inválida
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length === 1}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <strong>{validRows.length}</strong> válida(s)
            </div>
            {lineErrors > 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <strong>{lineErrors}</strong> com erro
              </div>
            ) : null}
            {productsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando catálogo...
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
            <input
              type="text"
              maxLength={100}
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Solicitante"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-48"
            />
            <button
              type="button"
              onClick={() => void handleCalculate()}
              disabled={!canCalculate}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calcularLote.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sigma className="mr-2 h-4 w-4" />
              )}
              Calcular
            </button>
          </div>
        </div>
      </div>

      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onApply={(parsed) => {
          // append, mas se a planilha estiver vazia (3 linhas em branco), substitui
          const existingFilled = rows.filter((r) => r.code || r.quantity);
          setRows(existingFilled.length === 0 ? parsed.length ? parsed : [newRow()] : [...existingFilled, ...parsed]);
        }}
      />

      {/* Resultado */}
      {result ? (
        <div ref={resultRef} className="mt-6 space-y-5">
          {/* Strip de totais inline (sem cards de 3xl) */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Grupos</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{visibleGroups.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Itens (MP)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.itemCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Custo total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">R$ {formatCurrency(totals.totalCost)}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Expandir todos
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Recolher
              </button>
            </div>
          </div>

          {/* Filtro como chips */}
          {allGroups.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filtrar grupo:
              </span>
              <button
                type="button"
                onClick={() => setActiveGroup("__all__")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  activeGroup === "__all__"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                Todos ({allGroups.length})
              </button>
              {allGroups.map((g) => (
                <button
                  key={g.groupId}
                  type="button"
                  onClick={() => setActiveGroup(g.groupId)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    activeGroup === g.groupId
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {g.groupName} <span className="ml-1 text-slate-400">·</span>{" "}
                  <span className="text-slate-500">{g.itemCount}</span>
                </button>
              ))}
            </div>
          ) : null}

          {/* Cards por grupo */}
          {visibleGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma matéria-prima para o filtro aplicado.
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleGroups.map((g) => {
                const isOpen = openCards.has(g.groupId);
                return (
                  <section
                    key={g.groupId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCard(g.groupId)}
                      className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-slate-400 transition-transform",
                            !isOpen && "-rotate-90",
                          )}
                        />
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{g.groupName}</h3>
                          <p className="text-xs text-slate-500">
                            {g.itemCount} {g.itemCount === 1 ? "matéria-prima" : "matérias-primas"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-1">
                        {g.uomTotals.map((u) => (
                          <div key={u.uom} className="text-right">
                            <p className="text-xs uppercase tracking-wide text-slate-400">Total {u.uom}</p>
                            <p className="text-sm font-semibold tabular-nums text-slate-800">
                              {formatDecimal(u.quantity, 3)}
                            </p>
                          </div>
                        ))}
                        <div className="ml-4 text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Custo</p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            R$ {formatCurrency(g.totalCost)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
                        <table className="min-w-full text-sm">
                          <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-2 py-2 text-left">Código</th>
                              <th className="px-2 py-2 text-left">Descrição</th>
                              <th className="px-2 py-2 text-left">UN</th>
                              <th className="px-2 py-2 text-right">Qtd necessária</th>
                              <th className="px-2 py-2 text-right">Preço</th>
                              <th className="px-2 py-2 text-right">Custo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60">
                            {g.lines.map((line) => (
                              <tr key={line.item_id}>
                                <td className="px-2 py-2 font-mono text-xs font-semibold text-slate-900">
                                  {line.code}
                                </td>
                                <td className="px-2 py-2 text-slate-700">{line.description}</td>
                                <td className="px-2 py-2 text-slate-600">{line.uom}</td>
                                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                                  {formatDecimal(Number(line.accumulated_quantity), 3)}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                                  R$ {formatCurrency(line.price)}
                                </td>
                                <td className="px-2 py-2 text-right font-medium tabular-nums text-slate-900">
                                  R$ {formatCurrency(line.line_cost)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
