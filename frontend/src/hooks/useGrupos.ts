import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as gruposApi from "@/api/grupos";
import { extractErrorMessage } from "@/lib/utils";
import type { MaterialGroupCreatePayload, MaterialGroupUpdatePayload, PaginationParams } from "@/types";

export function useGrupos(filters?: PaginationParams & { active_only?: boolean }) {
  return useQuery({
    queryKey: ["grupos", filters],
    queryFn: () => gruposApi.list(filters),
  });
}

export function useGrupo(id: string | null) {
  return useQuery({
    queryKey: ["grupos", "detail", id],
    queryFn: () => gruposApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateGrupo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MaterialGroupCreatePayload) => gruposApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos"] });
      toast.success("Grupo criado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateGrupo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaterialGroupUpdatePayload> }) =>
      gruposApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["grupos"] });
      queryClient.invalidateQueries({ queryKey: ["grupos", "detail", variables.id] });
      toast.success("Grupo atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateGrupo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gruposApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["grupos"] });
      queryClient.invalidateQueries({ queryKey: ["grupos", "detail", id] });
      toast.success("Grupo inativado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
