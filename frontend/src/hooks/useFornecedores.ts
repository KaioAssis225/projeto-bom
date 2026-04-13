import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as fornecedoresApi from "@/api/fornecedores";
import { extractErrorMessage } from "@/lib/utils";
import type { PaginationParams, SupplierCreatePayload, SupplierUpdatePayload } from "@/types";

export function useFornecedores(filters?: PaginationParams & { active_only?: boolean }) {
  return useQuery({
    queryKey: ["fornecedores", filters],
    queryFn: () => fornecedoresApi.list(filters),
  });
}

export function useFornecedor(id: string | null) {
  return useQuery({
    queryKey: ["fornecedores", "detail", id],
    queryFn: () => fornecedoresApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplierCreatePayload) => fornecedoresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplierUpdatePayload> }) =>
      fornecedoresApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores", "detail", variables.id] });
      toast.success("Fornecedor atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fornecedoresApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores", "detail", id] });
      toast.success("Fornecedor inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
