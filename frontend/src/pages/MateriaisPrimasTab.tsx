import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, MoreVertical, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import * as precosApi from "@/api/precos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useGrupos } from "@/hooks/useGrupos";
import { useCreateItem, useDeactivateItem, useItens, useUpdateItem } from "@/hooks/useItens";
import { usePrecoHistory, useSetPreco } from "@/hooks/usePrecos";
import { useUnidades } from "@/hooks/useUnidades";
import { cn, extractErrorMessage, formatCurrency, formatDate, formatDecimal, supplierLabel } from "@/lib/utils";
import type { Item, MaterialGroup, Supplier, UnitOfMeasure } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MATERIAIS_TYPES = ["RAW_MATERIAL", "PACKAGING", "SEMI_FINISHED"] as const;
type MateriaisItemType = (typeof MATERIAIS_TYPES)[number];

const MATERIAIS_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Matéria-Prima",
  PACKAGING: "Embalagem",
  SEMI_FINISHED: "Material Fornecido",
};

const MATERIAIS_TYPE_OPTIONS: Array<{ value: MateriaisItemType; label: string }> = [
  { value: "RAW_MATERIAL", label: "Matéria-Prima" },
  { value: "PACKAGING", label: "Embalagem" },
  { value: "SEMI_FINISHED", label: "Material Fornecido" },
];

const MATERIAIS_TYPE_COLORS: Record<string, string> = {
  RAW_MATERIAL: "bg-blue-100 text-blue-800",
  PACKAGING: "bg-purple-100 text-purple-800",
  SEMI_FINISHED: "bg-amber-100 text-amber-800",
};

type StatusFilter = "all" | "active" | "inactive";

// ─── CustoCell ────────────────────────────────────────────────────────────────

function CustoCell({ itemId }: { itemId: string }) {
  const { data, isError, isPending } = useQuery({
    queryKey: ["precos", "current", itemId],
    queryFn: () => precosApi.getCurrent(itemId),
    retry: false,
  });

  if (isPending) {
    return <span className="inline-block h-3 w-16 animate-pulse rounded bg-slate-200" />;
  }
  if (isError || !data) {
    return <span className="text-slate-400">Sem custo</span>;
  }
  return <span className="text-slate-700">R$ {formatCurrency(data.price_value)}</span>;
}

function fatorConversaoLabel(item: Item): string {
  if (item.peso_liquido == null) {
    return "—";
  }

  const fator = formatDecimal(item.peso_liquido, 3);
  return item.unidade_conversao?.code ? `${fator} ${item.unidade_conversao.code}` : fator;
}

// ─── CustoHistoricoModal ──────────────────────────────────────────────────────

function CustoHistoricoModal({
  open,
  itemId,
  itemCode,
  itemDescription,
  onClose,
}: {
  open: boolean;
  itemId: string;
  itemCode: string;
  itemDescription: string;
  onClose: () => void;
}) {
  const historyQuery = usePrecoHistory(open ? itemId : null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Histórico de Custo</h2>
            <p className="text-sm text-slate-500">
              {itemCode} — {itemDescription}
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

        <div className="overflow-hidden px-6 py-5">
          {historyQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <p className="text-sm text-red-600">Erro ao carregar histórico.</p>
          ) : (historyQuery.data?.items ?? []).length === 0 ? (
            <p className="text-center text-sm text-slate-500">Nenhum histórico encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Valor</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Válido desde</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Válido até</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Motivo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Registrado por</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyQuery.data?.items.map((price) => (
                    <tr key={price.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        R$ {formatCurrency(price.price_value)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(price.valid_from)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {price.valid_to ? formatDate(price.valid_to) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{price.changed_reason ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{price.created_by}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            price.is_current
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {price.is_current ? "Vigente" : "Encerrado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
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

// ─── Modal schema ─────────────────────────────────────────────────────────────

const materiaisSchema = z
  .object({
    code: z.string().trim().min(1, "Informe o código").max(60, "Máximo de 60 caracteres"),
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição")
      .max(255, "Máximo de 255 caracteres"),
    type: z.enum(["RAW_MATERIAL", "PACKAGING", "SEMI_FINISHED"]),
    unit_of_measure_id: z.string().uuid("Selecione uma unidade válida"),
    material_group_id: z.string().uuid("Selecione um grupo válido").optional().nullable(),
    supplier_id: z.string().uuid().optional().nullable(),
    peso_liquido: z.number().positive("Deve ser maior que zero").optional().nullable(),
    unidade_conversao_id: z.string().uuid("Selecione uma unidade válida").optional().nullable(),
    custo: z.number().positive("Deve ser maior que zero").optional().nullable(),
    created_by: z.string().trim().max(100).optional().nullable(),
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
    if (data.custo && !data.created_by) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Registrado por é obrigatório quando o custo é informado",
        path: ["created_by"],
      });
    }
  });

type MateriaisFormValues = z.infer<typeof materiaisSchema>;

// ─── MateriaisPrimasModal ────────────────────────────────────────────────────

function MateriaisPrimasModal({
  open,
  item,
  groups,
  units,
  suppliers,
  onClose,
}: {
  open: boolean;
  item: Item | null;
  groups: MaterialGroup[];
  units: UnitOfMeasure[];
  suppliers: Supplier[];
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const setPreco = useSetPreco();
  const isSubmitting = createItem.isPending || updateItem.isPending || setPreco.isPending;

  // Preload current price for edit mode
  const currentPriceQuery = useQuery({
    queryKey: ["precos", "current", item?.id],
    queryFn: () => precosApi.getCurrent(item!.id),
    enabled: isEditing && open,
    retry: false,
  });

  const form = useForm<MateriaisFormValues>({
    resolver: zodResolver(materiaisSchema),
    defaultValues: {
      code: "",
      description: "",
      type: "RAW_MATERIAL",
      unit_of_measure_id: "",
      unidade_conversao_id: null,
      material_group_id: null,
      supplier_id: null,
      peso_liquido: null,
      custo: null,
      created_by: null,
      notes: "",
    },
  });

  const selectedType = form.watch("type");
  const selectedConversionUnitId = form.watch("unidade_conversao_id");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      form.reset({
        code: "",
        description: "",
        type: "RAW_MATERIAL",
        unit_of_measure_id: "",
        unidade_conversao_id: null,
        material_group_id: null,
        supplier_id: null,
        peso_liquido: null,
        custo: null,
        created_by: null,
        notes: "",
      });
      return;
    }

    form.reset({
      code: item?.code ?? "",
      description: item?.description ?? "",
      type: (item?.type as MateriaisItemType | undefined) ?? "RAW_MATERIAL",
      unit_of_measure_id: item?.unit_of_measure_id ?? "",
      unidade_conversao_id: item?.unidade_conversao_id ?? null,
      material_group_id: item?.material_group_id ?? null,
      supplier_id: item?.supplier_id ?? null,
      peso_liquido: item?.peso_liquido ?? null,
      custo: null,
      created_by: null,
      notes: item?.notes ?? "",
    });
  }, [form, item, open]);

  // Populate custo field once current price loads
  useEffect(() => {
    if (currentPriceQuery.data?.price_value != null) {
      form.setValue("custo", currentPriceQuery.data.price_value);
    }
  }, [currentPriceQuery.data, form]);

  // Clear material_group_id when type is not RAW_MATERIAL
  useEffect(() => {
    if (selectedType !== "RAW_MATERIAL") {
      form.setValue("material_group_id", null, { shouldValidate: false });
    }
  }, [form, selectedType]);

  useEffect(() => {
    if (!selectedConversionUnitId) {
      form.setValue("peso_liquido", null, { shouldValidate: false });
    }
  }, [form, selectedConversionUnitId]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let itemId: string;

      if (isEditing && item) {
        await updateItem.mutateAsync({
          id: item.id,
          data: {
            description: values.description.trim(),
            active: item.active,
            notes: values.notes?.trim() || undefined,
            material_group_id: values.material_group_id ?? undefined,
            supplier_id: values.supplier_id ?? undefined,
            peso_liquido: values.peso_liquido ?? undefined,
            unidade_conversao_id: values.unidade_conversao_id ?? undefined,
          },
        });
        itemId = item.id;
      } else {
        const created = await createItem.mutateAsync({
          code: values.code.trim(),
          description: values.description.trim(),
          type: values.type,
          unit_of_measure_id: values.unit_of_measure_id,
          material_group_id: values.material_group_id ?? undefined,
          supplier_id: values.supplier_id ?? undefined,
          peso_liquido: values.peso_liquido ?? undefined,
          unidade_conversao_id: values.unidade_conversao_id ?? undefined,
          notes: values.notes?.trim() || undefined,
        });
        itemId = created.id;
      }

      // Save price if filled and changed from current
      const currentPrice = currentPriceQuery.data?.price_value;
      const shouldSavePrice =
        values.custo != null && (!isEditing || values.custo !== currentPrice);

      if (shouldSavePrice && values.created_by) {
        await setPreco.mutateAsync({
          item_id: itemId,
          data: {
            item_id: itemId,
            price_value: values.custo!,
            valid_from: new Date().toISOString(),
            created_by: values.created_by.trim(),
            changed_reason: "Cadastro de custo",
          },
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
              {isEditing ? "Editar Matéria-Prima" : "Nova Matéria-Prima"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing
                ? "Atualize os dados cadastrais."
                : "Cadastre uma nova matéria-prima, embalagem ou material fornecido."}
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
            {/* Código + Tipo */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="mp-code" className="text-sm font-medium text-slate-700">
                  Código
                </label>
                <input
                  id="mp-code"
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

              <div className="space-y-2">
                <label htmlFor="mp-type" className="text-sm font-medium text-slate-700">
                  Tipo
                </label>
                <select
                  id="mp-type"
                  disabled={isEditing || isSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("type")}
                >
                  {MATERIAIS_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.type ? (
                  <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
                ) : null}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label htmlFor="mp-description" className="text-sm font-medium text-slate-700">
                Descrição
              </label>
              <input
                id="mp-description"
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

            {/* Unidade + Grupo */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="mp-uom" className="text-sm font-medium text-slate-700">
                  Unidade
                </label>
                <select
                  id="mp-uom"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("unit_of_measure_id")}
                >
                  <option value="">Selecione</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} — {unit.description}
                    </option>
                  ))}
                </select>
                {form.formState.errors.unit_of_measure_id ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.unit_of_measure_id.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="mp-group" className="text-sm font-medium text-slate-700">
                  Grupo{selectedType === "RAW_MATERIAL" ? <span className="text-red-600"> *</span> : null}
                </label>
                <select
                  id="mp-group"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("material_group_id")}
                  value={form.watch("material_group_id") ?? ""}
                >
                  <option value="">Selecione</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.material_group_id ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.material_group_id.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Fornecedor */}
            <div className="space-y-2">
              <label htmlFor="mp-supplier" className="text-sm font-medium text-slate-700">
                Fornecedor
              </label>
              <select
                id="mp-supplier"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                {...form.register("supplier_id")}
                value={form.watch("supplier_id") ?? ""}
              >
                <option value="">Selecione</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unidade de Convers?o + Fator de Convers?o */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="mp-unidade-conversao"
                  className="text-sm font-medium text-slate-700"
                >
                  Unidade de Convers?o
                </label>
                <select
                  id="mp-unidade-conversao"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  {...form.register("unidade_conversao_id")}
                  value={form.watch("unidade_conversao_id") ?? ""}
                >
                  <option value="">Selecione</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} ??? {unit.description}
                    </option>
                  ))}
                </select>
                {form.formState.errors.unidade_conversao_id ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.unidade_conversao_id.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="mp-peso" className="text-sm font-medium text-slate-700">
                  Fator de Convers?o
                </label>
                <input
                  id="mp-peso"
                  type="number"
                  step="0.001"
                  min="0"
                  disabled={isSubmitting || !selectedConversionUnitId}
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

            {/* Custo */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Custo
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="mp-custo" className="text-sm font-medium text-slate-700">
                    Valor do custo
                  </label>
                  <input
                    id="mp-custo"
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    {...form.register("custo", {
                      setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                    })}
                  />
                  {form.formState.errors.custo ? (
                    <p className="text-sm text-red-600">{form.formState.errors.custo.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="mp-createdby" className="text-sm font-medium text-slate-700">
                    Registrado por
                  </label>
                  <input
                    id="mp-createdby"
                    type="text"
                    maxLength={100}
                    disabled={isSubmitting}
                    placeholder="Obrigatório se custo informado"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    {...form.register("created_by")}
                  />
                  {form.formState.errors.created_by ? (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.created_by.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label htmlFor="mp-notes" className="text-sm font-medium text-slate-700">
                Observações
              </label>
              <textarea
                id="mp-notes"
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
  onHistory,
  onDeactivate,
}: {
  item: Item;
  onEdit: () => void;
  onHistory: () => void;
  onDeactivate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
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
        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            ✏️ Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onHistory();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            💰 Histórico de Custo
          </button>
          {item.active ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDeactivate();
              }}
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
          <div key={i} className="grid grid-cols-10 gap-4">
            {Array.from({ length: 10 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MateriaisPrimasTab (main) ────────────────────────────────────────────────

export default function MateriaisPrimasTab() {
  const pageSize = 20;
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);

  const groupsQuery = useGrupos({ active_only: true, skip: 0, limit: 100 });
  const unitsQuery = useUnidades({ skip: 0, limit: 100 });
  const fornecedoresQuery = useFornecedores({ active_only: true, skip: 0, limit: 200 });

  const itemFilters = useMemo(
    () => ({
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

  // Filter client-side to only show material types
  const items = useMemo(() => {
    const all = itemsQuery.data?.items ?? [];
    const filtered = all.filter((item) =>
      (MATERIAIS_TYPES as readonly string[]).includes(item.type),
    );
    // For inactive tab, further filter inactive only
    if (statusFilter === "inactive") {
      return filtered.filter((item) => !item.active);
    }
    return filtered;
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
    await deactivateItem.mutateAsync(item.id);
  };

  const isMutating = deactivateItem.isPending;

  return (
    <>
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Matérias-Primas</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie matérias-primas, embalagens e materiais fornecidos com custo e fornecedor.
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
            Nova Matéria-Prima
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
              <p className="text-sm font-medium text-red-700">Erro ao carregar matérias-primas.</p>
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
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Grupo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                      Fat. Conversão
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                      Custo Vigente
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Fornecedor
                    </th>
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
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              MATERIAIS_TYPE_COLORS[item.type] ?? "bg-slate-100 text-slate-600",
                            )}
                          >
                            {MATERIAIS_TYPE_LABELS[item.type] ?? item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.material_group?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.unit_of_measure?.code ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {fatorConversaoLabel(item)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CustoCell itemId={item.id} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {supplierLabel(item.supplier)}
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
                              onEdit={() => {
                                setSelectedItem(item);
                                setModalOpen(true);
                              }}
                              onHistory={() => setHistoryItem(item)}
                              onDeactivate={() => void handleDeactivate(item)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        Nenhuma matéria-prima encontrada para os filtros aplicados
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

      {/* Create/Edit Modal */}
      <MateriaisPrimasModal
        open={modalOpen}
        item={selectedItem}
        groups={(groupsQuery.data?.items ?? []).filter((g) => g.active)}
        units={unitsQuery.data?.items ?? []}
        suppliers={(fornecedoresQuery.data?.items ?? []).filter((s) => s.active)}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* History Modal */}
      {historyItem ? (
        <CustoHistoricoModal
          open={historyItem !== null}
          itemId={historyItem.id}
          itemCode={historyItem.code}
          itemDescription={historyItem.description}
          onClose={() => setHistoryItem(null)}
        />
      ) : null}
    </>
  );
}
