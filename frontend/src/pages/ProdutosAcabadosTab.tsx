import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import * as calculosApi from "@/api/calculos";
import { useGrupos } from "@/hooks/useGrupos";
import { useCreateItem, useDeactivateItem, useItens, useUpdateItem } from "@/hooks/useItens";
import { useUnidades } from "@/hooks/useUnidades";
import { cn, extractErrorMessage, formatCurrency, formatDecimal } from "@/lib/utils";
import type { Item, UnitOfMeasure } from "@/types";

// ─── BomCustoCell ─────────────────────────────────────────────────────────────

function BomCustoCell({ itemId }: { itemId: string }) {
  const { data, isError, isPending } = useQuery({
    queryKey: ["calculos", "custo-bom", itemId],
    queryFn: () => calculosApi.getCustoBom(itemId),
    retry: false,
  });

  if (isPending) {
    return <span className="inline-block h-3 w-20 animate-pulse rounded bg-slate-200" />;
  }
  if (isError || !data) {
    return <span className="text-slate-400">Sem BOM</span>;
  }
  return <span className="font-medium text-slate-700">R$ {formatCurrency(data.custo_total)}</span>;
}

// ─── Modal schema ─────────────────────────────────────────────────────────────

const produtoSchema = z.object({
  code: z.string().trim().min(1, "Informe o código").max(60, "Máximo de 60 caracteres"),
  description: z.string().trim().min(1, "Informe a descrição").max(255, "Máximo de 255 caracteres"),
  unit_of_measure_id: z.string().uuid("Selecione uma unidade válida"),
  peso_liquido: z.number().positive("Deve ser maior que zero").optional().nullable(),
  catalogo: z.string().max(120).optional().nullable(),
  linha: z.string().max(120).optional().nullable(),
  designer: z.string().max(120).optional().nullable(),
  notes: z.string().optional(),
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

// ─── ProdutosAcabadosModal ────────────────────────────────────────────────────

function ProdutosAcabadosModal({
  open,
  item,
  units,
  onClose,
}: {
  open: boolean;
  item: Item | null;
  units: UnitOfMeasure[];
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isSubmitting = createItem.isPending || updateItem.isPending;

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      code: "",
      description: "",
      unit_of_measure_id: "",
      peso_liquido: null,
      catalogo: null,
      linha: null,
      designer: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: "",
        description: "",
        unit_of_measure_id: "",
        peso_liquido: null,
        catalogo: null,
        linha: null,
        designer: null,
        notes: "",
      });
      return;
    }

    form.reset({
      code: item?.code ?? "",
      description: item?.description ?? "",
      unit_of_measure_id: item?.unit_of_measure_id ?? "",
      peso_liquido: item?.peso_liquido ?? null,
      catalogo: item?.catalogo ?? null,
      linha: item?.linha ?? null,
      designer: item?.designer ?? null,
      notes: item?.notes ?? "",
    });
  }, [form, item, open]);

  useEffect(() => {
    if (!open || isEditing) {
      return;
    }

    const currentUnit = form.getValues("unit_of_measure_id");
    if (!currentUnit && units.length > 0) {
      form.setValue("unit_of_measure_id", units[0].id, { shouldValidate: true });
    }
  }, [form, isEditing, open, units]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditing && item) {
        await updateItem.mutateAsync({
          id: item.id,
          data: {
            description: values.description.trim(),
            active: item.active,
            notes: values.notes?.trim() || undefined,
            peso_liquido: values.peso_liquido ?? undefined,
            catalogo: values.catalogo ?? undefined,
            linha: values.linha ?? undefined,
            designer: values.designer ?? undefined,
          },
        });
      } else {
        await createItem.mutateAsync({
          code: values.code.trim(),
          description: values.description.trim(),
          type: "FINISHED_PRODUCT",
          unit_of_measure_id: values.unit_of_measure_id,
          notes: values.notes?.trim() || undefined,
          peso_liquido: values.peso_liquido ?? undefined,
          catalogo: values.catalogo ?? undefined,
          linha: values.linha ?? undefined,
          designer: values.designer ?? undefined,
        });
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar Produto Acabado" : "Novo Produto Acabado"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing
                ? "Atualize os dados cadastrais do produto."
                : "Cadastre um novo produto acabado."}
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

        <form onSubmit={onSubmit} className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Código + Unidade */}
            <div className={cn("grid gap-4", isEditing ? "md:grid-cols-2" : "md:grid-cols-1")}>
              <div className="space-y-2">
                <label htmlFor="pa-code" className="text-sm font-medium text-slate-700">
                  Código
                </label>
                <input
                  id="pa-code"
                  type="text"
                  maxLength={60}
                  readOnly={isEditing}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition",
                    "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
                    isEditing && "cursor-not-allowed bg-slate-100 text-slate-500",
                  )}
                  {...form.register("code")}
                />
                {form.formState.errors.code ? (
                  <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
                ) : null}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="pa-uom" className="text-sm font-medium text-slate-700">
                    Unidade
                  </label>
                  <select
                    id="pa-uom"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    {...form.register("unit_of_measure_id")}
                  >
                    <option value="">Selecione</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code} ??? {unit.description}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.unit_of_measure_id ? (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.unit_of_measure_id.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label htmlFor="pa-description" className="text-sm font-medium text-slate-700">
                Descrição
              </label>
              <input
                id="pa-description"
                type="text"
                maxLength={255}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            {/* Catálogo + Linha */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="pa-catalogo" className="text-sm font-medium text-slate-700">
                  Catálogo
                </label>
                <input
                  id="pa-catalogo"
                  type="text"
                  maxLength={120}
                  disabled={isSubmitting}
                  placeholder="Ex: CAT-2026"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("catalogo")}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="pa-linha" className="text-sm font-medium text-slate-700">
                  Linha
                </label>
                <input
                  id="pa-linha"
                  type="text"
                  maxLength={120}
                  disabled={isSubmitting}
                  placeholder="Ex: Premium"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("linha")}
                />
              </div>
            </div>

            {/* Designer + Peso */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="pa-designer" className="text-sm font-medium text-slate-700">
                  Designer
                </label>
                <input
                  id="pa-designer"
                  type="text"
                  maxLength={120}
                  disabled={isSubmitting}
                  placeholder="Nome do designer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("designer")}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="pa-peso" className="text-sm font-medium text-slate-700">
                  Peso
                </label>
                <input
                  id="pa-peso"
                  type="number"
                  step="0.001"
                  min="0"
                  disabled={isSubmitting}
                  placeholder="0,000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("peso_liquido", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
                {form.formState.errors.peso_liquido ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.peso_liquido.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label htmlFor="pa-notes" className="text-sm font-medium text-slate-700">
                Observações
              </label>
              <textarea
                id="pa-notes"
                rows={3}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("notes")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ActionsDropdown ──────────────────────────────────────────────────────────

function ActionsDropdown({
  item,
  onEdit,
  onDeactivate,
}: {
  item: Item;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        Ações
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { setIsOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            ✏️ Editar
          </button>
          {item.active ? (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onDeactivate(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
            >
              🚫 Inativar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-9 gap-4">
            {Array.from({ length: 9 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ProdutosAcabadosTab (main) ───────────────────────────────────────────────

type StatusFilter = "all" | "active" | "inactive";

export default function ProdutosAcabadosTab() {
  const pageSize = 20;
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const unitsQuery = useUnidades({ skip: 0, limit: 100 });
  // grupos carregado para uso futuro (BOM etc.)
  useGrupos({ active_only: true, skip: 0, limit: 100 });

  const itemFilters = useMemo(
    () => ({
      type: "FINISHED_PRODUCT",
      code_contains: search.trim() || undefined,
      description_contains: search.trim() || undefined,
      active_only: statusFilter === "active",
      skip,
      limit: pageSize,
    }),
    [search, skip, statusFilter],
  );

  const itemsQuery = useItens(itemFilters);
  const deactivateItem = useDeactivateItem();

  const items = useMemo(() => {
    const all = itemsQuery.data?.items ?? [];
    if (statusFilter === "inactive") return all.filter((i) => !i.active);
    return all;
  }, [itemsQuery.data?.items, statusFilter]);

  const total = itemsQuery.data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + pageSize, total);
  const canGoPrevious = skip > 0;
  const canGoNext = statusFilter !== "inactive" && skip + pageSize < total;

  useEffect(() => {
    setSkip(0);
  }, [search, statusFilter]);

  const handleDeactivate = async (item: Item) => {
    if (!window.confirm(`Deseja inativar "${item.code} — ${item.description}"?`)) return;
    try {
      await deactivateItem.mutateAsync(item.id);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const isMutating = deactivateItem.isPending;
  const units = unitsQuery.data?.items ?? [];

  return (
    <>
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Produtos Acabados</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie produtos acabados. O preço é calculado automaticamente a partir da BOM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedItem(null); setModalOpen(true); }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </button>
        </div>

        {/* Filters */}
        <div className="mt-5 grid gap-3 md:grid-cols-[180px_minmax(280px,1fr)]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código ou descrição"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {itemsQuery.isLoading ? <TableSkeleton /> : null}

      {/* Error */}
      {itemsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Erro ao carregar produtos acabados.</p>
              <button
                type="button"
                onClick={() => void itemsQuery.refetch()}
                className="mt-3 inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {!itemsQuery.isLoading && !itemsQuery.isError ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Peso</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Catálogo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Linha</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Designer</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Preço (BOM)</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.peso_liquido != null
                            ? formatDecimal(item.peso_liquido, 3)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.catalogo ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.linha ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.designer ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.unit_of_measure?.code ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <BomCustoCell itemId={item.id} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              item.active
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {item.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ActionsDropdown
                              item={item}
                              onEdit={() => { setSelectedItem(item); setModalOpen(true); }}
                              onDeactivate={() => void handleDeactivate(item)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                        Nenhum produto acabado encontrado para os filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando {showingFrom} a {showingTo} de {total} itens
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={() => setSkip((cur) => Math.max(0, cur - pageSize))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setSkip((cur) => cur + pageSize)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal */}
      <ProdutosAcabadosModal
        open={modalOpen}
        item={selectedItem}
        units={units}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
