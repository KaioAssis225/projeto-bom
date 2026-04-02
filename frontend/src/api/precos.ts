import { client } from "@/api/client";
import type {
  CurrentPrice,
  PaginatedResponse,
  PaginationParams,
  PriceCreatePayload,
  PriceHistory,
} from "@/types";

export async function setCurrent(item_id: string, data: PriceCreatePayload): Promise<PriceHistory> {
  const response = await client.post<PriceHistory>(`/api/v1/precos/${item_id}`, data);
  return response.data;
}

export async function getHistory(
  item_id: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<PriceHistory>> {
  const response = await client.get<PaginatedResponse<PriceHistory>>(
    `/api/v1/precos/${item_id}/historico`,
    {
      params: {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 50,
      },
    },
  );

  return response.data;
}

export async function getCurrent(item_id: string, data_referencia?: string): Promise<CurrentPrice> {
  const response = await client.get<CurrentPrice>(`/api/v1/precos/${item_id}/vigente`, {
    params: {
      data: data_referencia,
    },
  });

  return response.data;
}
