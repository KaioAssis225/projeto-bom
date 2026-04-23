import { ChevronDown, ChevronRight, Loader2, Pencil, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import * as calculosApi from "@/api/calculos";
import { useProdutoAcabado } from "@/hooks/useProdutoAcabado";
import { cn, formatDecimal } from "@/lib/utils";
import type { BomAnalysisLine, FinishedProduct } from "@/types";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

type GroupRow = {
  groupId: string;
  groupName: string;
  lines: BomAnalysisLine[];
  uom1: string;
  uom2: string;
  qty1: number;
  qty2: number;
  uom1Mixed: boolean;
  uom2Mixed: boolean;
};

function aggregateGroups(lines: BomAnalysisLine[]): GroupRow[] {
  const map = new Map<string, BomAnalysisLine[]>();
  lines.forEach((line) => {
    const key = line.group_id ?? "__sem_grupo__";
    const arr = map.get(key);
    if (arr) arr.push(line);
    else map.set(key, [line]);
  });
  return Array.from(map.entries())
    .map(([groupId, groupLines]) => {
      const uoms1 = new Set(groupLines.map((l) => l.uom));
      const uoms2 = new Set(
        groupLines.map((l) => l.uom2 ?? "").filter((v) => v !== ""),
      );
      const qty1 = groupLines.reduce((s, l) => s + Number(l.quantity), 0);
      const qty2 = groupLines.reduce((s, l) => s + Number(l.quantity2 ?? 0), 0);
      return {
        groupId,
        groupName: groupLines[0].group_name ?? "Sem grupo",
        lines: groupLines.slice().sort((a, b) => a.code.localeCompare(b.code, "pt-BR")),
        uom1: uoms1.size === 1 ? [...uoms1][0] : [...uoms1].join(" / "),
        uom2: uoms2.size === 0 ? "—" : uoms2.size === 1 ? [...uoms2][0] : [...uoms2].join(" / "),
        qty1,
        qty2,
        uom1Mixed: uoms1.size > 1,
        uom2Mixed: uoms2.size > 1,
      };
    })
    .sort((a, b) => a.groupName.localeCompare(b.groupName, "pt-BR"));
}

export default function BomAnalyzePage({ onEdit }: { onEdit?: (product: FinishedProduct) => void } = {}) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);

  const productsQuery = useProdutoAcabado({
    desc: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const analysisQuery = useQuery({
    queryKey: ["calculos", "custo-bom-analise", selectedProduct?.id ?? ""],
    queryFn: () => calculosApi.getCustoBomAnalise(selectedProduct!.id),
    enabled: !!selectedProduct,
    retry: false,
  });

  const hasNoBom =
    axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404;

  const groups = useMemo(
    () => (analysisQuery.data ? aggregateGroups(analysisQuery.data.lines) : []),
    [analysisQuery.data],
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Analisar BOM</h1>
          <p className="mt-1 text-sm text-slate-500">Selecione o Produto Acabado.</p>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 min-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : productsQuery.data?.items?.length ? (
              productsQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(item);
                    setExpanded(new Set());
                  }}
                  className={cn(
                    "flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left last:border-b-0",
                    selectedProduct?.id === item.id
                      ? "border-l-4 border-l-blue-600 bg-blue-50"
                      : "hover:bg-slate-50",
                  )}
                >
                  <span className="text-sm font-medium text-slate-900">{item.code}</span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Nenhum produto encontrado</div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-slate-50/30">
        {!selectedProduct ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
            Selecione um Produto Acabado na lateral para visualizar a análise.
          </div>
        ) : analysisQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : hasNoBom ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Sem BOM cadastrada</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedProduct.code} — {selectedProduct.description}
              </p>
            </div>
          </div>
        ) : analysisQuery.data ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">Produto Acabado</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedProduct.code} — {selectedProduct.description}
                </h2>
              </div>
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(selectedProduct)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <Pencil className="h-4 w-4" />
                  Editar BOM
                </button>
              ) : null}
            </div>

            {groups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                BOM vazia. Nenhum componente cadastrado.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="w-10 px-3 py-3" />
                      <th className="px-4 py-3 text-left">Grupo</th>
                      <th className="px-4 py-3 text-left">UN 1</th>
                      <th className="px-4 py-3 text-right">QTD</th>
                      <th className="px-4 py-3 text-left">UN 2</th>
                      <th className="px-4 py-3 text-right">QTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.map((group) => {
                      const isOpen = expanded.has(group.groupId);
                      return (
                        <Fragment key={group.groupId}>
                          <tr
                            className="cursor-pointer bg-white transition hover:bg-slate-50"
                            onClick={() => toggle(group.groupId)}
                          >
                            <td className="px-3 py-3 text-slate-500">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{group.groupName}</td>
                            <td
                              className={cn(
                                "px-4 py-3 text-slate-700",
                                group.uom1Mixed && "text-amber-700",
                              )}
                            >
                              {group.uom1}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800">
                              {formatDecimal(group.qty1, 3)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-slate-700",
                                group.uom2Mixed && "text-amber-700",
                              )}
                            >
                              {group.uom2}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800">
                              {group.qty2 > 0 ? formatDecimal(group.qty2, 3) : "—"}
                            </td>
                          </tr>
                          {isOpen
                            ? group.lines.map((line) => (
                                <tr key={line.item_id} className="bg-slate-50/40">
                                  <td className="px-3 py-2" />
                                  <td className="px-4 py-2 pl-8 text-slate-700">
                                    <span className="text-xs font-medium text-slate-500">{line.code}</span>
                                    <span className="ml-2 text-slate-700">{line.description}</span>
                                  </td>
                                  <td className="px-4 py-2 text-slate-600">{line.uom}</td>
                                  <td className="px-4 py-2 text-right text-slate-700">
                                    {formatDecimal(Number(line.quantity), 3)}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600">{line.uom2 ?? "—"}</td>
                                  <td className="px-4 py-2 text-right text-slate-700">
                                    {line.quantity2 != null
                                      ? formatDecimal(Number(line.quantity2), 3)
                                      : "—"}
                                  </td>
                                </tr>
                              ))
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
