import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useGrupos } from "@/hooks/useGrupos";
import { useCreateItem, useDeactivateItem, useItens, useUpdateItem } from "@/hooks/useItens";
import { useUnidades } from "@/hooks/useUnidades";
import { cn, itemTypeBadgeColor, itemTypeLabel } from "@/lib/utils";
import type { Item, ItemType, MaterialGroup, UnitOfMeasure } from "@/types";

const itemSchema = z
  .object({
    code: z.string().trim().min(1, "Informe o codigo").max(60, "Maximo de 60 caracteres"),
    description: z.string().trim().min(1, "Informe a descricao").max(255, "Maximo de 255 caracteres"),
    type: z.enum(["RAW_MATERIAL", "FINISHED_PRODUCT", "SEMI_FINISHED", "PACKAGING", "SERVICE"]),
    unit_of_measure_id: z.string().uuid("Selecione uma unidade valida"),
    material_group_id: z.string().uuid("Selecione um grupo valido").optional().nullable(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "RAW_MATERIAL" && !data.material_group_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grupo é obrigatório para Matéria-Prima",
        path: ["material_group_id"],
      });
    }
  });

type ItemFormValues = z.infer<typeof itemSchema>;
type StatusFilter = "all" | "active" | "inactive";

const ITEM_TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: "RAW_MATERIAL", label: "Matéria-Prima" },
  { value: "FINISHED_PRODUCT", label: "Produto Acabado" },
  { value: "SEMI_FINISHED", label: "Semiacabado" },
  { value: "PACKAGING", label: "Embalagem" },
  { value: "SERVICE", label: "Serviço" },
];

function ItemsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_1.7fr_1fr_1fr_0.8fr_0.8fr_0.9fr] gap-4">
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <div key={cellIndex} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemModal({
  open,
  item,
  groups,
  units,
  onClose,
}: {
  open: boolean;
  item: Item | null;
  groups: MaterialGroup[];
  units: UnitOfMeasure[];
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isSubmitting = createItem.isPending || updateItem.isPending;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      code: "",
      description: "",
      type: "FINISHED_PRODUCT",
      unit_of_measure_id: "",
      material_group_id: null,
      notes: "",
    },
  });

  const selectedType = form.watch("type");

  useEffect(() => {
    if (!open) {
      form.reset({
        code: "",
        description: "",
        type: "FINISHED_PRODUCT",
        unit_of_measure_id: "",
        material_group_id: null,
        notes: "",
      });
      return;
    }

    form.reset({
      code: item?.code ?? "",
      description: item?.description ?? "",
      type: item?.type ?? "FINISHED_PRODUCT",
      unit_of_measure_id: item?.unit_of_measure_id ?? "",
      material_group_id: item?.material_group_id ?? null,
      notes: item?.notes ?? "",
    });
  }, [form, item, open]);

  useEffect(() => {
    if (selectedType !== "RAW_MATERIAL") {
      form.setValue("material_group_id", null, { shouldValidate: true });
    }
  }, [form, selectedType]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEditing && item) {
      await updateItem.mutateAsync({
        id: item.id,
        data: {
          description: values.description.trim(),
          active: item.active,
          notes: values.notes?.trim() ? values.notes.trim() : undefined,
          material_group_id: values.material_group_id ?? undefined,
        },
      });
    } else {
      await createItem.mutateAsync({
        code: values.code.trim(),
        description: values.description.trim(),
        type: values.type,
        unit_of_measure_id: values.unit_of_measure_id,
        material_group_id: values.material_group_id ?? undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      });
    }

    onClose();
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{isEditing ? "Editar Item" : "Novo Item"}</h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize os dados cadastrais do item." : "Cadastre um novo item para a estrutura BOM."}
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
              <label htmlFor="item-code" className="text-sm font-medium text-slate-700">
                Código
              </label>
              <input
                id="item-code"
                type="text"
                maxLength={60}
                readOnly={isEditing}
                disabled={isSubmitting}
                className={cn(
                  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
                  isEditing && "cursor-not-allowed bg-slate-100 text-slate-500",
                )}
                {...form.register("code")}
              />
              {form.formState.errors.code ? (
                <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="item-type" className="text-sm font-medium text-slate-700">
                Tipo
              </label>
              <select
                id="item-type"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("type")}
              >
                {ITEM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.type ? (
                <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="item-description" className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <input
              id="item-description"
              type="text"
              maxLength={255}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="item-uom" className="text-sm font-medium text-slate-700">
                Unidade
              </label>
              <select
                id="item-uom"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("unit_of_measure_id")}
              >
                <option value="">Selecione</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.description}
                  </option>
                ))}
              </select>
              {form.formState.errors.unit_of_measure_id ? (
                <p className="text-sm text-red-600">{form.formState.errors.unit_of_measure_id.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="item-group" className="text-sm font-medium text-slate-700">
                Grupo {selectedType === "RAW_MATERIAL" ? <span className="text-red-600">*</span> : null}
              </label>
              <select
                id="item-group"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("material_group_id")}
                value={form.watch("material_group_id") ?? ""}
              >
                <option value="">Sem grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.code} - {group.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.material_group_id ? (
                <p className="text-sm text-red-600">{form.formState.errors.material_group_id.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="item-notes" className="text-sm font-medium text-slate-700">
              Observações
            </label>
            <textarea
              id="item-notes"
              rows={4}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              {...form.register("notes")}
            />
            {form.formState.errors.notes ? (
              <p className="text-sm text-red-600">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
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

export default function ItensPage() {
  const pageSize = 20;
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const groupsQuery = useGrupos({ active_only: true, skip: 0, limit: 100 });
  const unitsQuery = useUnidades({ skip: 0, limit: 100 });

  const itemFilters = useMemo(
    () => ({
      type: typeFilter || undefined,
      material_group_id: groupFilter || undefined,
      code_contains: search.trim() || undefined,
      description_contains: search.trim() || undefined,
      active_only: statusFilter === "inactive" ? false : statusFilter !== "all",
      skip,
      limit: pageSize,
    }),
    [groupFilter, search, skip, statusFilter, typeFilter],
  );

  const itemsQuery = useItens(itemFilters);
  const deactivateItem = useDeactivateItem();
  const isMutating = deactivateItem.isPending;

  const items = useMemo(() => {
    const baseItems = itemsQuery.data?.items ?? [];
    if (statusFilter === "inactive") {
      return baseItems.filter((item) => !item.active);
    }
    return baseItems;
  }, [itemsQuery.data?.items, statusFilter]);

  const total = useMemo(() => {
    if (statusFilter === "inactive") {
      return items.length;
    }
    return itemsQuery.data?.total ?? 0;
  }, [items.length, itemsQuery.data?.total, statusFilter]);

  const showingFrom = total === 0 ? 0 : skip + 1;
  const showingTo = total === 0 ? 0 : Math.min(skip + pageSize, statusFilter === "inactive" ? skip + items.length : total);
  const canGoPrevious = skip > 0;
  const canGoNext = statusFilter === "inactive" ? false : skip + pageSize < total;

  useEffect(() => {
    setSkip(0);
  }, [groupFilter, search, statusFilter, typeFilter]);

  const handleDeactivate = async (item: Item) => {
    if (!window.confirm(`Deseja inativar o item ${item.code}?`)) {
      return;
    }

    await deactivateItem.mutateAsync(item.id);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Cadastro de Itens</h1>
            <p className="mt-1 text-sm text-slate-500">
              Centralize o cadastro de matérias-primas, produtos acabados, semiacabados e serviços.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedItem(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[220px_240px_180px_minmax(280px,1fr)]">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos os tipos</option>
            {ITEM_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos os grupos</option>
            {(groupsQuery.data?.items ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código ou descrição"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {itemsQuery.isLoading ? <ItemsTableSkeleton /> : null}

      {itemsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Erro ao carregar os itens.</p>
              <p className="mt-1 text-sm text-red-600">Verifique os filtros aplicados ou tente novamente.</p>
              <button
                type="button"
                onClick={() => void itemsQuery.refetch()}
                className="mt-4 inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!itemsQuery.isLoading && !itemsQuery.isError ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Grupo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.code}</td>
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              itemTypeBadgeColor(item.type),
                            )}
                          >
                            {itemTypeLabel(item.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.material_group?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.unit_of_measure?.code ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              item.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {item.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(item);
                                setModalOpen(true);
                              }}
                              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                            </button>
                            {item.active ? (
                              <button
                                type="button"
                                onClick={() => void handleDeactivate(item)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                              >
                                Inativar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        Nenhum item encontrado para os filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando {showingFrom} a {showingTo} de {total} itens
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={() => setSkip((current) => Math.max(0, current - pageSize))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setSkip((current) => current + pageSize)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ItemModal
        open={modalOpen}
        item={selectedItem}
        groups={(groupsQuery.data?.items ?? []).filter((group) => group.active)}
        units={unitsQuery.data?.items ?? []}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
