import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { useLog, useLogs } from "@/hooks/useLogs";
import { cn, formatDate, statusBadgeColor } from "@/lib/utils";
import type { ExecutionStatus } from "@/types";

type StatusFilter = "" | ExecutionStatus;

function LogsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_0.8fr_1fr_0.7fr_1fr_0.7fr] gap-4">
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <div key={cellIndex} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogDetailModal({
  logId,
  onClose,
}: {
  logId: string | null;
  onClose: () => void;
}) {
  const logQuery = useLog(logId);

  if (!logId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Log de Execução</h2>
            <p className="text-sm text-slate-500">Detalhes completos da execução selecionada.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {logQuery.isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando detalhes...
            </div>
          ) : logQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Não foi possível carregar os detalhes do log.
            </div>
          ) : logQuery.data ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.id}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Solicitante</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.requested_by}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      statusBadgeColor(logQuery.data.status),
                    )}
                  >
                    {logQuery.data.status}
                  </span>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Produto</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.root_item_id}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Início</dt>
                <dd className="text-sm text-slate-900">{formatDate(logQuery.data.started_at)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fim</dt>
                <dd className="text-sm text-slate-900">
                  {logQuery.data.finished_at ? formatDate(logQuery.data.finished_at) : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duração</dt>
                <dd className="text-sm text-slate-900">
                  {logQuery.data.duration_ms ? `${logQuery.data.duration_ms}ms` : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Arquivo gerado</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.generated_file_name || "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referência de simulação</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.simulation_reference || "—"}</dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensagem</dt>
                <dd className="text-sm text-slate-900">{logQuery.data.message || "—"}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const logsQuery = useLogs({
    status: statusFilter || undefined,
    skip: 0,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Logs de Execução</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitore as execuções de cálculo, seus status, duração e arquivos gerados.
        </p>

        <div className="mt-5 max-w-xs">
          <label htmlFor="logs-status" className="mb-2 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="logs-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="ERROR">ERROR</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
        </div>
      </div>

      {logsQuery.isLoading ? <LogsTableSkeleton /> : null}

      {logsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Não foi possível carregar os logs.</p>
              <p className="mt-1 text-sm text-red-600">Tente novamente para recarregar a listagem.</p>
              <button
                type="button"
                onClick={() => void logsQuery.refetch()}
                className="mt-4 inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!logsQuery.isLoading && !logsQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Solicitante</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Produto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Início</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Duração</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Arquivo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsQuery.data?.items?.length ? (
                  logsQuery.data.items.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{log.requested_by}</td>
                      <td className="px-4 py-3 text-slate-600">{log.root_item_id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusBadgeColor(log.status),
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(log.started_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{log.generated_file_name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLogId(log.id)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <LogDetailModal logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
    </div>
  );
}
