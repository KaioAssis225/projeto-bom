import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as estoqueApi from "@/api/estoque-aluminio";
import { extractErrorMessage } from "@/lib/utils";
import type { EstoqueEntradaPayload, EstoqueMinimoPayload, EstoqueSaidaPayload, PercentualAlertaPayload } from "@/types";

export function useEstoqueAluminio(groupId: string | null) {
  return useQuery({
    queryKey: ["estoque-aluminio", groupId],
    queryFn: () => estoqueApi.listEstoque(groupId!, 0, 200),
    enabled: !!groupId,
  });
}

export function useUltimosMovimentos(groupId: string | null, limit = 10) {
  return useQuery({
    queryKey: ["estoque-aluminio", "ultimos-movimentos", groupId, limit],
    queryFn: () => estoqueApi.getUltimosMovimentos(groupId!, limit),
    enabled: !!groupId,
    refetchInterval: 30_000,
  });
}

export function useEstoqueHistorico(groupId: string | null, itemId: string, skip: number, limit: number) {
  return useQuery({
    queryKey: ["estoque-aluminio", "historico", groupId, itemId, skip, limit],
    queryFn: () => estoqueApi.getHistorico(groupId!, itemId, skip, limit),
    enabled: !!groupId && !!itemId,
  });
}

export function useAddEntrada(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueEntradaPayload }) =>
      estoqueApi.addEntrada(groupId!, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Entrada registrada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useAddSaida(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueSaidaPayload }) =>
      estoqueApi.addSaida(groupId!, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Saída registrada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useSetEstoqueMinimo(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: EstoqueMinimoPayload }) =>
      estoqueApi.setEstoqueMinimo(groupId!, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Estoque mínimo atualizado");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useSetPercentualAlerta(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: PercentualAlertaPayload }) =>
      estoqueApi.setPercentualAlerta(groupId!, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-aluminio"] });
      toast.success("Percentual de alerta atualizado");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
