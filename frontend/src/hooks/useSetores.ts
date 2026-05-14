import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as setoresApi from "@/api/setores";
import { extractErrorMessage } from "@/lib/utils";
import type { PaginationParams, SetorCreatePayload, SetorUpdatePayload } from "@/types";

export function useSetores(filters?: PaginationParams & { active_only?: boolean }) {
  return useQuery({
    queryKey: ["setores", filters],
    queryFn: () => setoresApi.list(filters),
  });
}

export function useSetor(id: string | null) {
  return useQuery({
    queryKey: ["setores", "detail", id],
    queryFn: () => setoresApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateSetor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetorCreatePayload) => setoresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      toast.success("Setor criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateSetor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SetorUpdatePayload> }) =>
      setoresApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      queryClient.invalidateQueries({ queryKey: ["setores", "detail", variables.id] });
      toast.success("Setor atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeleteSetor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => setoresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      toast.success("Setor excluído com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateSetor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => setoresApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["setores"] });
      queryClient.invalidateQueries({ queryKey: ["setores", "detail", id] });
      toast.success("Setor inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
