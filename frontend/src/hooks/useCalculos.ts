import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import * as calculosApi from "@/api/calculos";
import { extractErrorMessage } from "@/lib/utils";
import type { BomCostAnalysis, CalculationBatchPayload, CalculationProductPayload } from "@/types";

export function useCalcularProduto() {
  return useMutation({
    mutationFn: (data: CalculationProductPayload) => calculosApi.calcularProduto(data),
    onSuccess: () => {
      toast.success("Cálculo realizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useCalcularLote() {
  return useMutation({
    mutationFn: (data: CalculationBatchPayload) => calculosApi.calcularLote(data),
    onSuccess: () => {
      toast.success("Cálculo em lote realizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDownloadExcel() {
  return useMutation({
    mutationFn: (filename: string) => calculosApi.downloadExcel(filename),
    onSuccess: () => {
      toast.success("Download iniciado");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useCustoBomAnalise(paId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["calculos", "custo-bom-analise", paId],
    queryFn: () => calculosApi.getCustoBomAnalise(paId as string),
    enabled: enabled && paId !== null,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });
}
