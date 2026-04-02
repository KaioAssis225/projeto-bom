import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as bomApi from "@/api/bom";
import { extractErrorMessage } from "@/lib/utils";
import type {
  BomHeaderPayload,
  BomItemPayload,
  BomItemUpdatePayload,
  CycleValidationPayload,
} from "@/types";

export function useBomTree(item_pai_id: string | null) {
  return useQuery({
    queryKey: ["bom", "tree", item_pai_id],
    queryFn: () => bomApi.getTree(item_pai_id as string),
    enabled: item_pai_id !== null,
  });
}

export function useCreateBomHeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BomHeaderPayload) => bomApi.createHeader(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      queryClient.invalidateQueries({ queryKey: ["bom", "tree", variables.parent_item_id] });
      toast.success("BOM criada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useAddBomChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bom_id, data }: { bom_id: string; data: BomItemPayload }) => bomApi.addChild(bom_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      toast.success("Filho adicionado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateBomItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bom_item_id, data }: { bom_item_id: string; data: Partial<BomItemUpdatePayload> }) =>
      bomApi.updateItem(bom_item_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      toast.success("Item da BOM atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeleteBomItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bom_item_id: string) => bomApi.deleteItem(bom_item_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      toast.success("Item removido com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useValidateBomCycle() {
  return useMutation({
    mutationFn: (data: CycleValidationPayload) => bomApi.validateCycle(data),
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
