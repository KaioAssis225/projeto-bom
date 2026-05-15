import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Coins, Loader2, Minus, RefreshCcw, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import * as calculosApi from "@/api/calculos";
import HistoricoCustosPATable from "@/components/HistoricoCustosPATable";
import PaCostHistoryTable from "@/components/PaCostHistoryTable";
import { useCustoBomAnalise } from "@/hooks/useCalculos";
import { useItens } from "@/hooks/useItens";
import { usePrecoHistory, usePrecoVigente, useSetPreco } from "@/hooks/usePrecos";
import { useResumoVariacoesCustoPA } from "@/hooks/useProdutoAcabado";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { BomAnalysisLine, Item } from "@/types";

type TabKey = "mp" | "pa";
const HISTORY_PAGE_SIZE = 20;

const priceSchema = z.object({
  price_value: z.number().min(0.000001, "Informe um valor maior que zero"),
  valid_from: z.string().min(1, "Informe a data e hora"),
  changed_reason: z.string().max(255, "Máximo de 255 caracteres").optional(),
  created_by: z.string().trim().min(1, "Informe o responsável").max(100, "Máximo de 100 caracteres"),
});

type PriceFormValues = z.infer<typeof priceSchema>;

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

function nowLocalDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function mergeItems(lists: Item[][]): Item[] {
  const map = new Map<string, Item>();
  for (const list of lists) for (const item of list) map.set(item.id, item);
  return Array.from(map.values());
}

// ─── Modal de cadastro de preço ─────────────────────────────────────────────

function PriceModal({
  open,
  selectedItem,
  onClose,
}: {
  open: boolean;
  selectedItem: Item | null;
  onClose: () => void;
}) {
  const setPreco = useSetPreco();
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      price_value: 0,
      valid_from: nowLocalDateTime(),
      changed_reason: "",
      created_by: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        price_value: 0,
        valid_from: nowLocalDateTime(),
        changed_reason: "",
        created_by: "",
      });
    }
  }, [form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!selectedItem) return;
    await setPreco.mutateAsync({
      item_id: selectedItem.id,
      data: {
        item_id: selectedItem.id,
        price_value: values.price_value,
        valid_from: new Date(values.valid_from).toISOString(),
        changed_reason: values.changed_reason?.trim() || undefined,
        created_by: values.created_by.trim(),
      },
    });
    onClose();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registrar novo preço</h2>
            <p className="text-sm text-slate-500">
              {selectedItem ? `${selectedItem.code} — ${selectedItem.description}` : "Selecione um item antes de registrar."}
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

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="price-value" className="text-sm font-medium text-slate-700">Valor</label>
              <input
                id="price-value"
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...form.register("price_value", { valueAsNumber: true })}
              />
              {form.formState.errors.price_value ? (
                <p className="text-sm text-red-600">{form.formState.errors.price_value.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="price-valid-from" className="text-sm font-medium text-slate-700">Válido desde</label>
              <input
                id="price-valid-from"
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...form.register("valid_from")}
              />
              {form.formState.errors.valid_from ? (
                <p className="text-sm text-red-600">{form.formState.errors.valid_from.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="price-reason" className="text-sm font-medium text-slate-700">Motivo</label>
            <input
              id="price-reason"
              type="text"
              maxLength={255}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("changed_reason")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="price-created-by" className="text-sm font-medium text-slate-700">Registrado por</label>
            <input
              id="price-created-by"
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("created_by")}
            />
            {form.formState.errors.created_by ? (
              <p className="text-sm text-red-600">{form.formState.errors.created_by.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={setPreco.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={setPreco.isPending || !selectedItem}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {setPreco.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Selector de item filtrado por type ─────────────────────────────────────

function ItemSelector({
  type,
  selected,
  onSelect,
  onClear,
  placeholder,
}: {
  type: "RAW_MATERIAL" | "FINISHED_PRODUCT";
  selected: Item | null;
  onSelect: (item: Item) => void;
  onClear: () => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState(selected ? `${selected.code} — ${selected.description}` : "");
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(search, 300);

  // Reseta o input quando a aba muda (selected fica null vindo do pai).
  useEffect(() => {
    if (!selected) setSearch("");
  }, [selected]);

  const byDesc = useItens({
    type,
    description_contains: debounced || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });
  const byCode = useItens({
    type,
    code_contains: debounced || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const items = useMemo(
    () => mergeItems([byDesc.data?.items ?? [], byCode.data?.items ?? []]),
    [byDesc.data?.items, byCode.data?.items],
  );

  const loading = byDesc.isLoading || byCode.isLoading;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
          if (!e.target.value) onClear();
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {selected ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onClear();
          }}
          className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpar"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : items.length > 0 ? (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setSearch(`${item.code} — ${item.description}`);
                  setOpen(false);
                }}
                className="flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
              >
                <span className="text-sm font-medium text-slate-900">{item.code}</span>
                <span className="text-xs text-slate-500">{item.description}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhum item encontrado</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Painel: Matéria-Prima ──────────────────────────────────────────────────

function PainelMateriaPrima({
  selectedItem,
  onSelect,
  onClear,
  onOpenModal,
}: {
  selectedItem: Item | null;
  onSelect: (item: Item) => void;
  onClear: () => void;
  onOpenModal: () => void;
}) {
  const [historySkip, setHistorySkip] = useState(0);

  // Reseta paginação quando troca de item.
  useEffect(() => {
    setHistorySkip(0);
  }, [selectedItem?.id]);

  const currentPriceQuery = usePrecoVigente(selectedItem?.id ?? null);
  const historyQuery = usePrecoHistory(selectedItem?.id ?? null, {
    skip: historySkip,
    limit: HISTORY_PAGE_SIZE,
  });

  const noCurrentPrice =
    axios.isAxiosError(currentPriceQuery.error) &&
    (currentPriceQuery.error.response?.status === 404 || currentPriceQuery.error.response?.status === 422);

  const total = historyQuery.data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : historySkip + 1;
  const showingTo = Math.min(historySkip + HISTORY_PAGE_SIZE, total);
  const canPrev = historySkip > 0;
  const canNext = historySkip + HISTORY_PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ItemSelector
          type="RAW_MATERIAL"
          selected={selectedItem}
          onSelect={onSelect}
          onClear={onClear}
          placeholder="Buscar matéria-prima por código ou descrição"
        />
      </div>

      {selectedItem ? (
        <div
          className={cn(
            "rounded-2xl border p-6 shadow-sm",
            noCurrentPrice ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white",
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Preço Vigente</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedItem.code} — {selectedItem.description}
              </h2>

              {currentPriceQuery.isLoading ? (
                <div className="mt-4 flex items-center text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando preço vigente...
                </div>
              ) : noCurrentPrice ? (
                <p className="mt-4 text-sm font-semibold text-yellow-800">
                  Esta matéria-prima ainda não possui preço vigente cadastrado
                </p>
              ) : currentPriceQuery.data ? (
                <div className="mt-4 space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900">
                    R$ {formatCurrency(currentPriceQuery.data.price_value)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Válido desde: {formatDate(currentPriceQuery.data.valid_from)}
                  </p>
                  <p className="text-sm text-slate-600">Registrado por: {currentPriceQuery.data.created_by}</p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Coins className="mr-2 h-4 w-4" />
              Registrar novo preço
            </button>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Histórico de Preços</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Válido de</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Válido até</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Motivo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Criado por</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </td>
                  </tr>
                ) : historyQuery.data?.items?.length ? (
                  historyQuery.data.items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-900">
                        R$ {formatCurrency(entry.price_value)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(entry.valid_from)}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.valid_to ? formatDate(entry.valid_to) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.changed_reason || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.created_by}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            entry.is_current ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {entry.is_current ? "Vigente" : "Encerrado"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum histórico de preço encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              {total === 0 ? "—" : `Mostrando ${showingFrom}–${showingTo} de ${total}`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setHistorySkip((s) => Math.max(0, s - HISTORY_PAGE_SIZE))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setHistorySkip((s) => s + HISTORY_PAGE_SIZE)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Painel: Produto Acabado ────────────────────────────────────────────────

function VariacaoTotalBadge({ delta }: { delta: number }) {
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        delta > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : "−"}R$ {formatCurrency(Math.abs(delta))}
    </span>
  );
}

function MpGroupsSection({ analiseQuery }: { analiseQuery: ReturnType<typeof useCustoBomAnalise> }) {
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set());

  // Map<setorKey, Map<groupKey, BomAnalysisLine[]>>
  const bySetor = React.useMemo(() => {
    if (!analiseQuery.data) return null;
    const result = new Map<string, Map<string, BomAnalysisLine[]>>();
    for (const line of analiseQuery.data.lines) {
      const sk = line.setor_name ?? "Sem setor";
      const gk = line.group_name ?? "Sem grupo";
      if (!result.has(sk)) result.set(sk, new Map());
      const gm = result.get(sk)!;
      if (!gm.has(gk)) gm.set(gk, []);
      gm.get(gk)!.push(line);
    }
    return result;
  }, [analiseQuery.data]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Matérias-Primas</h2>
        <p className="text-xs text-slate-500">Composição do custo atual da BOM</p>
      </div>
      <div className="px-5 py-4">
        {analiseQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando composição...
          </div>
        ) : analiseQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Falha ao carregar composição de matérias-primas.
          </div>
        ) : bySetor ? (
          <div className="space-y-3">
            {Array.from(bySetor.entries())
              .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
              .map(([setorName, groupMap]) => {
                const setorTotal = Array.from(groupMap.values())
                  .flat()
                  .reduce((s, l) => s + (l.missing_price ? 0 : Number(l.line_cost)), 0);

                return (
                  <div key={setorName} className="overflow-hidden rounded-xl border border-slate-200">
                    {/* Cabeçalho do setor */}
                    <div className="flex items-center justify-between bg-slate-200 px-4 py-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        {setorName}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-700">
                        R$ {formatCurrency(setorTotal)}
                      </span>
                    </div>

                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Código</th>
                          <th className="px-4 py-2 text-left">Descrição</th>
                          <th className="px-4 py-2 text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {Array.from(groupMap.entries())
                          .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                          .map(([groupName, mpLines]) => {
                            const groupKey = `${setorName}||${groupName}`;
                            const groupTotal = mpLines.reduce((s, l) => s + (l.missing_price ? 0 : Number(l.line_cost)), 0);
                            const isOpen = openGroups.has(groupKey);
                            return (
                              <React.Fragment key={groupKey}>
                                <tr
                                  className="cursor-pointer bg-slate-100 hover:bg-slate-200"
                                  onClick={() => toggleGroup(groupKey)}
                                >
                                  <td colSpan={2} className="px-4 py-2">
                                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                      <ChevronDown
                                        className={cn(
                                          "h-3.5 w-3.5 text-slate-400 transition-transform",
                                          !isOpen && "-rotate-90",
                                        )}
                                      />
                                      {groupName}
                                      <span className="ml-1 rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                        {mpLines.length}
                                      </span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-slate-700">
                                    R$ {formatCurrency(groupTotal)}
                                  </td>
                                </tr>
                                {isOpen &&
                                  mpLines.map((line) => (
                                    <tr key={line.item_id} className={line.missing_price ? "bg-yellow-50" : "hover:bg-slate-50"}>
                                      <td className="px-4 py-2 pl-9 font-mono text-xs text-slate-700">{line.code}</td>
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
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PainelProdutoAcabado({
  selectedItem,
  onSelect,
  onClear,
}: {
  selectedItem: Item | null;
  onSelect: (item: Item) => void;
  onClear: () => void;
}) {
  const [variationsOpen, setVariationsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // filtros de variações
  const [varDateFrom, setVarDateFrom] = useState("");
  const [varDateTo, setVarDateTo] = useState("");
  const [varGroupId, setVarGroupId] = useState("");

  // filtros de histórico de custo
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");

  const analiseQuery = useCustoBomAnalise(selectedItem?.id ?? null);

  // Grupos presentes na BOM deste PA (derivados da análise, sem chamada extra).
  const bomGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const line of analiseQuery.data?.lines ?? []) {
      if (line.group_id && line.group_name && !seen.has(line.group_id)) {
        seen.set(line.group_id, line.group_name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [analiseQuery.data]);

  // Reseta collapse e filtros ao trocar de PA.
  useEffect(() => {
    setVariationsOpen(false);
    setHistoryOpen(false);
    setVarDateFrom("");
    setVarDateTo("");
    setVarGroupId("");
    setHistDateFrom("");
    setHistDateTo("");
  }, [selectedItem?.id]);

  const bomCostQuery = useQuery({
    queryKey: ["calculos", "custo-bom", selectedItem?.id],
    queryFn: () => calculosApi.getCustoBom(selectedItem!.id),
    enabled: !!selectedItem,
    retry: false,
    // Custo BOM eh recalculado on-demand pelo backend — nunca ficar stale,
    // sempre buscar fresh ao montar e ao trocar de item.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const resumoQuery = useResumoVariacoesCustoPA(selectedItem?.id ?? null);
  const totalDelta = Number(resumoQuery.data?.total_delta_cost ?? 0);
  const variationCount = resumoQuery.data?.count ?? 0;
  const status = axios.isAxiosError(bomCostQuery.error) ? bomCostQuery.error.response?.status : null;
  const detail =
    axios.isAxiosError(bomCostQuery.error) && typeof bomCostQuery.error.response?.data?.detail === "string"
      ? (bomCostQuery.error.response.data.detail as string)
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ItemSelector
          type="FINISHED_PRODUCT"
          selected={selectedItem}
          onSelect={onSelect}
          onClear={onClear}
          placeholder="Buscar produto acabado por código ou descrição"
        />
      </div>

      {selectedItem ? (
        <>
          <div
            className={cn(
              "rounded-2xl border p-6 shadow-sm",
              bomCostQuery.isError && status !== 422 ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white",
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Custo Vigente (BOM)</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {selectedItem.code} — {selectedItem.description}
                </h2>

                {bomCostQuery.isLoading ? (
                  <div className="mt-4 flex items-center text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando custo da BOM...
                  </div>
                ) : bomCostQuery.data ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                      R$ {formatCurrency(bomCostQuery.data.custo_total)}
                    </p>
                    <p className="text-sm text-slate-600">
                      Soma do custo das matérias-primas que compõem este produto.
                    </p>
                    {bomCostQuery.isFetching ? (
                      <p className="inline-flex items-center text-xs text-slate-400">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Atualizando...
                      </p>
                    ) : null}
                  </div>
                ) : status === 422 && detail ? (
                  <p className="mt-4 text-sm font-semibold text-yellow-800">{detail}</p>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-yellow-800">
                    Não foi possível calcular o custo da BOM.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void bomCostQuery.refetch()}
                disabled={bomCostQuery.isFetching}
                title="Forçar recálculo do custo BOM com os preços vigentes agora"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bomCostQuery.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Recalcular
              </button>
            </div>
          </div>

          <MpGroupsSection analiseQuery={analiseQuery} />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setVariationsOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    !variationsOpen && "-rotate-90",
                  )}
                />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Variações de Custo (BOM)</h2>
                  <p className="text-xs text-slate-500">
                    {variationCount === 0
                      ? "Nenhuma alteração registrada ainda."
                      : `${variationCount} alteração(ões) de preço de MP afetaram este PA.`}
                  </p>
                </div>
              </div>

              {resumoQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : variationCount > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Variação total</p>
                    <p
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        totalDelta > 0
                          ? "text-red-700"
                          : totalDelta < 0
                            ? "text-green-700"
                            : "text-slate-700",
                      )}
                    >
                      {totalDelta > 0 ? "+" : totalDelta < 0 ? "−" : ""}R${" "}
                      {formatCurrency(Math.abs(totalDelta))}
                    </p>
                  </div>
                  <VariacaoTotalBadge delta={totalDelta} />
                </div>
              ) : null}
            </button>

            {variationsOpen ? (
              <>
                <div
                  className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-slate-500">De</label>
                    <input
                      type="date"
                      value={varDateFrom}
                      max={varDateTo || undefined}
                      onChange={(e) => setVarDateFrom(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Até</label>
                    <input
                      type="date"
                      value={varDateTo}
                      min={varDateFrom || undefined}
                      onChange={(e) => setVarDateTo(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Grupo</label>
                    <select
                      value={varGroupId}
                      onChange={(e) => setVarGroupId(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os grupos</option>
                      {bomGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  {(varDateFrom || varDateTo || varGroupId) ? (
                    <button
                      type="button"
                      onClick={() => { setVarDateFrom(""); setVarDateTo(""); setVarGroupId(""); }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </button>
                  ) : null}
                </div>
                <div className="px-5 py-3">
                  <HistoricoCustosPATable
                    paId={selectedItem.id}
                    pageSize={20}
                    dateFrom={varDateFrom || undefined}
                    dateTo={varDateTo || undefined}
                    groupId={varGroupId || undefined}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center gap-3 border-b border-slate-200 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform",
                  !historyOpen && "-rotate-90",
                )}
              />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Histórico de Custo</h2>
                <p className="text-xs text-slate-500">Evolução do custo total do PA ao longo do tempo</p>
              </div>
            </button>

            {historyOpen ? (
              <>
                <div
                  className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-slate-500">De</label>
                    <input
                      type="date"
                      value={histDateFrom}
                      max={histDateTo || undefined}
                      onChange={(e) => setHistDateFrom(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Até</label>
                    <input
                      type="date"
                      value={histDateTo}
                      min={histDateFrom || undefined}
                      onChange={(e) => setHistDateTo(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {(histDateFrom || histDateTo) ? (
                    <button
                      type="button"
                      onClick={() => { setHistDateFrom(""); setHistDateTo(""); }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </button>
                  ) : null}
                </div>
                <div className="px-5 py-4">
                  <PaCostHistoryTable
                    paId={selectedItem.id}
                    pageSize={10}
                    dateFrom={histDateFrom || undefined}
                    dateTo={histDateTo || undefined}
                  />
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function PrecosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("mp");
  const [selectedMP, setSelectedMP] = useState<Item | null>(null);
  const [selectedPA, setSelectedPA] = useState<Item | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefreshCosts = async () => {
    setRefreshing(true);
    try {
      // refetchQueries forca o refetch imediato (mesmo que a query nao esteja
      // sendo observada no momento). invalidateQueries apenas marca como stale.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["calculos"], type: "all" }),
        queryClient.refetchQueries({ queryKey: ["produtos-acabados"], type: "all" }),
        queryClient.refetchQueries({ queryKey: ["precos"], type: "all" }),
      ]);
      toast.success("Custos e preços atualizados");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Preços</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie preços de matérias-primas e visualize o custo BOM dos produtos acabados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefreshCosts()}
            disabled={refreshing}
            title="Recalcula o custo BOM de todos os PAs e atualiza os preços vigentes (limpa cache local)"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Atualizar Custo
          </button>
        </div>

        <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("mp")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "mp" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Matéria-Prima
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pa")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "pa" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Produto Acabado
          </button>
        </div>
      </div>

      {activeTab === "mp" ? (
        <PainelMateriaPrima
          selectedItem={selectedMP}
          onSelect={setSelectedMP}
          onClear={() => setSelectedMP(null)}
          onOpenModal={() => setModalOpen(true)}
        />
      ) : (
        <PainelProdutoAcabado
          selectedItem={selectedPA}
          onSelect={setSelectedPA}
          onClear={() => setSelectedPA(null)}
        />
      )}

      <PriceModal open={modalOpen} selectedItem={selectedMP} onClose={() => setModalOpen(false)} />
    </div>
  );
}
