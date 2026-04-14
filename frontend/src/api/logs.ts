import { client } from "@/api/client";
import type { ExecutionLog, LogListParams, PaginatedResponse } from "@/types";

export async function list(params?: LogListParams): Promise<PaginatedResponse<ExecutionLog>> {
  const response = await client.get<PaginatedResponse<ExecutionLog>>("/api/v1/logs/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
      status: params?.status,
      item_id: params?.item_id,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<ExecutionLog> {
  const response = await client.get<ExecutionLog>(`/api/v1/logs/${id}`);
  return response.data;
}
