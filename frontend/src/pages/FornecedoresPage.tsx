import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useCreateFornecedor,
  useDeactivateFornecedor,
  useFornecedores,
  useUpdateFornecedor,
} from "@/hooks/useFornecedores";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types";

const supplierSchema = z.object({
  code: z.string().trim().min(1, "Informe o código").max(50, "Máximo de 50 caracteres"),
  name: z.string().trim().min(1, "Informe o nome").max(120, "Máximo de 120 caracteres"),
  description: z.string().max(500, "Máximo de 500 caracteres").optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SupplierModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Supplier | null;
  onClose: () => void;
}) {
  const isEditing = item !== null;
  const createFornecedor = useCreateFornecedor();
  const updateFornecedor = useUpdateFornecedor();
  const isSubmitting = createFornecedor.isPending || updateFornecedor.isPending;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { code: "", name: "", description: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ code: "", name: "", description: "" });
      return;
    }
    form.reset({
      code: item?.code ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
    });
  }, [form, item, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    const description = values.description?.trim() || undefined;

    if (isEditing && item) {
      await updateFornecedor.mutateAsync({
        id: item.id,
        data: { name: values.name.trim(), description, active: item.active },
      });
    } else {
      await createFornecedor.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        description,
      });
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
              {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? "Atualize os dados do fornecedor." : "Cadastre um novo fornecedor."}
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
            <label htmlFor="sup-code" className="text-sm font-medium text-slate-700">
              Código
            </label>
            <input
              id="sup-code"
              type="text"
              maxLength={50}
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
            <label htmlFor="sup-name" className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="sup-name"
              type="text"
              maxLength={120}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="sup-description" className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              id="sup-description"
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
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

export default function FornecedoresPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fornecedoresQuery = useFornecedores({ skip: 0, limit: 100, active_only: false });
  const deactivateFornecedor = useDeactivateFornecedor();
  const isMutating = deactivateFornecedor.isPending;

  const filteredItems = useMemo(() => {
    const all = fornecedoresQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(q));
  }, [fornecedoresQuery.data?.items, search]);

  const handleDeactivate = async (supplier: Supplier) => {
    if (!window.confirm(`Deseja inativar o fornecedor "${supplier.code} — ${supplier.name}"?`)) return;
    await deactivateFornecedor.mutateAsync(supplier.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Fornecedores</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os fornecedores vinculados às matérias-primas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedSupplier(null); setModalOpen(true); }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código ou nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {fornecedoresQuery.data
              ? `${filteredItems.length} fornecedor(es) exibido(s)`
              : "Carregando..."}
          </span>
        </div>
      </div>

      {fornecedoresQuery.isLoading ? <TableSkeleton /> : null}

      {fornecedoresQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os fornecedores.</p>
          <button
            type="button"
            onClick={() => void fornecedoresQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!fornecedoresQuery.isLoading && !fornecedoresQuery.isError ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={cn("overflow-x-auto", isMutating && "pointer-events-none opacity-70")}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                        {supplier.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{supplier.name}</td>
                      <td className="px-4 py-3 text-slate-500">{supplier.description || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            supplier.active
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {supplier.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setSelectedSupplier(supplier); setModalOpen(true); }}
                            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </button>
                          {supplier.active ? (
                            <button
                              type="button"
                              onClick={() => void handleDeactivate(supplier)}
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
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum fornecedor cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <SupplierModal
        open={modalOpen}
        item={selectedSupplier}
        onClose={() => { setModalOpen(false); setSelectedSupplier(null); }}
      />
    </div>
  );
}
