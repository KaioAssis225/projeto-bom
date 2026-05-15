import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as estoqueApi from "@/api/estoque-aluminio";
import { extractErrorMessage } from "@/lib/utils";
import type { EstoqueEntradaPayload, EstoqueMinimoPayload, EstoqueSaidaPayload } from "@/types";

export function useEstoqueAluminio() {
  return useQuery({
    queryKey: ["estoque-aluminio"],
    queryFn: () => estoqueApi.listEstoque(0, 200),
  });
}

export function useEstoqueHistorico(itemId: string, skip: number, limit: number) {
  return useQuery({
    queryKey: ["estoque-aluminio", "historico", itemId, skip, limit],
    queryFn: () => estoqueApi.getHistorico(itemId, skip, limit),
    enabled: !!itemId,
  });
}

export function useAddEntrada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueEntradaPayload }) =>
      estoqueApi.addEntrada(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Entrada registrada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useAddSaida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueSaidaPayload }) =>
      estoqueApi.addSaida(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Saída registrada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useSetEstoqueMinimo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueMinimoPayload }) =>
      estoqueApi.setEstoqueMinimo(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Estoque mínimo atualizado");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
