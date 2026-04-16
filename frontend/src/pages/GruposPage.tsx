import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateGrupo, useDeactivateGrupo, useGrupos, useUpdateGrupo } from "@/hooks/useGrupos";
import { cn } from "@/lib/utils";
import type { MaterialGroup } from "@/types";

const groupSchema = z.object({
  code: z.string().trim().min(1, "Informe o codigo").max(50, "Maximo de 50 caracteres"),
  name: z.string().trim().min(1, "Informe o nome").max(120, "Maximo de 120 caracteres"),
});

type GroupFormValues = z.infer<typeof groupSchema>;

function GroupsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.1fr_1.4fr_2fr_0.8fr_0.9fr] gap-4">
            <div className="h-4 rounded bg-slate-200" />
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

function GroupModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: MaterialGroup | null;
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createGrupo = useCreateGrupo();
  const updateGrupo = useUpdateGrupo();
  const isSubmitting = createGrupo.isPending || updateGrupo.isPending;

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { code: "", name: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ code: "", name: "" });
      return;
    }
    form.reset({ code: item?.code ?? "", name: item?.name ?? "" });
  }, [form, item, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { code: values.code.trim(), name: values.name.trim() };

    if (isEditing && item) {
      await updateGrupo.mutateAsync({
        id: item.id,
        data: { name: payload.name, active: item.active },
      });
    } else {
      await createGrupo.mutateAsync(payload);
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
              {isEditing ? "Editar Grupo" : "Novo Grupo"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize os dados do grupo." : "Cadastre um novo grupo de materia-prima."}
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
            <label htmlFor="group-code" className="text-sm font-medium text-slate-700">
              Codigo
            </label>
            <input
              id="group-code"
              type="text"
              maxLength={50}
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
            <label htmlFor="group-name" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="group-name"
              type="text"
              maxLength={120}
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

export default function GruposPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MaterialGroup | null>(null);

  const gruposQuery = useGrupos({ skip: 0, limit: 100, active_only: false });
  const deactivateGrupo = useDeactivateGrupo();
  const isMutating = deactivateGrupo.isPending;

  const filteredItems = useMemo(() => {
    const allItems = gruposQuery.data?.items ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allItems;
    }

    return allItems.filter((group) => `${group.code} ${group.name}`.toLowerCase().includes(normalizedSearch));
  }, [gruposQuery.data?.items, search]);

  const handleDeactivate = async (group: MaterialGroup) => {
    if (!window.confirm(`Deseja inativar o grupo ${group.code}?`)) {
      return;
    }

    await deactivateGrupo.mutateAsync(group.id);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Grupos de Matéria-Prima</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os grupos usados para organizar matérias-primas no cálculo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedGroup(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Grupo
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código ou nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {gruposQuery.data ? `${filteredItems.length} grupo(s) exibido(s)` : "Carregando grupos..."}
          </span>
        </div>
      </div>

      {gruposQuery.isLoading ? <GroupsTableSkeleton /> : null}

      {gruposQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os grupos.</p>
          <button
            type="button"
            onClick={() => void gruposQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!gruposQuery.isLoading && !gruposQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((group) => (
                    <tr key={group.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{group.code}</td>
                      <td className="px-4 py-3 text-slate-700">{group.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            group.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {group.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroup(group);
                              setModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </button>
                          {group.active ? (
                            <button
                              type="button"
                              onClick={() => void handleDeactivate(group)}
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
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum grupo cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <GroupModal
        open={modalOpen}
        item={selectedGroup}
        onClose={() => {
          setModalOpen(false);
          setSelectedGroup(null);
        }}
      />
    </div>
  );
}
