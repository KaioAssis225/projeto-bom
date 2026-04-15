import { client } from "@/api/client";
import type {
  PaginatedResponse,
  RawMaterial,
  RawMaterialCreatePayload,
  RawMaterialListParams,
  RawMaterialUpdatePayload,
} from "@/types";

export async function list(params?: RawMaterialListParams): Promise<PaginatedResponse<RawMaterial>> {
  const response = await client.get<PaginatedResponse<RawMaterial>>("/api/v1/materias-primas/", {
    params: {
      group_id: params?.group_id,
      code: params?.code,
      desc: params?.desc,
      active_only: params?.active_only ?? true,
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
    },
  });
  return response.data;
}

export async function getById(id: string): Promise<RawMaterial> {
  const response = await client.get<RawMaterial>(`/api/v1/materias-primas/${id}`);
  return response.data;
}

export async function create(data: RawMaterialCreatePayload): Promise<RawMaterial> {
  const response = await client.post<RawMaterial>("/api/v1/materias-primas/", data);
  return response.data;
}

export async function update(id: string, data: Partial<RawMaterialUpdatePayload>): Promise<RawMaterial> {
  const response = await client.put<RawMaterial>(`/api/v1/materias-primas/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<RawMaterial> {
  const response = await client.patch<RawMaterial>(`/api/v1/materias-primas/${id}/inativar`);
  return response.data;
}
