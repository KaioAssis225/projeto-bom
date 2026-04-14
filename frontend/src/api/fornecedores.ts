import { client } from "@/api/client";
import type {
  PaginatedResponse,
  PaginationParams,
  Supplier,
  SupplierCreatePayload,
  SupplierUpdatePayload,
} from "@/types";

export async function list(
  params?: PaginationParams & { active_only?: boolean },
): Promise<PaginatedResponse<Supplier>> {
  const response = await client.get<PaginatedResponse<Supplier>>("/api/v1/fornecedores/", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 100,
      active_only: params?.active_only ?? true,
    },
  });

  return response.data;
}

export async function getById(id: string): Promise<Supplier> {
  const response = await client.get<Supplier>(`/api/v1/fornecedores/${id}`);
  return response.data;
}

export async function create(data: SupplierCreatePayload): Promise<Supplier> {
  const response = await client.post<Supplier>("/api/v1/fornecedores/", data);
  return response.data;
}

export async function update(id: string, data: Partial<SupplierUpdatePayload>): Promise<Supplier> {
  const response = await client.put<Supplier>(`/api/v1/fornecedores/${id}`, data);
  return response.data;
}

export async function deactivate(id: string): Promise<Supplier> {
  const response = await client.patch<Supplier>(`/api/v1/fornecedores/${id}/inativar`);
  return response.data;
}
