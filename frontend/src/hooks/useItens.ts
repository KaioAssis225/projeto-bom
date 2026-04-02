import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as itensApi from "@/api/itens";
import { extractErrorMessage } from "@/lib/utils";
import type { ItemCreatePayload, ItemListParams, ItemUpdatePayload } from "@/types";

export function useItens(filters?: ItemListParams) {
  return useQuery({
    queryKey: ["itens", filters],
    queryFn: () => itensApi.list(filters),
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: ["itens", "detail", id],
    queryFn: () => itensApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ItemCreatePayload) => itensApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      toast.success("Item criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ItemUpdatePayload> }) => itensApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      queryClient.invalidateQueries({ queryKey: ["itens", "detail", variables.id] });
      toast.success("Item atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itensApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      queryClient.invalidateQueries({ queryKey: ["itens", "detail", id] });
      toast.success("Item inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
