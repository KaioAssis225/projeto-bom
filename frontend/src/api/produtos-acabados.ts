import { client } from "@/api/client";
import type {
  FinishedProduct,
  FinishedProductCreatePayload,
  FinishedProductListParams,
  FinishedProductUpdatePayload,
  PaginatedResponse,
} from "@/types";

export async function list(params?: FinishedProductListParams): Promise<PaginatedResponse<FinishedProduct>> {
  const response = await client.get<PaginatedResponse<FinishedProduct>>("/api/v1/produtos-acabados/", {
    params: {
      code: params?.code,
      desc: params?.desc,
      active_only: params?.active_only ?? true,
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
    },
  });
  return response.data;
}

export async function getById(id: string): Promise<FinishedProduct> {
  const response = await client.get<FinishedProduct>(`/api/v1/produtos-acabados/${id}`);
  return response.data;
}

export async function create(data: FinishedProductCreatePayload): Promise<FinishedProduct> {
  const response = await client.post<FinishedProduct>("/api/v1/produtos-acabados/", data);
  return response.data;
}

export async function update(id: string, data: Partial<FinishedProductUpdatePayload>): Promise<FinishedProduct> {
  const response = await client.put<FinishedProduct>(`/api/v1/produtos-acabados/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<FinishedProduct> {
  const response = await client.patch<FinishedProduct>(`/api/v1/produtos-acabados/${id}/inativar`);
  return response.data;
}
