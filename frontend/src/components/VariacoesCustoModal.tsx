import { ArrowDownRight, ArrowUpRight, Loader2, Minus, X } from "lucide-react";

import { useVariacoesCustoPA } from "@/hooks/useProdutoAcabado";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import type { BomCostImpact } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  paId: string | null;
  paCode?: string;
  paDescription?: string;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeltaBadge({ delta, percent }: { delta: number; percent: number | null }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        <Minus className="h-3 w-3" />
        Sem variação
      </span>
    );
  }
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        delta > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}R$ {formatCurrency(Math.abs(delta))}
      {percent != null ? (
        <span className="opacity-80">
          ({delta > 0 ? "+" : "−"}
          {formatDecimal(Math.abs(percent), 2)}%)
        </span>
      ) : null}
    </span>
  );
}

function TimelineItem({ impact }: { impact: BomCostImpact }) {
  const delta = Number(impact.delta_cost);
  return (
    <li className="relative flex gap-4 py-4">
      <div className="absolute left-[7px] top-[14px] bottom-0 w-px bg-slate-200" aria-hidden />
      <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-blue-500 bg-white" />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-slate-900">
            <span className="font-mono text-xs uppercase text-slate-500">{impact.raw_material_code}</span>{" "}
            <span className="text-slate-700">{impact.raw_material_description}</span>
          </span>
          <DeltaBadge delta={delta} percent={impact.delta_percent != null ? Number(impact.delta_percent) : null} />
        </div>
        <div className="grid gap-1 text-xs text-slate-600 md:grid-cols-2">
          <div>
            Preço unitário:{" "}
            {impact.old_unit_price != null ? (
              <span className="tabular-nums">R$ {formatCurrency(Number(impact.old_unit_price))}</span>
            ) : (
              <span className="italic text-slate-400">primeira definição</span>
            )}{" "}
            → <span className="tabular-nums font-medium">R$ {formatCurrency(Number(impact.new_unit_price))}</span>
          </div>
          <div>
            Custo do PA:{" "}
            {impact.old_pa_cost != null ? (
              <span className="tabular-nums">R$ {formatCurrency(Number(impact.old_pa_cost))}</span>
            ) : (
              <span className="italic text-slate-400">—</span>
            )}{" "}
            → <span className="tabular-nums font-medium">R$ {formatCurrency(Number(impact.new_pa_cost))}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {formatDate(impact.created_at)} por <strong className="text-slate-700">{impact.changed_by}</strong>
          {impact.changed_reason ? (
            <>
              {" — "}
              <span className="italic">{impact.changed_reason}</span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function VariacoesCustoModal({ open, onClose, paId, paCode, paDescription }: Props) {
  const query = useVariacoesCustoPA(open ? paId : null);

  if (!open) return null;

  const items = query.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Histórico de Variações de Custo</h2>
            <p className="text-sm text-slate-500">
              {paCode && paDescription ? (
                <>
                  <span className="font-mono">{paCode}</span> — {paDescription}
                </>
              ) : (
                "Cada entrada representa uma alteração de preço de matéria-prima que afetou este PA."
              )}
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {query.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : query.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Falha ao carregar histórico.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma variação registrada ainda. Variações aparecem aqui após você alterar o preço de uma matéria-prima
              que este PA consome.
            </div>
          ) : (
            <ul className="relative">
              {items.map((impact) => (
                <TimelineItem key={impact.id} impact={impact} />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
          <p className="text-xs text-slate-500">
            {query.data ? `${query.data.total} variação(ões) registrada(s)` : ""}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
