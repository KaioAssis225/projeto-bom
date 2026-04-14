import { client } from "@/api/client";
import type {
  MaterialGroup,
  MaterialGroupCreatePayload,
  MaterialGroupUpdatePayload,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export async function list(
  params?: PaginationParams & { active_only?: boolean },
): Promise<PaginatedResponse<MaterialGroup>> {
  const response = await client.get<PaginatedResponse<MaterialGroup>>("/api/v1/grupos/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
      active_only: params?.active_only ?? true,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<MaterialGroup> {
  const response = await client.get<MaterialGroup>(`/api/v1/grupos/${id}`);
  return response.data;
}

export async function create(data: MaterialGroupCreatePayload): Promise<MaterialGroup> {
  const response = await client.post<MaterialGroup>("/api/v1/grupos/", data);
  return response.data;
}

export async function update(id: string, data: Partial<MaterialGroupUpdatePayload>): Promise<MaterialGroup> {
  const response = await client.put<MaterialGroup>(`/api/v1/grupos/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<MaterialGroup> {
  const response = await client.patch<MaterialGroup>(`/api/v1/grupos/${id}/inativar`);
  return response.data;
}
