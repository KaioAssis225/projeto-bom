import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as materiasApi from "@/api/materias-primas";
import { extractErrorMessage } from "@/lib/utils";
import type { RawMaterialCreatePayload, RawMaterialListParams, RawMaterialUpdatePayload } from "@/types";

export function useMateriaPrima(filters?: RawMaterialListParams) {
  return useQuery({
    queryKey: ["materias-primas", filters],
    queryFn: () => materiasApi.list(filters),
  });
}

export function useMateriaPrimaById(id: string | null) {
  return useQuery({
    queryKey: ["materias-primas", "detail", id],
    queryFn: () => materiasApi.getById(id as string),
    enabled: id !== null,
  });
}

export function useCreateMateriaPrima() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RawMaterialCreatePayload) => materiasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      toast.success("Matéria-prima criada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateMateriaPrima() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RawMaterialUpdatePayload> }) =>
      materiasApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      queryClient.invalidateQueries({ queryKey: ["materias-primas", "detail", variables.id] });
      toast.success("Matéria-prima atualizada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeactivateMateriaPrima() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => materiasApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      queryClient.invalidateQueries({ queryKey: ["materias-primas", "detail", id] });
      toast.success("Matéria-prima inativada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
