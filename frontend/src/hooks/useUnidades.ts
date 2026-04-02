import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as unidadesApi from "@/api/unidades";
import { extractErrorMessage } from "@/lib/utils";
import type { PaginationParams, UnitOfMeasureCreatePayload, UnitOfMeasureUpdatePayload } from "@/types";

export function useUnidades(filters?: PaginationParams & { active_only?: boolean }) {
  return useQuery({
    queryKey: ["unidades", filters],
    queryFn: () => unidadesApi.list(filters),
  });
}

export function useUnidade(id: string | null) {
  return useQuery({
    queryKey: ["unidades", "detail", id],
    queryFn: () => unidadesApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateUnidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UnitOfMeasureCreatePayload) => unidadesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Unidade criada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateUnidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UnitOfMeasureUpdatePayload> }) =>
      unidadesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      queryClient.invalidateQueries({ queryKey: ["unidades", "detail", variables.id] });
      toast.success("Unidade atualizada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateUnidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unidadesApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      queryClient.invalidateQueries({ queryKey: ["unidades", "detail", id] });
      toast.success("Ação concluída");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
