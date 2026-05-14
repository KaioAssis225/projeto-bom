import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import {
  useCreateSetor,
  useDeactivateSetor,
  useDeleteSetor,
  useSetores,
  useUpdateSetor,
} from "@/hooks/useSetores";
import { cn } from "@/lib/utils";
import type { Setor } from "@/types";

const setorSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(50, "Máximo de 50 caracteres"),
});

type SetorFormValues = z.infer<typeof setorSchema>;

function SetoresTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SetorModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Setor | null;
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createSetor = useCreateSetor();
  const updateSetor = useUpdateSetor();
  const isSubmitting = createSetor.isPending || updateSetor.isPending;

  const form = useForm<SetorFormValues>({
    resolver: zodResolver(setorSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ name: "" });
      return;
    }
    form.reset({ name: item?.name ?? "" });
  }, [form, item, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEditing && item) {
      await updateSetor.mutateAsync({
        id: item.id,
        data: { name: values.name.trim(), active: item.active },
      });
    } else {
      await createSetor.mutateAsync({ name: values.name.trim() });
    }
    onClose();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar Setor" : "Novo Setor"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize o nome do setor." : "Cadastre um novo setor."}
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
            <label htmlFor="setor-name" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="setor-name"
              type="text"
              maxLength={50}
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100",
              )}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
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

export default function SetoresPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);

  const setoresQuery = useSetores({ skip: 0, limit: 200, active_only: false });
  const deactivateSetor = useDeactivateSetor();
  const deleteSetor = useDeleteSetor();
  const isMutating = deactivateSetor.isPending || deleteSetor.isPending;

  const filteredItems = useMemo(() => {
    const allItems = setoresQuery.data?.items ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return allItems;
    return allItems.filter((s) => s.name.toLowerCase().includes(normalizedSearch));
  }, [setoresQuery.data?.items, search]);

  const handleDeactivate = async (setor: Setor) => {
    if (!window.confirm(`Deseja inativar o setor "${setor.name}"?`)) return;
    await deactivateSetor.mutateAsync(setor.id);
  };

  const handleDelete = async (setor: Setor) => {
    if (
      !window.confirm(
        `Excluir definitivamente o setor "${setor.name}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    await deleteSetor.mutateAsync(setor.id);
  };

  const buildActions = (setor: Setor): RowAction[] => {
    const actions: RowAction[] = [
      {
        label: "Editar",
        icon: Pencil,
        onClick: () => {
          setSelectedSetor(setor);
          setModalOpen(true);
        },
      },
    ];
    if (setor.active) {
      actions.push({
        label: "Inativar",
        icon: Ban,
        onClick: () => void handleDeactivate(setor),
      });
    }
    actions.push({
      label: "Excluir",
      icon: Trash2,
      variant: "danger",
      onClick: () => void handleDelete(setor),
    });
    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Setores</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os setores usados para classificar matérias-primas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSetor(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Setor
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {setoresQuery.data
              ? `${filteredItems.length} setor(es) exibido(s)`
              : "Carregando..."}
          </span>
        </div>
      </div>

      {setoresQuery.isLoading ? <SetoresTableSkeleton /> : null}

      {setoresQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os setores.</p>
          <button
            type="button"
            onClick={() => void setoresQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!setoresQuery.isLoading && !setoresQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((setor) => (
                    <tr key={setor.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{setor.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            setor.active
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {setor.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <RowActionsMenu actions={buildActions(setor)} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum setor cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <SetorModal
        open={modalOpen}
        item={selectedSetor}
        onClose={() => {
          setModalOpen(false);
          setSelectedSetor(null);
        }}
      />
    </div>
  );
}
