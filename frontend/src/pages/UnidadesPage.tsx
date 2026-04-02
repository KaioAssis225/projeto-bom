import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateUnidade, useUnidades, useUpdateUnidade } from "@/hooks/useUnidades";
import { cn } from "@/lib/utils";
import type { UnitOfMeasure } from "@/types";

const unitSchema = z.object({
  code: z.string().trim().min(1, "Informe o codigo").max(20, "Maximo de 20 caracteres"),
  description: z.string().trim().min(1, "Informe a descricao").max(100, "Maximo de 100 caracteres"),
  decimal_places: z
    .number()
    .int("Informe um numero inteiro")
    .min(0, "Minimo 0")
    .max(6, "Maximo 6"),
});

type UnitFormValues = z.infer<typeof unitSchema>;

function UnitsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_2fr_1fr_0.9fr] gap-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
    defaultValues: {
      code: "",
      description: "",
      decimal_places: 2,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: "",
        description: "",
        decimal_places: 2,
      });
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
        data: {
          description: payload.description,
          decimal_places: payload.decimal_places,
        },
      });
    } else {
      await createUnidade.mutateAsync(payload);
    }

    onClose();
  });

  if (!open) {
    return null;
  }

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
              Codigo
            </label>
            <input
              id="unit-code"
              type="text"
              maxLength={20}
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...form.register("code")}
            />
            {form.formState.errors.code ? (
              <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="unit-description" className="text-sm font-medium text-slate-700">
              Descricao
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

export default function UnidadesPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null);

  const unidadesQuery = useUnidades({ skip: 0, limit: 100 });

  const filteredItems = useMemo(() => {
    const allItems = unidadesQuery.data?.items ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allItems;
    }

    return allItems.filter((unit) => `${unit.code} ${unit.description}`.toLowerCase().includes(normalizedSearch));
  }, [search, unidadesQuery.data?.items]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Unidades de Medida</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre e mantenha as unidades usadas em itens, BOMs e cálculos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedUnit(null);
              setModalOpen(true);
            }}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código ou descrição"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {unidadesQuery.data ? `${filteredItems.length} unidade(s) exibida(s)` : "Carregando unidades..."}
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
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Casas Decimais</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{unit.code}</td>
                      <td className="px-4 py-3 text-slate-700">{unit.description}</td>
                      <td className="px-4 py-3 text-slate-500">{unit.decimal_places}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUnit(unit);
                              setModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
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
        onClose={() => {
          setModalOpen(false);
          setSelectedUnit(null);
        }}
      />
    </div>
  );
}
