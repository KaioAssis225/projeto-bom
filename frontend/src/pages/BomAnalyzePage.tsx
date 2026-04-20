import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { useBomTree } from "@/hooks/useBom";
import { useMateriaPrima } from "@/hooks/useMateriaPrima";
import { useProdutoAcabado } from "@/hooks/useProdutoAcabado";
import { cn, formatDecimal } from "@/lib/utils";
import type { BomTreeNode, FinishedProduct, RawMaterial } from "@/types";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

interface EnrichedChild {
  node: BomTreeNode;
  mp: RawMaterial | null;
  uomCode: string;
  groupId: string;
  groupName: string;
  convertedQty: number | null;
  convertedUomCode: string | null;
}

export default function BomAnalyzePage() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const productsQuery = useProdutoAcabado({
    desc: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const bomTreeQuery = useBomTree(selectedProduct?.id ?? null);
  const materiasQuery = useMateriaPrima({ active_only: false, limit: 500 });

  const hasNoBom = axios.isAxiosError(bomTreeQuery.error) && bomTreeQuery.error.response?.status === 404;
  const tree = bomTreeQuery.data;

  const rawMaterialsById = useMemo(() => {
    const map = new Map<string, RawMaterial>();
    (materiasQuery.data?.items ?? []).forEach((mp) => map.set(mp.id, mp));
    return map;
  }, [materiasQuery.data]);

  const groupedItems = useMemo(() => {
    if (!tree) return [];
    const enriched: EnrichedChild[] = tree.children.map((node) => {
      const mp = node.item_id ? rawMaterialsById.get(node.item_id) ?? null : null;
      const qty = Number(node.quantity ?? 0);
      const hasConv = !!mp?.unidade_conversao_id && !!mp?.peso_liquido;
      return {
        node,
        mp,
        uomCode: mp?.unit_of_measure?.code ?? "—",
        groupId: mp?.material_group_id ?? "__sem_grupo__",
        groupName: mp?.material_group?.name ?? "Sem grupo",
        convertedQty: hasConv ? qty * Number(mp!.peso_liquido) : null,
        convertedUomCode: mp?.unidade_conversao?.code ?? null,
      };
    });

    const byGroup = new Map<string, { groupName: string; items: EnrichedChild[] }>();
    enriched.forEach((item) => {
      const existing = byGroup.get(item.groupId);
      if (existing) {
        existing.items.push(item);
      } else {
        byGroup.set(item.groupId, { groupName: item.groupName, items: [item] });
      }
    });

    return Array.from(byGroup.entries())
      .map(([groupId, { groupName, items }]) => ({
        groupId,
        groupName,
        items,
        subtotals: sumByUom(items.map((i) => ({ qty: Number(i.node.quantity ?? 0), uom: i.uomCode }))),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName, "pt-BR"));
  }, [tree, rawMaterialsById]);

  const grandTotals = useMemo(() => {
    if (!tree) return [];
    return sumByUom(
      tree.children.map((node) => {
        const mp = node.item_id ? rawMaterialsById.get(node.item_id) : null;
        return { qty: Number(node.quantity ?? 0), uom: mp?.unit_of_measure?.code ?? "—" };
      }),
    );
  }, [tree, rawMaterialsById]);

  return (
    <div className="flex min-h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Analisar BOM</h1>
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
            Selecione um Produto Acabado na lateral para visualizar a análise.
          </div>
        ) : bomTreeQuery.isLoading || materiasQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : hasNoBom ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Sem BOM cadastrada</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedProduct.code} — {selectedProduct.description}
              </p>
            </div>
          </div>
        ) : tree ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Produto Acabado</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {tree.code} — {tree.description}
              </h2>
              <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Versão {tree.version_code ?? "—"}
              </span>
            </div>

            {groupedItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                BOM vazia. Nenhum componente cadastrado.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedItems.map((group) => (
                  <div key={group.groupId} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        {group.groupName}
                      </h3>
                      <span className="text-xs text-slate-500">{group.items.length} {group.items.length === 1 ? "item" : "itens"}</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {group.items.map((ec) => (
                        <li key={ec.node.bom_item_id ?? ec.node.item_id} className="flex items-start justify-between px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {ec.node.code} — {ec.node.description}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatDecimal(Number(ec.node.quantity ?? 0), 3)} {ec.uomCode}
                              {ec.convertedQty != null && ec.convertedUomCode ? (
                                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                                  ≈ {formatDecimal(ec.convertedQty, 3)} {ec.convertedUomCode}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-2 text-sm">
                      <span className="text-xs font-medium text-slate-500">Subtotal:</span>
                      {group.subtotals.map((s) => (
                        <span key={s.uom} className="font-semibold text-slate-800">
                          {formatDecimal(s.total, 3)} {s.uom}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">Total geral:</span>
                  {grandTotals.map((t) => (
                    <span key={t.uom} className="text-base font-bold text-slate-900">
                      {formatDecimal(t.total, 3)} {t.uom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function sumByUom(rows: { qty: number; uom: string }[]): { uom: string; total: number }[] {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    map.set(r.uom, (map.get(r.uom) ?? 0) + r.qty);
  });
  return Array.from(map.entries()).map(([uom, total]) => ({ uom, total }));
}
