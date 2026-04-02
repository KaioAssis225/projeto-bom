import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { AlertCircle, Factory, FolderTree, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BomChildModal, BomTreeNode } from "@/components/bom/BomTreeNode";
import { useCreateBomHeader, useBomTree } from "@/hooks/useBom";
import { useItens } from "@/hooks/useItens";
import { cn, formatDateOnly, itemTypeBadgeColor, itemTypeLabel } from "@/lib/utils";
import type { Item } from "@/types";

const bomHeaderSchema = z.object({
  version_code: z.string().trim().min(1, "Informe a versão").max(30, "Máximo de 30 caracteres"),
  description: z.string().trim().max(255, "Máximo de 255 caracteres").optional(),
  valid_from: z.string().min(1, "Informe a data inicial"),
});

type BomHeaderFormValues = z.infer<typeof bomHeaderSchema>;

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function BomHeaderModal({
  open,
  product,
  onClose,
  onSuccess,
}: {
  open: boolean;
  product: Item | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createBomHeader = useCreateBomHeader();
  const form = useForm<BomHeaderFormValues>({
    resolver: zodResolver(bomHeaderSchema),
    defaultValues: {
      version_code: "1.0",
      description: "",
      valid_from: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        version_code: "1.0",
        description: "",
        valid_from: new Date().toISOString().slice(0, 10),
      });
    }
  }, [form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!product) {
      return;
    }

    await createBomHeader.mutateAsync({
      parent_item_id: product.id,
      version_code: values.version_code.trim(),
      description: values.description?.trim() || undefined,
      valid_from: values.valid_from,
    });

    onClose();
    onSuccess();
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Nova BOM</h2>
          <p className="text-sm text-slate-500">
            {product ? `Crie a estrutura inicial para ${product.code} — ${product.description}.` : "Selecione um produto."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="bom-version" className="text-sm font-medium text-slate-700">
                Versão
              </label>
              <input
                id="bom-version"
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...form.register("version_code")}
              />
              {form.formState.errors.version_code ? (
                <p className="text-sm text-red-600">{form.formState.errors.version_code.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="bom-valid-from" className="text-sm font-medium text-slate-700">
                Válida desde
              </label>
              <input
                id="bom-valid-from"
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...form.register("valid_from")}
              />
              {form.formState.errors.valid_from ? (
                <p className="text-sm text-red-600">{form.formState.errors.valid_from.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bom-description" className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              id="bom-description"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              disabled={createBomHeader.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createBomHeader.isPending || !product}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createBomHeader.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar BOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BomPage() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [rootAddChildOpen, setRootAddChildOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const productsQuery = useItens({
    type: "FINISHED_PRODUCT",
    description_contains: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const bomTreeQuery = useBomTree(selectedProduct?.id ?? null);

  const hasNoBom = axios.isAxiosError(bomTreeQuery.error) && bomTreeQuery.error.response?.status === 404;
  const hasTreeError = bomTreeQuery.isError && !hasNoBom;
  const selectedProductStillVisible = useMemo(
    () => (productsQuery.data?.items ?? []).some((item) => item.id === selectedProduct?.id),
    [productsQuery.data?.items, selectedProduct?.id],
  );

  const refreshTree = () => {
    void bomTreeQuery.refetch();
  };

  const tree = bomTreeQuery.data;

  return (
    <div className="flex min-h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Selecionar Produto</h1>
          <p className="mt-1 text-sm text-slate-500">Escolha um produto acabado para visualizar ou editar sua BOM.</p>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por descrição"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 min-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando produtos...
              </div>
            ) : productsQuery.data?.items?.length ? (
              productsQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProduct(item)}
                  className={cn(
                    "flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left last:border-b-0",
                    selectedProduct?.id === item.id ? "border-l-4 border-l-blue-600 bg-blue-50" : "hover:bg-slate-50",
                  )}
                >
                  <span className="text-sm font-medium text-slate-900">{item.code}</span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Nenhum produto encontrado</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setHeaderModalOpen(true)}
            disabled={!selectedProduct || !hasNoBom}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova BOM
          </button>

          {selectedProduct && !selectedProductStillVisible ? (
            <p className="mt-3 text-xs text-slate-500">
              O produto selecionado segue carregado, mesmo sem aparecer no filtro atual.
            </p>
          ) : null}
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-slate-50/30">
        {!selectedProduct ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <FolderTree className="h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-xl font-semibold text-slate-800">Selecione um produto para visualizar sua BOM</h2>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Use a coluna ao lado para localizar um produto acabado e carregar sua estrutura multinível.
            </p>
          </div>
        ) : bomTreeQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando árvore da BOM...
            </div>
          </div>
        ) : hasTreeError ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Não foi possível carregar a BOM</h2>
              <p className="mt-2 text-sm text-slate-500">
                Houve um problema ao buscar a estrutura deste produto. Tente novamente.
              </p>
              <button
                type="button"
                onClick={refreshTree}
                className="mt-5 inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        ) : hasNoBom ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Factory className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Este produto não possui BOM cadastrada</h2>
              <p className="mt-2 text-sm text-slate-500">
                Crie uma BOM para começar a estruturar componentes e semiacabados deste produto.
              </p>
              <button
                type="button"
                onClick={() => setHeaderModalOpen(true)}
                className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar BOM
              </button>
            </div>
          </div>
        ) : tree ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Produto</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {tree.code} — {tree.description}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        itemTypeBadgeColor(tree.type),
                      )}
                    >
                      {itemTypeLabel(tree.type)}
                    </span>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Versão {tree.version_code ?? "—"}
                    </span>
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      Ativa
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                  <div className="text-sm text-slate-500">
                    Válida desde: <span className="font-medium text-slate-700">{tree.valid_from ? formatDateOnly(tree.valid_from) : "—"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRootAddChildOpen(true)}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar filho
                  </button>
                </div>
              </div>
            </div>

            {tree.children.length > 0 ? (
              <div className="space-y-3">
                {tree.children.map((node) => (
                  <BomTreeNode
                    key={`${node.bom_item_id ?? node.item_id}-${node.path}`}
                    node={node}
                    depth={0}
                    bomId={tree.bom_id ?? ""}
                    onRefresh={refreshTree}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                BOM vazia. Adicione o primeiro componente para começar a estruturar este produto.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <BomHeaderModal
        open={headerModalOpen}
        product={selectedProduct}
        onClose={() => setHeaderModalOpen(false)}
        onSuccess={refreshTree}
      />

      {tree?.bom_id && selectedProduct ? (
        <BomChildModal
          open={rootAddChildOpen}
          bomId={tree.bom_id}
          parentItemId={selectedProduct.id}
          parentLabel={`${selectedProduct.code} — ${selectedProduct.description}`}
          onClose={() => setRootAddChildOpen(false)}
          onRefresh={refreshTree}
        />
      ) : null}
    </div>
  );
}
