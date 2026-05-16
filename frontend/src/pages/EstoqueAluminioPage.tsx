import { Clock, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useAddEntrada,
  useAddSaida,
  useEstoqueAluminio,
  useEstoqueHistorico,
  useSetEstoqueMinimo,
  useUltimosMovimentos,
} from "@/hooks/useEstoqueAluminio";
import { cn } from "@/lib/utils";
import type { EstoqueItem, EstoqueMovimento, EstoqueMovimentoRecente } from "@/types";

function EntradaModal({
  item,
  onClose,
}: {
  item: EstoqueItem | null;
  onClose: () => void;
}) {
  const addEntrada = useAddEntrada();
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
  onClose,
}: {
  item: EstoqueItem | null;
  onClose: () => void;
}) {
  const addSaida = useAddSaida();
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

function MinimoModal({
  item,
  onClose,
}: {
  item: EstoqueItem | null;
  onClose: () => void;
}) {
  const setMinimo = useSetEstoqueMinimo();
  const { register, handleSubmit, reset } = useForm<{ estoque_minimo: string }>({
    defaultValues: { estoque_minimo: item?.estoque_minimo?.toString() ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    const val = values.estoque_minimo.trim();
    await setMinimo.mutateAsync({
      itemId: item.item_id,
      payload: { estoque_minimo: val === "" ? null : Number(val) },
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
            <h2 className="text-lg font-semibold text-slate-900">Estoque Mínimo</h2>
            <p className="text-sm text-slate-500">{item.code} — {item.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Mínimo ({item.uom}) — deixe em branco para remover
            </label>
            <input
              type="number"
              step="any"
              min="0"
              disabled={setMinimo.isPending}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...register("estoque_minimo")}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={setMinimo.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={setMinimo.isPending}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {setMinimo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const HIST_PAGE_SIZE = 10;

function HistoricoModal({
  item,
  onClose,
}: {
  item: EstoqueItem | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const skip = page * HIST_PAGE_SIZE;
  const historicoQuery = useEstoqueHistorico(item?.item_id ?? "", skip, HIST_PAGE_SIZE);

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

function UltimosMovimentosWidget() {
  const query = useUltimosMovimentos(8);
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
  const [modalEntrada, setModalEntrada] = useState<EstoqueItem | null>(null);
  const [modalSaida, setModalSaida] = useState<EstoqueItem | null>(null);
  const [modalMinimo, setModalMinimo] = useState<EstoqueItem | null>(null);
  const [modalHistorico, setModalHistorico] = useState<EstoqueItem | null>(null);

  const estoqueQuery = useEstoqueAluminio();

  const filteredItems = useMemo(() => {
    const all = estoqueQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) =>
      `${item.code} ${item.description}`.toLowerCase().includes(q),
    );
  }, [estoqueQuery.data?.items, search]);

  const formatQty = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

  const hasUom2 = filteredItems.some((item) => item.uom2 !== null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Título + busca */}
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Estoque de Alumínios</h1>
              <p className="mt-1 text-sm text-slate-500">
                Controle de entradas e saídas das matérias-primas do grupo ALU.
              </p>
            </div>
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
          </div>

          {/* Widget de últimas movimentações */}
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-80 xl:w-96">
            <UltimosMovimentosWidget />
          </div>
        </div>
      </div>

      {estoqueQuery.isLoading ? <TableSkeleton /> : null}

      {estoqueQuery.isError ? (
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

      {!estoqueQuery.isLoading && !estoqueQuery.isError ? (
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
                        <button
                          type="button"
                          onClick={() => setModalMinimo(item)}
                          className="font-mono text-slate-600 underline-offset-2 hover:text-blue-600 hover:underline"
                          title="Clique para editar o estoque mínimo"
                        >
                          {item.estoque_minimo !== null ? (
                            <>
                              {formatQty(item.estoque_minimo)}{" "}
                              <span className="text-xs text-slate-400">{item.uom}</span>
                            </>
                          ) : (
                            <span className="text-slate-300 text-xs">Definir</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {item.estoque_minimo !== null ? (
                          item.abaixo_minimo ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                              Abaixo do mínimo
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
                      colSpan={hasUom2 ? 7 : 6}
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

      <EntradaModal item={modalEntrada} onClose={() => setModalEntrada(null)} />
      <SaidaModal item={modalSaida} onClose={() => setModalSaida(null)} />
      <MinimoModal item={modalMinimo} onClose={() => setModalMinimo(null)} />
      <HistoricoModal item={modalHistorico} onClose={() => setModalHistorico(null)} />
    </div>
  );
}
