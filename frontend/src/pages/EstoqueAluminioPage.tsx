import { ChevronDown, Clock, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useAddEntrada,
  useAddSaida,
  useEstoqueAluminio,
  useEstoqueHistorico,
  useSetEstoqueMinimo,
  useSetPercentualAlerta,
  useUltimosMovimentos,
} from "@/hooks/useEstoqueAluminio";
import { useGrupos } from "@/hooks/useGrupos";
import { cn } from "@/lib/utils";
import type { EstoqueItem, EstoqueMovimento, EstoqueMovimentoRecente, MaterialGroup } from "@/types";

function EntradaModal({
  item,
  groupId,
  onClose,
}: {
  item: EstoqueItem | null;
  groupId: string | null;
  onClose: () => void;
}) {
  const addEntrada = useAddEntrada(groupId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ quantidade: number }>();

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    await addEntrada.mutateAsync({ itemId: item.item_id, payload: { quantidade: values.quantidade } });
    reset();
    onClose();
  });

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registrar Entrada</h2>
            <p className="text-sm text-slate-500">{item.code} — {item.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Quantidade ({item.uom})
            </label>
            <input
              type="number"
              step="any"
              min="0.000001"
              disabled={addEntrada.isPending}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...register("quantidade", {
                required: "Informe a quantidade",
                valueAsNumber: true,
                min: { value: 0.000001, message: "Deve ser maior que zero" },
              })}
            />
            {errors.quantidade && (
              <p className="text-sm text-red-600">{errors.quantidade.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={addEntrada.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addEntrada.isPending}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {addEntrada.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SaidaModal({
  item,
  groupId,
  onClose,
}: {
  item: EstoqueItem | null;
  groupId: string | null;
  onClose: () => void;
}) {
  const addSaida = useAddSaida(groupId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    quantidade: number;
    solicitante: string;
  }>();

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    await addSaida.mutateAsync({
      itemId: item.item_id,
      payload: {
        quantidade: values.quantidade,
        solicitante: values.solicitante || undefined,
      },
    });
    reset();
    onClose();
  });

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registrar Saída</h2>
            <p className="text-sm text-slate-500">{item.code} — {item.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Quantidade ({item.uom})
            </label>
            <input
              type="number"
              step="any"
              min="0.000001"
              disabled={addSaida.isPending}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...register("quantidade", {
                required: "Informe a quantidade",
                valueAsNumber: true,
                min: { value: 0.000001, message: "Deve ser maior que zero" },
              })}
            />
            {errors.quantidade && (
              <p className="text-sm text-red-600">{errors.quantidade.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Solicitante <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              maxLength={120}
              disabled={addSaida.isPending}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...register("solicitante")}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={addSaida.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addSaida.isPending}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {addSaida.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const formatQty = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

function InlineMinimoCell({
  item,
  groupId,
}: {
  item: EstoqueItem;
  groupId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setMinimo = useSetEstoqueMinimo(groupId);

  const startEdit = () => {
    setValue(item.estoque_minimo?.toString() ?? "");
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const val = value.trim();
    await setMinimo.mutateAsync({
      itemId: item.item_id,
      payload: { estoque_minimo: val === "" ? null : Number(val) },
    });
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <input
          ref={inputRef}
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void save(); }
            if (e.key === "Escape") cancel();
          }}
          onBlur={() => void save()}
          disabled={setMinimo.isPending}
          className="w-28 rounded border border-blue-400 bg-white px-2 py-1 text-right font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
        {setMinimo.isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />
          : <span className="text-xs text-slate-400 shrink-0">{item.uom}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="font-mono text-slate-600 underline-offset-2 hover:text-blue-600 hover:underline"
      title="Clique para editar o estoque mínimo"
    >
      {item.estoque_minimo !== null ? (
        <>
          {formatQty(Number(item.estoque_minimo))}{" "}
          <span className="text-xs text-slate-400">{item.uom}</span>
        </>
      ) : (
        <span className="text-xs text-slate-300">Definir</span>
      )}
    </button>
  );
}

function InlineAlertaCell({
  item,
  groupId,
}: {
  item: EstoqueItem;
  groupId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setAlerta = useSetPercentualAlerta(groupId);

  const startEdit = () => {
    const current = item.percentual_alerta !== null
      ? Math.round(item.percentual_alerta * 100).toString()
      : "";
    setValue(current);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const val = value.trim();
    const parsed = val === "" ? null : Number(val) / 100;
    await setAlerta.mutateAsync({
      itemId: item.item_id,
      payload: { percentual_alerta: parsed },
    });
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <input
          ref={inputRef}
          type="number"
          step="1"
          min="1"
          max="99"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void save(); }
            if (e.key === "Escape") cancel();
          }}
          onBlur={() => void save()}
          disabled={setAlerta.isPending}
          className="w-20 rounded border border-blue-400 bg-white px-2 py-1 text-right font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
        <span className="text-xs text-slate-400 shrink-0">%</span>
        {setAlerta.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
      </div>
    );
  }

  const displayPct = item.percentual_alerta !== null
    ? Math.round(item.percentual_alerta * 100)
    : null;

  return (
    <button
      type="button"
      onClick={startEdit}
      className="font-mono text-slate-600 underline-offset-2 hover:text-blue-600 hover:underline"
      title={`Clique para editar o percentual de alerta${displayPct === null ? " (padrão: 80%)" : ""}`}
    >
      {displayPct !== null ? (
        <span>{displayPct}%</span>
      ) : (
        <span className="text-xs text-slate-300">80%</span>
      )}
    </button>
  );
}

const HIST_PAGE_SIZE = 10;

function HistoricoModal({
  item,
  groupId,
  onClose,
}: {
  item: EstoqueItem | null;
  groupId: string | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const skip = page * HIST_PAGE_SIZE;
  const historicoQuery = useEstoqueHistorico(groupId, item?.item_id ?? "", skip, HIST_PAGE_SIZE);

  const totalPages = historicoQuery.data
    ? Math.max(1, Math.ceil(historicoQuery.data.total / HIST_PAGE_SIZE))
    : 1;

  if (!item) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const movimentos: EstoqueMovimento[] = historicoQuery.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Histórico de Movimentos</h2>
            <p className="text-sm text-slate-500">{item.code} — {item.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {historicoQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : movimentos.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">
              Nenhum movimento registrado.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Data/hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Qtd ({item.uom})
                  </th>
                  {item.uom2 && (
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                      Qtd ({item.uom2})
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Solicitante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimentos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(mov.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          mov.tipo === "entrada"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {Number(mov.quantidade).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    {item.uom2 && (
                      <td className="px-4 py-3 text-right font-mono text-slate-500">—</td>
                    )}
                    <td className="px-4 py-3 text-slate-600">{mov.solicitante ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
            <span className="text-sm text-slate-500">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UltimosMovimentosWidget({ groupId }: { groupId: string | null }) {
  const query = useUltimosMovimentos(groupId, 8);
  const movimentos: EstoqueMovimentoRecente[] = query.data ?? [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="flex flex-col h-full">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Últimas movimentações
      </p>
      {query.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : movimentos.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum movimento ainda.</p>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto">
          {movimentos.map((mov) => (
            <li key={mov.id} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "w-14 shrink-0 rounded-full px-2 py-0.5 text-center font-semibold",
                  mov.tipo === "entrada"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {mov.tipo === "entrada" ? "Entrada" : "Saída"}
              </span>
              <span className="w-20 shrink-0 font-mono text-slate-500">{formatDate(mov.created_at)}</span>
              <span className="truncate font-medium text-slate-700">{mov.item_code}</span>
              <span className="ml-auto shrink-0 font-mono text-slate-900">
                {Number(mov.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}{" "}
                <span className="text-slate-400">{mov.uom}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EstoqueAluminioPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MaterialGroup | null>(null);
  const [modalEntrada, setModalEntrada] = useState<EstoqueItem | null>(null);
  const [modalSaida, setModalSaida] = useState<EstoqueItem | null>(null);
  const [modalHistorico, setModalHistorico] = useState<EstoqueItem | null>(null);

  const gruposQuery = useGrupos({ skip: 0, limit: 100, active_only: true, controla_estoque_only: true });
  const grupos: MaterialGroup[] = gruposQuery.data?.items ?? [];
  const groupId = selectedGroup?.id ?? null;

  const estoqueQuery = useEstoqueAluminio(groupId);

  const filteredItems = useMemo(() => {
    const all = estoqueQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) =>
      `${item.code} ${item.description}`.toLowerCase().includes(q),
    );
  }, [estoqueQuery.data?.items, search]);

  const hasUom2 = filteredItems.some((item) => item.uom2 !== null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Título + seletor de grupo + busca */}
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Estoques</h1>
              <p className="mt-1 text-sm text-slate-500">
                Controle de entradas e saídas por grupo de matéria-prima.
              </p>
            </div>

            {/* Seletor de grupo */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 shrink-0">Grupo:</label>
              <div className="relative w-56">
                <select
                  value={selectedGroup?.id ?? ""}
                  onChange={(e) => {
                    const g = grupos.find((g) => g.id === e.target.value) ?? null;
                    setSelectedGroup(g);
                    setSearch("");
                  }}
                  disabled={gruposQuery.isLoading}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                >
                  <option value="">Selecione um estoque</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {gruposQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>

            {selectedGroup && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por código ou descrição"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <span className="text-sm text-slate-500">
                  {estoqueQuery.data
                    ? `${filteredItems.length} item(s) exibido(s)`
                    : "Carregando..."}
                </span>
              </div>
            )}
          </div>

          {/* Widget de últimas movimentações */}
          {selectedGroup && (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-80 xl:w-96">
              <UltimosMovimentosWidget groupId={groupId} />
            </div>
          )}
        </div>
      </div>

      {!selectedGroup && !gruposQuery.isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Selecione um grupo de estoque para visualizar os itens.</p>
          {grupos.length === 0 && !gruposQuery.isLoading && (
            <p className="mt-2 text-xs text-slate-400">
              Nenhum grupo com controle de estoque ativo. Configure em <strong>Grupos</strong>.
            </p>
          )}
        </div>
      )}

      {selectedGroup && estoqueQuery.isLoading ? <TableSkeleton /> : null}

      {selectedGroup && estoqueQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar o estoque.</p>
          <button
            type="button"
            onClick={() => void estoqueQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {selectedGroup && !estoqueQuery.isLoading && !estoqueQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Saldo (UoM1)</th>
                  {hasUom2 && (
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Saldo (UoM2)</th>
                  )}
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Mínimo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Alerta %</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.item_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.code}</td>
                      <td className="px-4 py-3 text-slate-700">{item.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">
                        {formatQty(item.saldo_uom1)}{" "}
                        <span className="text-xs text-slate-400">{item.uom}</span>
                      </td>
                      {hasUom2 && (
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {item.saldo_uom2 !== null ? (
                            <>
                              {formatQty(item.saldo_uom2)}{" "}
                              <span className="text-xs text-slate-400">{item.uom2}</span>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <InlineMinimoCell item={item} groupId={groupId} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <InlineAlertaCell item={item} groupId={groupId} />
                      </td>
                      <td className="px-4 py-3">
                        {item.estoque_minimo !== null ? (
                          item.abaixo_minimo ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                              Abaixo do mínimo
                            </span>
                          ) : item.proximo_vencer ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Próximo a vencer
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                              OK
                            </span>
                          )
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setModalEntrada(item)}
                            title="Registrar entrada"
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            <Plus className="h-3 w-3" />
                            Entrada
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalSaida(item)}
                            title="Registrar saída"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                            Saída
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalHistorico(item)}
                            title="Ver histórico"
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:bg-slate-100"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={hasUom2 ? 8 : 7}
                      className="px-4 py-12 text-center text-sm text-slate-500"
                    >
                      Nenhum item encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <EntradaModal item={modalEntrada} groupId={groupId} onClose={() => setModalEntrada(null)} />
      <SaidaModal item={modalSaida} groupId={groupId} onClose={() => setModalSaida(null)} />
      <HistoricoModal item={modalHistorico} groupId={groupId} onClose={() => setModalHistorico(null)} />
    </div>
  );
}
