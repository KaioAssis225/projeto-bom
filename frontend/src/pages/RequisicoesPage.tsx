import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/api/client";
import { requisicoesApi, type RequisicaoResponse } from "@/api/requisicoes";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_STYLE: Record<string, string> = {
  PENDENTE:  "bg-amber-100 text-amber-700",
  APROVADA:  "bg-green-100 text-green-700",
  REJEITADA: "bg-red-100 text-red-700",
  CONCLUIDA: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:  "Pendente",
  APROVADA:  "Aprovada",
  REJEITADA: "Rejeitada",
  CONCLUIDA: "Concluída",
};

function RequisicaoCard({ req, canManage }: { req: RequisicaoResponse; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => requisicoesApi.updateStatus(req.id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["requisicoes"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[req.status])}>
            {STATUS_LABEL[req.status] ?? req.status}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {req.group_name} — {req.itens.length} item(s)
            </p>
            <p className="text-xs text-slate-500">
              {req.user_name} · {new Date(req.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-3">
          {/* Itens */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Código</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Descrição</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Quantidade</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {req.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{item.item_code}</td>
                    <td className="px-4 py-2 text-slate-600">{item.item_description}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{Number(item.quantidade).toFixed(3)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {item.unidade_key === "UOM1" ? item.uom1_code : (item.uom2_code ?? item.uom1_code)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Obs */}
          {req.notes && (
            <p className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <span className="font-medium">Obs:</span> {req.notes}
            </p>
          )}

          {/* Ações para estoquista */}
          {canManage && req.status === "PENDENTE" && (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "APROVADA" })}
                disabled={statusMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "REJEITADA" })}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                Rejeitar
              </button>
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "CONCLUIDA" })}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequisicoesPage() {
  const { user } = useAuth();
  const isRequisitor = user?.roles.every((r) => r.nivel === "REQUISITOR") ?? false;
  const canManage = user?.roles.some((r) => ["ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN"].includes(r.nivel)) ?? false;

  const query = useQuery({
    queryKey: ["requisicoes"],
    queryFn: () => requisicoesApi.list(),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Requisições</h1>
              <p className="text-sm text-slate-500">
                {isRequisitor ? "Suas solicitações de material" : "Todas as solicitações de material"}
              </p>
            </div>
          </div>
          <Link
            to="/requisicoes/nova"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova Requisição
          </Link>
        </div>
      </div>

      {query.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      )}

      {!query.isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Nenhuma requisição encontrada</p>
          <Link to="/requisicoes/nova" className="mt-3 text-sm text-blue-600 hover:underline">
            Criar primeira requisição
          </Link>
        </div>
      )}

      {items.map((req) => (
        <RequisicaoCard key={req.id} req={req} canManage={canManage} />
      ))}
    </div>
  );
}
