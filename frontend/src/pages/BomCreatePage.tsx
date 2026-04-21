import { AlertCircle, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { useAddBomChild, useBomTree, useCreateBomHeader, useDeleteBomItem } from "@/hooks/useBom";
import { useMateriaPrima } from "@/hooks/useMateriaPrima";
import { useProdutoAcabado } from "@/hooks/useProdutoAcabado";
import { cn, extractErrorMessage, formatDecimal } from "@/lib/utils";
import { toast } from "sonner";
import type { FinishedProduct, RawMaterial } from "@/types";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

export default function BomCreatePage({ initialProduct }: { initialProduct?: FinishedProduct | null } = {}) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(initialProduct ?? null);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (initialProduct) setSelectedProduct(initialProduct);
  }, [initialProduct]);

  const productsQuery = useProdutoAcabado({
    desc: debouncedSearch || undefined,
    active_only: true,
    without_bom: true,
    skip: 0,
    limit: 20,
  });

  const bomTreeQuery = useBomTree(selectedProduct?.id ?? null);
  const createHeader = useCreateBomHeader();
  const hasNoBom = axios.isAxiosError(bomTreeQuery.error) && bomTreeQuery.error.response?.status === 404;
  const tree = bomTreeQuery.data;

  const refresh = () => {
    void bomTreeQuery.refetch();
  };

  const handleCreateBom = async () => {
    if (!selectedProduct) return;
    try {
      await createHeader.mutateAsync({
        parent_item_id: selectedProduct.id,
        version_code: "1.0",
        description: `BOM ${selectedProduct.code}`,
        valid_from: new Date().toISOString().slice(0, 10),
      });
      refresh();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Criar BOM</h1>
          <p className="mt-1 text-sm text-slate-500">Selecione o Produto Acabado.</p>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 min-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : productsQuery.data?.items?.length ? (
              productsQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProduct(item)}
                  className={cn(
                    "flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left last:border-b-0",
                    selectedProduct?.id === item.id
                      ? "border-l-4 border-l-blue-600 bg-blue-50"
                      : "hover:bg-slate-50",
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
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-slate-50/30">
        {!selectedProduct ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
            Selecione um Produto Acabado na lateral para começar.
          </div>
        ) : bomTreeQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : hasNoBom ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">BOM ainda não cadastrada</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedProduct.code} — {selectedProduct.description}
              </p>
              <button
                type="button"
                onClick={handleCreateBom}
                disabled={createHeader.isPending}
                className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {createHeader.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar BOM
              </button>
            </div>
          </div>
        ) : tree ? (
          <BomCreateContent
            product={selectedProduct}
            bomId={tree.bom_id!}
            items={tree.children}
            onRefresh={refresh}
          />
        ) : null}
      </section>
    </div>
  );
}

function BomCreateContent({
  product,
  bomId,
  items,
  onRefresh,
}: {
  product: FinishedProduct;
  bomId: string;
  items: { bom_item_id?: string | null; item_id?: string; code: string; description: string; quantity?: number | null }[];
  onRefresh: () => void;
}) {
  const materiasQuery = useMateriaPrima({ active_only: true, limit: 2000 });
  const addChild = useAddBomChild();
  const deleteItem = useDeleteBomItem();

  const [codeInput, setCodeInput] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [useConversion, setUseConversion] = useState(false);
  const debouncedCode = useDebouncedValue(codeInput.trim().toUpperCase(), 250);

  const lookupEnabled = debouncedCode.length > 0;
  const codeLookupQuery = useMateriaPrima(
    { code: debouncedCode, active_only: true, limit: 5 },
    { enabled: lookupEnabled },
  );

  const selectedMP = useMemo(() => {
    if (!lookupEnabled) return null;
    const items = codeLookupQuery.data?.items ?? [];
    return items.find((mp) => mp.code.toUpperCase() === debouncedCode) ?? null;
  }, [codeLookupQuery.data, debouncedCode, lookupEnabled]);

  const mpNotFound =
    lookupEnabled && !selectedMP && !codeLookupQuery.isLoading && !codeLookupQuery.isFetching;

  const hasConversion = !!selectedMP?.unidade_conversao_id && !!selectedMP?.peso_liquido;
  useEffect(() => {
    if (!hasConversion) setUseConversion(false);
  }, [hasConversion]);

  const qtyNumber = Number(quantity);
  const convertedValue =
    useConversion && hasConversion && qtyNumber > 0
      ? qtyNumber * Number(selectedMP!.peso_liquido)
      : null;

  const handleAdd = async () => {
    if (!selectedMP) return;
    if (!qtyNumber || qtyNumber <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    const nextLineNumber = (items.length || 0) + 1;
    try {
      await addChild.mutateAsync({
        bom_id: bomId,
        data: {
          parent_item_id: product.id,
          child_item_id: selectedMP.id,
          quantity: qtyNumber,
          scrap_percent: 0,
          line_number: nextLineNumber,
        },
      });
      setCodeInput("");
      setQuantity("");
      setUseConversion(false);
      onRefresh();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleDelete = async (bomItemId: string) => {
    try {
      await deleteItem.mutateAsync(bomItemId);
      onRefresh();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const rawMaterialsById = useMemo(() => {
    const map = new Map<string, RawMaterial>();
    (materiasQuery.data?.items ?? []).forEach((mp) => map.set(mp.id, mp));
    return map;
  }, [materiasQuery.data]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Produto Acabado</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {product.code} — {product.description}
        </h2>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Adicionar item</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr_1fr_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Código MP</label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Ex: MP001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {mpNotFound ? (
              <p className="flex items-center text-xs text-red-600">
                <AlertCircle className="mr-1 h-3 w-3" />
                Código não encontrado
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Descrição</label>
            <div className="flex h-[38px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
              {selectedMP ? selectedMP.description : <span className="text-slate-400">—</span>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Quantidade {selectedMP?.unit_of_measure?.code ? `(${selectedMP.unit_of_measure.code})` : ""}
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!selectedMP}
              placeholder="0,000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedMP || addChild.isPending}
            className="inline-flex h-[38px] items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {addChild.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar
          </button>
        </div>

        {selectedMP ? (
          <div className="mt-4 flex items-center gap-3">
            <label className={cn("flex items-center gap-2 text-sm", hasConversion ? "text-slate-700" : "text-slate-400")}>
              <input
                type="checkbox"
                checked={useConversion}
                onChange={(e) => setUseConversion(e.target.checked)}
                disabled={!hasConversion}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />
              Converter para 2ª unidade de medida
              {!hasConversion ? <span className="text-xs text-slate-400">(sem fator cadastrado)</span> : null}
            </label>
            {convertedValue != null ? (
              <span className="text-sm text-slate-600">
                = <strong>{formatDecimal(convertedValue, 3)}</strong> {selectedMP.unidade_conversao?.code}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Itens da BOM ({items.length})
        </h3>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhum item adicionado ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {items.map((child) => {
              const mp = child.item_id ? rawMaterialsById.get(child.item_id) : null;
              const uomCode = mp?.unit_of_measure?.code ?? "";
              return (
                <li key={child.bom_item_id ?? child.item_id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {child.code} — {child.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDecimal(Number(child.quantity ?? 0), 3)} {uomCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => child.bom_item_id && handleDelete(child.bom_item_id)}
                    disabled={deleteItem.isPending}
                    className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
