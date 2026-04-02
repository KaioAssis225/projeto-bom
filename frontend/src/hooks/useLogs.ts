import { useQuery } from "@tanstack/react-query";

import * as logsApi from "@/api/logs";
import type { LogListParams } from "@/types";

export function useLogs(filters?: LogListParams) {
  return useQuery({
    queryKey: ["logs", filters],
    queryFn: () => logsApi.list(filters),
  });
}

export function useLog(id: string | null) {
  return useQuery({
    queryKey: ["logs", "detail", id],
    queryFn: () => logsApi.getById(id as string),
    enabled: id !== null,
  });
}
