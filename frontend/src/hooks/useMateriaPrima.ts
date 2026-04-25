import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as materiasApi from "@/api/materias-primas";
import { extractErrorMessage } from "@/lib/utils";
import type { ImportResult, RawMaterialCreatePayload, RawMaterialListParams, RawMaterialUpdatePayload } from "@/types";

export function useMateriaPrima(filters?: RawMaterialListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["materias-primas", filters],
    queryFn: () => materiasApi.list(filters),
    enabled: options?.enabled ?? true,
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

export function useImportMateriasPrimasCsv() {
  const queryClient = useQueryClient();

  return useMutation<ImportResult, unknown, File>({
    mutationFn: (file: File) => materiasApi.importCsv(file),
    onSuccess: (result) => {
      if (result.imported > 0 && result.errors.length === 0) {
        queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
        queryClient.invalidateQueries({ queryKey: ["itens"] });
        toast.success(`${result.imported} matéria(s)-prima(s) importada(s)`);
      }
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
