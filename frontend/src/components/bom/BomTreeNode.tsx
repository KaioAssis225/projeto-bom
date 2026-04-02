import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Box, Layers, Loader2, Package, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAddBomChild, useDeleteBomItem, useUpdateBomItem } from "@/hooks/useBom";
import { useItens } from "@/hooks/useItens";
import { cn, formatDecimal, itemTypeBadgeColor, itemTypeLabel } from "@/lib/utils";
import type { BomTreeNode as BomTreeNodeType } from "@/types";

const addChildSchema = z.object({
  child_item_id: z.string().uuid("Selecione um item filho"),
  quantity: z.number().min(0.000001, "Informe uma quantidade maior que zero"),
  scrap_percent: z.number().min(0, "Minimo 0").max(99.9999, "Maximo 99.9999"),
  line_number: z.number().int("Informe um numero inteiro").min(1, "Minimo 1"),
});

const editBomItemSchema = z.object({
  quantity: z.number().min(0.000001, "Informe uma quantidade maior que zero"),
  scrap_percent: z.number().min(0, "Minimo 0").max(99.9999, "Maximo 99.9999"),
});

type AddChildFormValues = z.infer<typeof addChildSchema>;
type EditBomItemFormValues = z.infer<typeof editBomItemSchema>;

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function itemTypeIcon(type: string) {
  switch (type) {
    case "RAW_MATERIAL":
      return Package;
    case "FINISHED_PRODUCT":
      return Box;
    case "SEMI_FINISHED":
      return Layers;
    case "PACKAGING":
      return Archive;
    case "SERVICE":
      return Wrench;
    default:
      return Box;
  }
}

function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BomChildModal({
  open,
  bomId,
  parentItemId,
  parentLabel,
  onClose,
  onRefresh,
}: {
  open: boolean;
  bomId: string;
  parentItemId: string;
  parentLabel: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const addBomChild = useAddBomChild();

  const childItemsQuery = useItens({
    description_contains: debouncedSearch || undefined,
    active_only: true,
    skip: 0,
    limit: 20,
  });

  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      child_item_id: "",
      quantity: 1,
      scrap_percent: 0,
      line_number: 10,
    },
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedChildId(null);
      form.reset({
        child_item_id: "",
        quantity: 1,
        scrap_percent: 0,
        line_number: 10,
      });
    }
  }, [form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await addBomChild.mutateAsync({
      bom_id: bomId,
      data: {
        parent_item_id: parentItemId,
        child_item_id: values.child_item_id,
        quantity: values.quantity,
        scrap_percent: values.scrap_percent,
        line_number: values.line_number,
      },
    });

    onClose();
    onRefresh();
  });

  return (
    <ModalShell
      open={open}
      title="Adicionar Filho"
      description={`Selecione um item filho para ${parentLabel}.`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <label htmlFor="bom-child-search" className="text-sm font-medium text-slate-700">
            Buscar item filho
          </label>
          <input
            id="bom-child-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descrição"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200">
            {childItemsQuery.isLoading ? (
              <div className="flex items-center justify-center px-4 py-8 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando itens...
              </div>
            ) : childItemsQuery.data?.items?.length ? (
              childItemsQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(item.id);
                    form.setValue("child_item_id", item.id, { shouldValidate: true });
                  }}
                  className={cn(
                    "flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left last:border-b-0",
                    selectedChildId === item.id ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50",
                  )}
                >
                  <span className="text-sm font-medium text-slate-900">{item.code}</span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhum item encontrado</div>
            )}
          </div>
          {form.formState.errors.child_item_id ? (
            <p className="text-sm text-red-600">{form.formState.errors.child_item_id.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="bom-child-quantity" className="text-sm font-medium text-slate-700">
              Quantidade
            </label>
            <input
              id="bom-child-quantity"
              type="number"
              step="0.000001"
              min="0.000001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity ? (
              <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="bom-child-scrap" className="text-sm font-medium text-slate-700">
              Scrap %
            </label>
            <input
              id="bom-child-scrap"
              type="number"
              step="0.0001"
              min="0"
              max="99.9999"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("scrap_percent", { valueAsNumber: true })}
            />
            {form.formState.errors.scrap_percent ? (
              <p className="text-sm text-red-600">{form.formState.errors.scrap_percent.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="bom-child-line" className="text-sm font-medium text-slate-700">
              Linha
            </label>
            <input
              id="bom-child-line"
              type="number"
              min="1"
              step="1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("line_number", { valueAsNumber: true })}
            />
            {form.formState.errors.line_number ? (
              <p className="text-sm text-red-600">{form.formState.errors.line_number.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={addBomChild.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={addBomChild.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addBomChild.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditBomItemModal({
  open,
  node,
  onClose,
  onRefresh,
}: {
  open: boolean;
  node: BomTreeNodeType;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const updateBomItem = useUpdateBomItem();

  const form = useForm<EditBomItemFormValues>({
    resolver: zodResolver(editBomItemSchema),
    defaultValues: {
      quantity: node.quantity ?? 1,
      scrap_percent: node.scrap_percent ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        quantity: node.quantity ?? 1,
        scrap_percent: node.scrap_percent ?? 0,
      });
    }
  }, [form, node, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!node.bom_item_id) {
      return;
    }

    await updateBomItem.mutateAsync({
      bom_item_id: node.bom_item_id,
      data: {
        quantity: values.quantity,
        scrap_percent: values.scrap_percent,
      },
    });

    onClose();
    onRefresh();
  });

  return (
    <ModalShell
      open={open}
      title="Editar Item da BOM"
      description={`Atualize quantidade e scrap de ${node.code}.`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="bom-edit-quantity" className="text-sm font-medium text-slate-700">
              Quantidade
            </label>
            <input
              id="bom-edit-quantity"
              type="number"
              step="0.000001"
              min="0.000001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity ? (
              <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="bom-edit-scrap" className="text-sm font-medium text-slate-700">
              Scrap %
            </label>
            <input
              id="bom-edit-scrap"
              type="number"
              step="0.0001"
              min="0"
              max="99.9999"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...form.register("scrap_percent", { valueAsNumber: true })}
            />
            {form.formState.errors.scrap_percent ? (
              <p className="text-sm text-red-600">{form.formState.errors.scrap_percent.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={updateBomItem.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateBomItem.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateBomItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function BomTreeNode({
  node,
  depth,
  bomId,
  onRefresh,
}: {
  node: BomTreeNodeType;
  depth: number;
  bomId: string;
  onRefresh: () => void;
}) {
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteBomItem = useDeleteBomItem();

  const NodeIcon = itemTypeIcon(node.type);
  const isMutating = deleteBomItem.isPending;

  const handleDelete = async () => {
    if (!node.bom_item_id) {
      return;
    }

    if (!window.confirm(`Deseja remover ${node.code} da BOM?`)) {
      return;
    }

    await deleteBomItem.mutateAsync(node.bom_item_id);
    onRefresh();
  };

  return (
    <div className="space-y-3" style={{ marginLeft: `${depth * 24}px` }}>
      <div className="border-l border-dashed border-slate-300 pl-4">
        <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", isMutating && "opacity-70")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <NodeIcon className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-900">{node.code}</span>
                <span className="text-slate-400">—</span>
                <span className="truncate text-slate-600">{node.description}</span>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    itemTypeBadgeColor(node.type),
                  )}
                >
                  {itemTypeLabel(node.type)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Qtd: {formatDecimal(node.quantity ?? 0, 2)}</span>
                <span>Scrap: {formatDecimal(node.scrap_percent ?? 0, 2)}%</span>
                <span>Loss: {formatDecimal(node.loss_factor ?? 0, 6)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remover
              </button>
              <button
                type="button"
                onClick={() => setAddChildOpen(true)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Filho
              </button>
            </div>
          </div>
        </div>
      </div>

      {node.children.map((child) => (
        <BomTreeNode key={`${child.bom_item_id ?? child.item_id}-${child.path}`} node={child} depth={depth + 1} bomId={bomId} onRefresh={onRefresh} />
      ))}

      <BomChildModal
        open={addChildOpen}
        bomId={bomId}
        parentItemId={node.item_id ?? ""}
        parentLabel={`${node.code} — ${node.description}`}
        onClose={() => setAddChildOpen(false)}
        onRefresh={onRefresh}
      />

      <EditBomItemModal open={editOpen} node={node} onClose={() => setEditOpen(false)} onRefresh={onRefresh} />
    </div>
  );
}
