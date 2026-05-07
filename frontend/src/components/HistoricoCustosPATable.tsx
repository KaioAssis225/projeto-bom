import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";
import { useEffect, useState } from "react";

import { useVariacoesCustoPA } from "@/hooks/useProdutoAcabado";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeltaCell({ delta, percent }: { delta: number; percent: number | null }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Minus className="h-3 w-3" /> 0,00
      </span>
    );
  }
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        delta > 0 ? "text-red-700" : "text-green-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : "−"}R$ {formatCurrency(Math.abs(delta))}
      {percent != null ? (
        <span className="text-[10px] opacity-80">
          ({delta > 0 ? "+" : "−"}
          {formatDecimal(Math.abs(percent), 2)}%)
        </span>
      ) : null}
    </span>
  );
}

type Props = {
  paId: string | null;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  groupId?: string;
};

export default function HistoricoCustosPATable({ paId, pageSize = 20, dateFrom, dateTo, groupId }: Props) {
  const [skip, setSkip] = useState(0);

  useEffect(() => {
    setSkip(0);
  }, [paId, dateFrom, dateTo, groupId]);

  const query = useVariacoesCustoPA(paId, { skip, limit: pageSize, dateFrom, dateTo, groupId });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Falha ao carregar histórico de custos.
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        Nenhuma variação registrada ainda. Aparecerão aqui após você alterar o preço de uma matéria-prima
        que este PA consome.
      </div>
    );
  }

  const showingFrom = total === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + pageSize, total);
  const canPrev = skip > 0;
  const canNext = skip + pageSize < total;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-right">Custo do PA</th>
              <th className="px-4 py-3 text-right">Variação</th>
              <th className="px-4 py-3 text-left">Causa</th>
              <th className="px-4 py-3 text-left">Preço da MP</th>
              <th className="px-4 py-3 text-left">Autor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const delta = Number(item.delta_cost);
              const percent = item.delta_percent != null ? Number(item.delta_percent) : null;
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      {item.old_pa_cost != null ? (
                        <span className="text-xs text-slate-400 line-through tabular-nums">
                          R$ {formatCurrency(Number(item.old_pa_cost))}
                        </span>
                      ) : null}
                      <span className="font-semibold tabular-nums text-slate-900">
                        R$ {formatCurrency(Number(item.new_pa_cost))}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeltaCell delta={delta} percent={percent} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {item.raw_material_code}
                      </span>
                      <span className="text-xs text-slate-500">{item.raw_material_description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {item.old_unit_price != null ? (
                      <>
                        <span className="tabular-nums">R$ {formatCurrency(Number(item.old_unit_price))}</span>
                        {" → "}
                      </>
                    ) : (
                      <span className="italic text-slate-400">— → </span>
                    )}
                    <span className="font-medium tabular-nums text-slate-700">
                      R$ {formatCurrency(Number(item.new_unit_price))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="flex flex-col">
                      <span className="text-slate-700">{item.changed_by}</span>
                      {item.changed_reason ? (
                        <span className="italic text-slate-500">{item.changed_reason}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs">
          <p className="text-slate-500">
            Mostrando {showingFrom}–{showingTo} de {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setSkip((s) => Math.max(0, s - pageSize))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setSkip((s) => s + pageSize)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
