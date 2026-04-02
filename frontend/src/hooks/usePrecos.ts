import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as precosApi from "@/api/precos";
import { extractErrorMessage } from "@/lib/utils";
import type { PaginationParams, PriceCreatePayload } from "@/types";

export function usePrecoHistory(item_id: string | null, params?: PaginationParams) {
  return useQuery({
    queryKey: ["precos", "history", item_id, params],
    queryFn: () => precosApi.getHistory(item_id as string, params),
    enabled: item_id !== null,
  });
}

export function usePrecoVigente(item_id: string | null, data_referencia?: string) {
  return useQuery({
    queryKey: ["precos", "current", item_id, data_referencia],
    queryFn: () => precosApi.getCurrent(item_id as string, data_referencia),
    enabled: item_id !== null,
  });
}

export function useSetPreco() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ item_id, data }: { item_id: string; data: PriceCreatePayload }) => precosApi.setCurrent(item_id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["precos"] });
      queryClient.invalidateQueries({ queryKey: ["precos", "history", variables.item_id] });
      queryClient.invalidateQueries({ queryKey: ["precos", "current", variables.item_id] });
      toast.success("Preço registrado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
