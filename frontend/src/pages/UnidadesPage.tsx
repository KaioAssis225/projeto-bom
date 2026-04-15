import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateUnidade, useUnidades, useUpdateUnidade } from "@/hooks/useUnidades";
import { cn } from "@/lib/utils";
import type { UnitOfMeasure } from "@/types";

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Contagem: "bg-blue-100 text-blue-800",
  Comprimento: "bg-green-100 text-green-800",
  Massa: "bg-amber-100 text-amber-800",
  Volume: "bg-purple-100 text-purple-800",
  Área: "bg-rose-100 text-rose-800",
  Tempo: "bg-slate-100 text-slate-700",
};

const UNIT_CATEGORIES: Record<string, string> = {
  UN: "Contagem", PC: "Contagem", PAR: "Contagem",
  DZ: "Contagem", CX: "Contagem", KIT: "Contagem",
  MM: "Comprimento", CM: "Comprimento", M: "Comprimento",
  G: "Massa", KG: "Massa", TON: "Massa",
  ML: "Volume", L: "Volume",
  CM2: "Área", M2: "Área",
  H: "Tempo", MIN: "Tempo",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFactor(factor: number): string {
  if (factor >= 1) {
    // Integer or simple decimal
    if (Number.isInteger(factor)) return factor.toLocaleString("pt-BR");
    return factor.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  }
  // Very small — show up to 10 decimal places, trim trailing zeros
  return factor.toLocaleString("pt-BR", { maximumSignificantDigits: 4 });
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

function UnitsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_2fr_1fr_1fr_0.9fr] gap-4">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ConversionsPanel ─────────────────────────────────────────────────────────

function ConversionsPanel({ unit }: { unit: UnitOfMeasure }) {
  const conversions = unit.conversions ?? [];

  if (conversions.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-400 italic">
        Sem conversões cadastradas para esta unidade.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {conversions.map((c) => (
        <span
          key={c.to_unit_id}
          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 overflow-hidden"
        >
          {/* Left: "1 KG =" */}
          <span className="flex items-center gap-1 px-3 py-1">
            <span className="font-semibold text-slate-900">1 {unit.code}</span>
            <span className="text-slate-400">=</span>
            <span className="font-semibold text-blue-700">{formatFactor(c.factor)}</span>
          </span>
          {/* Divider */}
          <span className="self-stretch w-px bg-slate-200" aria-hidden />
          {/* Right: "G — Grama" */}
          <span className="flex items-center gap-1.5 px-3 py-1">
            <span className="font-bold text-slate-900">{c.to_unit_code}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{c.to_unit_description}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── UnitRow ──────────────────────────────────────────────────────────────────

function UnitRow({
  unit,
  onEdit,
}: {
  unit: UnitOfMeasure;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = UNIT_CATEGORIES[unit.code] ?? "Outro";
  const colorClass = CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-700";
  const hasConversions = (unit.conversions?.length ?? 0) > 0;

  return (
    <>
      <tr
        className={cn(
          "hover:bg-slate-50 cursor-pointer",
          expanded && "bg-slate-50",
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasConversions ? (
              expanded
                ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <span className="inline-block h-3.5 w-3.5" />
            )}
            <span className="font-mono font-semibold text-slate-900">{unit.code}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-slate-700">{unit.description}</td>
        <td className="px-4 py-3">
          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", colorClass)}>
            {category}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500">{unit.decimal_places}</td>
        <td className="px-4 py-3 text-slate-500 text-center">
          <span className="text-xs text-slate-400">
            {hasConversions ? `${unit.conversions!.length} conversão(ões)` : "—"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </button>
          </div>
        </td>
      </tr>

      {expanded && hasConversions ? (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-8 pb-3 pt-0">
            <ConversionsPanel unit={unit} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ─── UnitModal ────────────────────────────────────────────────────────────────

const unitSchema = z.object({
  code: z.string().trim().min(1, "Informe o código").max(20, "Máximo de 20 caracteres"),
  description: z.string().trim().min(1, "Informe a descrição").max(100, "Máximo de 100 caracteres"),
  decimal_places: z
    .number()
    .int("Informe um número inteiro")
    .min(0, "Mínimo 0")
    .max(6, "Máximo 6"),
});

type UnitFormValues = z.infer<typeof unitSchema>;

function UnitModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: UnitOfMeasure | null;
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createUnidade = useCreateUnidade();
  const updateUnidade = useUpdateUnidade();
  const isSubmitting = createUnidade.isPending || updateUnidade.isPending;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { code: "", description: "", decimal_places: 2 },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ code: "", description: "", decimal_places: 2 });
      return;
    }
    form.reset({
      code: item?.code ?? "",
      description: item?.description ?? "",
      decimal_places: item?.decimal_places ?? 2,
    });
  }, [form, item, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      description: values.description.trim(),
      decimal_places: values.decimal_places,
    };

    if (isEditing && item) {
      await updateUnidade.mutateAsync({
        id: item.id,
        data: { description: payload.description, decimal_places: payload.decimal_places },
      });
    } else {
      await createUnidade.mutateAsync(payload);
    }

    onClose();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar Unidade" : "Nova Unidade"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize os dados da unidade." : "Cadastre uma nova unidade de medida."}
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
          <div className="space-y-2">
            <label htmlFor="unit-code" className="text-sm font-medium text-slate-700">
              Código
            </label>
            <input
              id="unit-code"
              type="text"
              maxLength={20}
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
            <label htmlFor="unit-description" className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <input
              id="unit-description"
              type="text"
              maxLength={100}
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="unit-decimals" className="text-sm font-medium text-slate-700">
              Casas Decimais
            </label>
            <input
              id="unit-decimals"
              type="number"
              min={0}
              max={6}
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...form.register("decimal_places", { valueAsNumber: true })}
            />
            {form.formState.errors.decimal_places ? (
              <p className="text-sm text-red-600">{form.formState.errors.decimal_places.message}</p>
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

// ─── UnidadesPage (main) ──────────────────────────────────────────────────────

export default function UnidadesPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null);

  const unidadesQuery = useUnidades({ skip: 0, limit: 100 });

  const filteredItems = useMemo(() => {
    const allItems = unidadesQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((u) =>
      `${u.code} ${u.description}`.toLowerCase().includes(q),
    );
  }, [search, unidadesQuery.data?.items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Unidades de Medida</h1>
            <p className="mt-1 text-sm text-slate-500">
              Unidades padrão com regras de conversão. Clique em uma linha para ver as conversões.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedUnit(null); setModalOpen(true); }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Unidade
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            {unidadesQuery.data ? `${filteredItems.length} unidade(s)` : "Carregando..."}
          </span>
        </div>
      </div>

      {unidadesQuery.isLoading ? <UnitsTableSkeleton /> : null}

      {unidadesQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar as unidades.</p>
          <button
            type="button"
            onClick={() => void unidadesQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!unidadesQuery.isLoading && !unidadesQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Categoria</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Decimais</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Conversões</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((unit) => (
                    <UnitRow
                      key={unit.id}
                      unit={unit}
                      onEdit={() => { setSelectedUnit(unit); setModalOpen(true); }}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhuma unidade cadastrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <UnitModal
        open={modalOpen}
        item={selectedUnit}
        onClose={() => { setModalOpen(false); setSelectedUnit(null); }}
      />
    </div>
  );
}
