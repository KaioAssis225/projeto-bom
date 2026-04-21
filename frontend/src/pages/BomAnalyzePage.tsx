import { AlertTriangle, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import * as calculosApi from "@/api/calculos";
import { useProdutoAcabado } from "@/hooks/useProdutoAcabado";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import type { BomAnalysisLine, FinishedProduct } from "@/types";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

export default function BomAnalyzePage() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
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

  const groupedLines = useMemo(() => {
    const data = analysisQuery.data;
    if (!data) return [];
    const byGroup = new Map<string, { groupName: string; lines: BomAnalysisLine[] }>();
    data.lines.forEach((line) => {
      const key = line.group_id ?? "__sem_grupo__";
      const existing = byGroup.get(key);
      if (existing) {
        existing.lines.push(line);
      } else {
        byGroup.set(key, { groupName: line.group_name ?? "Sem grupo", lines: [line] });
      }
    });
    return Array.from(byGroup.entries())
      .map(([groupId, { groupName, lines }]) => ({
        groupId,
        groupName,
        lines,
        subtotal: lines.reduce((sum, l) => sum + Number(l.line_cost), 0),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName, "pt-BR"));
  }, [analysisQuery.data]);

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
                  onClick={() => setSelectedProduct(item)}
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
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Produto Acabado</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {selectedProduct.code} — {selectedProduct.description}
              </h2>
            </div>

            {analysisQuery.data.missing_prices.length > 0 ? (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {analysisQuery.data.missing_prices.length === 1
                      ? "1 matéria-prima sem preço vigente"
                      : `${analysisQuery.data.missing_prices.length} matérias-primas sem preço vigente`}
                  </p>
                  <p className="text-xs text-amber-700">
                    Custos listados com R$ 0,00 para: {analysisQuery.data.missing_prices.join(", ")}
                  </p>
                </div>
              </div>
            ) : null}

            {groupedLines.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                BOM vazia. Nenhum componente cadastrado.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedLines.map((group) => (
                  <div key={group.groupId} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        {group.groupName}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {group.lines.length} {group.lines.length === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {group.lines.map((line) => (
                        <li key={line.item_id} className="flex items-start justify-between px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {line.code} — {line.description}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatDecimal(Number(line.quantity), 3)} {line.uom}
                              {line.missing_price ? (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                                  sem preço
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            R$ {formatCurrency(Number(line.line_cost))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-2 text-sm">
                      <span className="text-xs font-medium text-slate-500">Subtotal:</span>
                      <span className="font-semibold text-slate-800">
                        R$ {formatCurrency(group.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Total geral:
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    R$ {formatCurrency(Number(analysisQuery.data.custo_total))}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
