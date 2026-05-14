import { client } from "@/api/client";
import type {
  PaginatedResponse,
  PaginationParams,
  Setor,
  SetorCreatePayload,
  SetorUpdatePayload,
} from "@/types";

export async function list(
  params?: PaginationParams & { active_only?: boolean },
): Promise<PaginatedResponse<Setor>> {
  const response = await client.get<PaginatedResponse<Setor>>("/api/v1/setores/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
      active_only: params?.active_only ?? true,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<Setor> {
  const response = await client.get<Setor>(`/api/v1/setores/${id}`);
  return response.data;
}

export async function create(data: SetorCreatePayload): Promise<Setor> {
  const response = await client.post<Setor>("/api/v1/setores/", data);
  return response.data;
}

export async function update(id: string, data: Partial<SetorUpdatePayload>): Promise<Setor> {
  const response = await client.put<Setor>(`/api/v1/setores/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<Setor> {
  const response = await client.patch<Setor>(`/api/v1/setores/${id}/inativar`);
  return response.data;
}

export async function remove(id: string): Promise<void> {
  await client.delete(`/api/v1/setores/${id}`);
}
