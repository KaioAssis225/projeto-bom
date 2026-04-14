import { client } from "@/api/client";
import type {
  PaginatedResponse,
  PaginationParams,
  UnitOfMeasure,
  UnitOfMeasureCreatePayload,
  UnitOfMeasureUpdatePayload,
} from "@/types";

export async function list(
  params?: PaginationParams & { active_only?: boolean },
): Promise<PaginatedResponse<UnitOfMeasure>> {
  const response = await client.get<PaginatedResponse<UnitOfMeasure>>("/api/v1/unidades/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
      active_only: params?.active_only ?? true,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<UnitOfMeasure> {
  const response = await client.get<UnitOfMeasure>(`/api/v1/unidades/${id}`);
  return response.data;
}

export async function create(data: UnitOfMeasureCreatePayload): Promise<UnitOfMeasure> {
  const response = await client.post<UnitOfMeasure>("/api/v1/unidades/", data);
  return response.data;
}

export async function update(id: string, data: Partial<UnitOfMeasureUpdatePayload>): Promise<UnitOfMeasure> {
  const response = await client.put<UnitOfMeasure>(`/api/v1/unidades/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<UnitOfMeasure> {
  const response = await client.patch<UnitOfMeasure>(`/api/v1/unidades/${id}/inativar`);
  return response.data;
}
