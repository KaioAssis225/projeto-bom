import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";

import { useVariacoesCustoPA } from "@/hooks/useProdutoAcabado";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import type { BomCostImpact } from "@/types";

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

type Props = {
  paId: string | null;
  enabled?: boolean;
};

export default function VariacoesCustoTimeline({ paId, enabled = true }: Props) {
  const query = useVariacoesCustoPA(paId, enabled);
  const items = query.data?.items ?? [];

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Falha ao carregar histórico de variações.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
        Nenhuma variação registrada ainda. Aparecerão aqui após você alterar o preço de uma matéria-prima que este PA consome.
      </div>
    );
  }

  return (
    <ul className="relative">
      {items.map((impact) => (
        <TimelineItem key={impact.id} impact={impact} />
      ))}
    </ul>
  );
}
