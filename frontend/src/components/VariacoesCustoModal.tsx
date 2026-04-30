import axios from "axios";
import { Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import * as calculosApi from "@/api/calculos";
import HistoricoCustosPATable from "@/components/HistoricoCustosPATable";
import PaCostHistoryTable from "@/components/PaCostHistoryTable";
import { formatCurrency } from "@/lib/utils";
import type { BomAnalysisLine } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  paId: string | null;
  paCode?: string;
  paDescription?: string;
};

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </h3>
  );
}

function MpBreakdownTable({ lines }: { lines: BomAnalysisLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-slate-500">Nenhuma matéria-prima encontrada na BOM.</p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Código</th>
            <th className="px-4 py-2 text-left">Descrição</th>
            <th className="px-4 py-2 text-right">Custo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {lines.map((line) => (
            <tr
              key={line.item_id}
              className={line.missing_price ? "bg-yellow-50" : "hover:bg-slate-50"}
            >
              <td className="px-4 py-2 font-mono text-xs text-slate-700">{line.code}</td>
              <td className="px-4 py-2 text-slate-700">
                {line.description}
                {line.missing_price ? (
                  <span className="ml-2 text-xs font-medium text-yellow-700">sem preço</span>
                ) : null}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                {line.missing_price ? (
                  <span className="text-yellow-600">—</span>
                ) : (
                  <>R$ {formatCurrency(line.line_cost)}</>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VariacoesCustoModal({
  open,
  onClose,
  paId,
  paCode,
  paDescription,
}: Props) {
  const bomCostQuery = useQuery({
    queryKey: ["calculos", "custo-bom", paId],
    queryFn: () => calculosApi.getCustoBom(paId as string),
    enabled: open && paId !== null,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const analiseQuery = useQuery({
    queryKey: ["calculos", "custo-bom-analise", paId],
    queryFn: () => calculosApi.getCustoBomAnalise(paId as string),
    enabled: open && paId !== null,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (!open) return null;

  const bomError =
    axios.isAxiosError(bomCostQuery.error) &&
    typeof bomCostQuery.error.response?.data?.detail === "string"
      ? (bomCostQuery.error.response.data.detail as string)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Histórico de custo do PA</h2>
            {paCode && paDescription ? (
              <p className="text-sm text-slate-500">
                <span className="font-mono">{paCode}</span> — {paDescription}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-6 px-6 py-5">

          {/* ① Custo Vigente */}
          <div>
            <SectionHeading title="Custo Vigente" />
            {bomCostQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando...
              </div>
            ) : bomCostQuery.data ? (
              <div className="inline-flex items-baseline gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-3xl font-bold tabular-nums text-slate-900">
                  R$ {formatCurrency(bomCostQuery.data.custo_total)}
                </span>
                <span className="text-sm text-slate-500">custo total BOM</span>
              </div>
            ) : bomError ? (
              <p className="text-sm text-yellow-800">{bomError}</p>
            ) : (
              <p className="text-sm text-slate-500">Não foi possível calcular o custo.</p>
            )}
          </div>

          {/* ② Matérias-Primas */}
          <div>
            <SectionHeading title="Matérias-Primas" />
            {analiseQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando composição...
              </div>
            ) : analiseQuery.data ? (
              <MpBreakdownTable lines={analiseQuery.data.lines} />
            ) : (
              <p className="text-sm text-slate-500">Não foi possível carregar as matérias-primas.</p>
            )}
          </div>

          {/* ③ Histórico Matéria-Prima */}
          <div>
            <SectionHeading title="Histórico Matéria-Prima" />
            <HistoricoCustosPATable paId={open ? paId : null} pageSize={10} />
          </div>

          {/* ④ Histórico de Custo */}
          <div>
            <SectionHeading title="Histórico de Custo" />
            <PaCostHistoryTable paId={open ? paId : null} pageSize={10} />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3">
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
