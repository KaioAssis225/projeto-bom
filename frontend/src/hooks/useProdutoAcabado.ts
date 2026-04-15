import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as produtosApi from "@/api/produtos-acabados";
import { extractErrorMessage } from "@/lib/utils";
import type { FinishedProductCreatePayload, FinishedProductListParams, FinishedProductUpdatePayload } from "@/types";

export function useProdutoAcabado(filters?: FinishedProductListParams) {
  return useQuery({
    queryKey: ["produtos-acabados", filters],
    queryFn: () => produtosApi.list(filters),
  });
}

export function useProdutoAcabadoById(id: string | null) {
  return useQuery({
    queryKey: ["produtos-acabados", "detail", id],
    queryFn: () => produtosApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateProdutoAcabado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FinishedProductCreatePayload) => produtosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos-acabados"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      toast.success("Produto acabado criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateProdutoAcabado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinishedProductUpdatePayload> }) =>
      produtosApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["produtos-acabados"] });
      queryClient.invalidateQueries({ queryKey: ["produtos-acabados", "detail", variables.id] });
      toast.success("Produto acabado atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateProdutoAcabado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => produtosApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["produtos-acabados"] });
      queryClient.invalidateQueries({ queryKey: ["produtos-acabados", "detail", id] });
      toast.success("Produto acabado inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
