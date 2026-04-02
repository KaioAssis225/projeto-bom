import { client } from "@/api/client";
import type {
  Item,
  ItemCreatePayload,
  ItemListParams,
  ItemUpdatePayload,
  PaginatedResponse,
} from "@/types";

export async function list(params?: ItemListParams): Promise<PaginatedResponse<Item>> {
  const response = await client.get<PaginatedResponse<Item>>("/api/v1/itens", {
    params: {
      type: params?.type,
      group_id: params?.material_group_id,
      code: params?.code_contains,
      desc: params?.description_contains,
      active_only: params?.active_only ?? true,
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<Item> {
  const response = await client.get<Item>(`/api/v1/itens/${id}`);
  return response.data;
}

export async function create(data: ItemCreatePayload): Promise<Item> {
  const response = await client.post<Item>("/api/v1/itens", data);
  return response.data;
}

export async function update(id: string, data: Partial<ItemUpdatePayload>): Promise<Item> {
  const response = await client.put<Item>(`/api/v1/itens/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<Item> {
  const response = await client.patch<Item>(`/api/v1/itens/${id}/inativar`);
  return response.data;
}
