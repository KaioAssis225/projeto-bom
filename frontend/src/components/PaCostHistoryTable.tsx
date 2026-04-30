import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useVariacoesCustoPA } from "@/hooks/useProdutoAcabado";
import { formatCurrency } from "@/lib/utils";

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

type Props = {
  paId: string | null;
  pageSize?: number;
};

export default function PaCostHistoryTable({ paId, pageSize = 20 }: Props) {
  const [skip, setSkip] = useState(0);

  useEffect(() => {
    setSkip(0);
  }, [paId]);

  const query = useVariacoesCustoPA(paId, { skip, limit: pageSize });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Falha ao carregar histórico de custo.
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Nenhuma alteração de custo registrada ainda.
      </div>
    );
  }

  const showingFrom = skip + 1;
  const showingTo = Math.min(skip + pageSize, total);
  const canPrev = skip > 0;
  const canNext = skip + pageSize < total;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Data</th>
            <th className="px-4 py-2 text-right">Custo Total do PA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-slate-600">{formatDateTime(item.created_at)}</td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">
                R$ {formatCurrency(Number(item.new_pa_cost))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {total > pageSize ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs">
          <p className="text-slate-500">
            Mostrando {showingFrom}–{showingTo} de {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setSkip((s) => Math.max(0, s - pageSize))}
              className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setSkip((s) => s + pageSize)}
              className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
