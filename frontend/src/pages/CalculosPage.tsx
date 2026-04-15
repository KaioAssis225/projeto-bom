import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { useCalcularLote, useCalcularProduto, useDownloadExcel } from "@/hooks/useCalculos";
import { useGrupos } from "@/hooks/useGrupos";
import { useItens } from "@/hooks/useItens";
import { cn, formatCurrency, formatDecimal, itemTypeBadgeColor, itemTypeLabel } from "@/lib/utils";
import type { CalculationResponse, Item, MaterialGroup } from "@/types";

const optionalGroupField = z.string().optional();

const productCalculationSchema = z.object({
  root_item_id: z.string().uuid("Selecione um produto"),
  quantity: z.number().min(0.000001, "Informe uma quantidade maior que zero"),
  reference_date: z.string().optional(),
  material_group_id: optionalGroupField,
  requested_by: z.string().trim().min(1, "Informe o solicitante").max(100, "Máximo de 100 caracteres"),
  simulation_reference: z.string().max(100, "Máximo de 100 caracteres").optional(),
});

const batchCalculationSchema = z.object({
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid("Selecione um produto"),
        quantidade: z.number().min(0.000001, "Informe uma quantidade maior que zero"),
      }),
    )
    .min(1, "Adicione ao menos um produto"),
  reference_date: z.string().optional(),
  material_group_id: optionalGroupField,
  requested_by: z.string().trim().min(1, "Informe o solicitante").max(100, "Máximo de 100 caracteres"),
});

type ProductCalculationFormValues = z.infer<typeof productCalculationSchema>;
type BatchCalculationFormValues = z.infer<typeof batchCalculationSchema>;
type TabKey = "product" | "batch";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function nowLocalDateTime() {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function FinishedProductSelector({
  value,
  onSelect,
  placeholder,
}: {
  value: Item | null;
  onSelect: (item: Item) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState(value ? `${value.code} — ${value.description}` : "");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const productsQuery = useItens({
    type: "FINISHED_PRODUCT",
    description_contains: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  useEffect(() => {
    if (value) {
      setSearch(`${value.code} — ${value.description}`);
    }
  }, [value]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {open ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
          {productsQuery.isLoading ? (
            <div className="flex items-center justify-center px-4 py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando produtos...
            </div>
          ) : productsQuery.data?.items?.length ? (
            productsQuery.data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setSearch(`${item.code} — ${item.description}`);
                  setOpen(false);
                }}
                className="flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
              >
                <span className="text-sm font-medium text-slate-900">{item.code}</span>
                <span className="text-xs text-slate-500">{item.description}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhum produto encontrado</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultSection({
  result,
  onDownload,
  isDownloading,
}: {
  result: CalculationResponse;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total de Itens</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{result.totais.quantidade_itens}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Custo Geral</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">R$ {formatCurrency(result.totais.custo_geral)}</p>
          </div>
        </div>

        <div className="flex items-start justify-end">
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar Excel
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Grupo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qtd Acumulada</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Preço Vigente</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Custo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.linhas.map((line) => (
                <tr key={line.item_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{line.code}</td>
                  <td className="px-4 py-3 text-slate-700">{line.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        itemTypeBadgeColor(line.type),
                      )}
                    >
                      {itemTypeLabel(line.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{line.group_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{line.uom}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatDecimal(line.accumulated_quantity, 2)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">R$ {formatCurrency(line.price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">R$ {formatCurrency(line.line_cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-right font-semibold text-slate-700">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                  R$ {formatCurrency(result.totais.custo_geral)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CalculosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("product");
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
  const [batchSelectedProducts, setBatchSelectedProducts] = useState<Record<string, Item | null>>({});
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const groupsQuery = useGrupos({ active_only: true, skip: 0, limit: 100 });
  const calcularProduto = useCalcularProduto();
  const calcularLote = useCalcularLote();
  const downloadExcel = useDownloadExcel();

  const productForm = useForm<ProductCalculationFormValues>({
    resolver: zodResolver(productCalculationSchema),
    defaultValues: {
      root_item_id: "",
      quantity: 1,
      reference_date: nowLocalDateTime(),
      material_group_id: "",
      requested_by: "",
      simulation_reference: "",
    },
  });

  const batchForm = useForm<BatchCalculationFormValues>({
    resolver: zodResolver(batchCalculationSchema),
    defaultValues: {
      itens: [{ produto_id: "", quantidade: 1 }],
      reference_date: nowLocalDateTime(),
      material_group_id: "",
      requested_by: "",
    },
  });

  const batchFields = useFieldArray({
    control: batchForm.control,
    name: "itens",
  });

  const watchedBatchItems = batchForm.watch("itens");
  const productCalculationPending = calcularProduto.isPending;
  const batchCalculationPending = calcularLote.isPending;

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleCalculateProduct = productForm.handleSubmit(async (values) => {
    const response = await calcularProduto.mutateAsync({
      root_item_id: values.root_item_id,
      quantity: values.quantity,
      reference_date: values.reference_date ? new Date(values.reference_date).toISOString() : undefined,
      material_group_id: values.material_group_id || undefined,
      requested_by: values.requested_by.trim(),
      simulation_reference: values.simulation_reference?.trim() || undefined,
    });

    setResult(response);
  });

  const handleCalculateBatch = batchForm.handleSubmit(async (values) => {
    const response = await calcularLote.mutateAsync({
      itens: values.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
      })),
      reference_date: values.reference_date ? new Date(values.reference_date).toISOString() : undefined,
      material_group_id: values.material_group_id || undefined,
      requested_by: values.requested_by.trim(),
    });

    setResult(response);
  });

  const handleDownload = () => {
    if (!result) {
      return;
    }
    void downloadExcel.mutateAsync(result.arquivo_excel);
  };

  const batchHasIncompleteRows = watchedBatchItems.some(
    (item) => !item.produto_id || !item.quantidade || Number(item.quantidade) <= 0,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Cálculo de Custos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Calcule o custo consolidado por produto ou por lote com base na BOM multinível e nos preços vigentes.
        </p>

        <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("product")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "product" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Por Produto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batch")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "batch" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Por Lote
          </button>
        </div>
      </div>

      {activeTab === "product" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleCalculateProduct} className="space-y-5">
            <div className={cn("space-y-5", productCalculationPending && "pointer-events-none opacity-70")}>
              <div className="grid gap-5 lg:grid-cols-[minmax(320px,1.2fr)_180px_220px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Produto</label>
                  <FinishedProductSelector
                    value={selectedProduct}
                    onSelect={(item) => {
                      setSelectedProduct(item);
                      productForm.setValue("root_item_id", item.id, { shouldValidate: true });
                    }}
                    placeholder="Buscar produto acabado"
                  />
                  {productForm.formState.errors.root_item_id ? (
                    <p className="text-sm text-red-600">{productForm.formState.errors.root_item_id.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-product-quantity" className="text-sm font-medium text-slate-700">
                    Quantidade
                  </label>
                  <input
                    id="calc-product-quantity"
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...productForm.register("quantity", { valueAsNumber: true })}
                  />
                  {productForm.formState.errors.quantity ? (
                    <p className="text-sm text-red-600">{productForm.formState.errors.quantity.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-product-reference-date" className="text-sm font-medium text-slate-700">
                    Data de referência
                  </label>
                  <input
                    id="calc-product-reference-date"
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...productForm.register("reference_date")}
                  />
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="calc-product-group" className="text-sm font-medium text-slate-700">
                    Filtro por grupo
                  </label>
                  <select
                    id="calc-product-group"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...productForm.register("material_group_id")}
                    value={productForm.watch("material_group_id") ?? ""}
                  >
                    <option value="">Todos os grupos</option>
                    {(groupsQuery.data?.items ?? []).map((group: MaterialGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-product-requested-by" className="text-sm font-medium text-slate-700">
                    Solicitante
                  </label>
                  <input
                    id="calc-product-requested-by"
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...productForm.register("requested_by")}
                  />
                  {productForm.formState.errors.requested_by ? (
                    <p className="text-sm text-red-600">{productForm.formState.errors.requested_by.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-product-simulation" className="text-sm font-medium text-slate-700">
                    Referência de simulação
                  </label>
                  <input
                    id="calc-product-simulation"
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...productForm.register("simulation_reference")}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={productCalculationPending || !productForm.watch("root_item_id") || Number(productForm.watch("quantity")) <= 0}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {productCalculationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Calcular
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleCalculateBatch} className="space-y-5">
            <div className={cn("space-y-5", batchCalculationPending && "pointer-events-none opacity-70")}>
              <div className="space-y-4">
                {batchFields.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[minmax(320px,1fr)_180px_auto]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Produto</label>
                      <FinishedProductSelector
                        value={batchSelectedProducts[field.id] ?? null}
                        onSelect={(item) => {
                          setBatchSelectedProducts((current) => ({ ...current, [field.id]: item }));
                          batchForm.setValue(`itens.${index}.produto_id`, item.id, { shouldValidate: true });
                        }}
                        placeholder="Buscar produto acabado"
                      />
                      {batchForm.formState.errors.itens?.[index]?.produto_id ? (
                        <p className="text-sm text-red-600">{batchForm.formState.errors.itens[index]?.produto_id?.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor={`batch-quantity-${field.id}`} className="text-sm font-medium text-slate-700">
                        Quantidade
                      </label>
                      <input
                        id={`batch-quantity-${field.id}`}
                        type="number"
                        min="0.000001"
                        step="0.000001"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        {...batchForm.register(`itens.${index}.quantidade`, { valueAsNumber: true })}
                      />
                      {batchForm.formState.errors.itens?.[index]?.quantidade ? (
                        <p className="text-sm text-red-600">{batchForm.formState.errors.itens[index]?.quantidade?.message}</p>
                      ) : null}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setBatchSelectedProducts((current) => {
                            const next = { ...current };
                            delete next[field.id];
                            return next;
                          });
                          batchFields.remove(index);
                        }}
                        disabled={batchFields.fields.length === 1}
                        className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => batchFields.append({ produto_id: "", quantidade: 1 })}
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar produto
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="calc-batch-reference-date" className="text-sm font-medium text-slate-700">
                    Data de referência
                  </label>
                  <input
                    id="calc-batch-reference-date"
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...batchForm.register("reference_date")}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-batch-group" className="text-sm font-medium text-slate-700">
                    Filtro por grupo
                  </label>
                  <select
                    id="calc-batch-group"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...batchForm.register("material_group_id")}
                    value={batchForm.watch("material_group_id") ?? ""}
                  >
                    <option value="">Todos os grupos</option>
                    {(groupsQuery.data?.items ?? []).map((group: MaterialGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="calc-batch-requested-by" className="text-sm font-medium text-slate-700">
                    Solicitante
                  </label>
                  <input
                    id="calc-batch-requested-by"
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...batchForm.register("requested_by")}
                  />
                  {batchForm.formState.errors.requested_by ? (
                    <p className="text-sm text-red-600">{batchForm.formState.errors.requested_by.message}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={batchCalculationPending || batchFields.fields.length === 0 || batchHasIncompleteRows}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {batchCalculationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Calcular Lote
              </button>
            </div>
          </form>
        </div>
      )}

      {result ? (
        <div ref={resultRef}>
          <ResultSection result={result} onDownload={handleDownload} isDownloading={downloadExcel.isPending} />
        </div>
      ) : null}
    </div>
  );
}
