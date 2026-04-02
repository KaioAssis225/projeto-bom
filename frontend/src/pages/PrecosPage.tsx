import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Coins, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useItens } from "@/hooks/useItens";
import { usePrecoHistory, usePrecoVigente, useSetPreco } from "@/hooks/usePrecos";
import { cn, formatCurrency, formatDate, itemTypeBadgeColor, itemTypeLabel } from "@/lib/utils";
import type { Item, ItemType } from "@/types";

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
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function mergeItems(items: Item[][]) {
  const map = new Map<string, Item>();
  for (const list of items) {
    for (const item of list) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

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
    if (!selectedItem) {
      return;
    }

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registrar novo preço</h2>
            <p className="text-sm text-slate-500">
              {selectedItem ? `${selectedItem.code} — ${selectedItem.description}` : "Selecione um item antes de registrar o preço."}
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
              <label htmlFor="price-value" className="text-sm font-medium text-slate-700">
                Valor
              </label>
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
              <label htmlFor="price-valid-from" className="text-sm font-medium text-slate-700">
                Válido desde
              </label>
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
            <label htmlFor="price-reason" className="text-sm font-medium text-slate-700">
              Motivo
            </label>
            <input
              id="price-reason"
              type="text"
              maxLength={255}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("changed_reason")}
            />
            {form.formState.errors.changed_reason ? (
              <p className="text-sm text-red-600">{form.formState.errors.changed_reason.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="price-created-by" className="text-sm font-medium text-slate-700">
              Registrado por
            </label>
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

function PriceHistorySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_1.1fr_1.1fr_1.4fr_1fr_0.8fr] gap-4">
            {Array.from({ length: 6 }).map((__, cellIndex) => (
              <div key={cellIndex} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrecosPage() {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const byDescriptionQuery = useItens({
    description_contains: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });
  const byCodeQuery = useItens({
    code_contains: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const selectorItems = useMemo(
    () => mergeItems([byDescriptionQuery.data?.items ?? [], byCodeQuery.data?.items ?? []]),
    [byCodeQuery.data?.items, byDescriptionQuery.data?.items],
  );

  const currentPriceQuery = usePrecoVigente(selectedItem?.id ?? null);
  const historyQuery = usePrecoHistory(selectedItem?.id ?? null, { skip: 0, limit: 50 });
  const noCurrentPrice =
    axios.isAxiosError(currentPriceQuery.error) &&
    (currentPriceQuery.error.response?.status === 404 || currentPriceQuery.error.response?.status === 422);

  const isSelectorLoading = byDescriptionQuery.isLoading || byCodeQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Histórico de Preços</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte o preço vigente, acompanhe o histórico de vigência e registre novos valores.
        </p>

        <div className="relative mt-5 max-w-3xl">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onFocus={() => setDropdownOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setDropdownOpen(true);
            }}
            placeholder="Buscar item por código ou descrição"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {dropdownOpen ? (
            <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
              {isSelectorLoading ? (
                <div className="flex items-center justify-center px-4 py-8 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando itens...
                </div>
              ) : selectorItems.length > 0 ? (
                selectorItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setSearch(`${item.code} — ${item.description}`);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.code}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        itemTypeBadgeColor(item.type as ItemType),
                      )}
                    >
                      {itemTypeLabel(item.type)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhum item encontrado</div>
              )}
            </div>
          ) : null}
        </div>
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
                <div className="mt-4">
                  <p className="text-sm font-semibold text-yellow-800">Este item não possui preço vigente cadastrado</p>
                </div>
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
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Coins className="mr-2 h-4 w-4" />
              Registrar novo preço
            </button>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        historyQuery.isLoading ? (
          <PriceHistorySkeleton />
        ) : (
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
                  {historyQuery.data?.items?.length ? (
                    historyQuery.data.items.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">R$ {formatCurrency(entry.price_value)}</td>
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
          </div>
        )
      ) : null}

      <PriceModal open={modalOpen} selectedItem={selectedItem} onClose={() => setModalOpen(false)} />
    </div>
  );
}
