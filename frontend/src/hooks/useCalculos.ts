import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import * as calculosApi from "@/api/calculos";
import { extractErrorMessage } from "@/lib/utils";
import type { CalculationBatchPayload, CalculationProductPayload } from "@/types";

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
