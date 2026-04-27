import { client } from "@/api/client";
import type {
  BomCostImpact,
  FinishedProduct,
  FinishedProductCreatePayload,
  FinishedProductListParams,
  FinishedProductUpdatePayload,
  ImportResult,
  PaginatedResponse,
} from "@/types";

export const TEMPLATE_CSV_URL = "/api/v1/produtos-acabados/template-csv";
export const TEMPLATE_XLSX_URL = "/api/v1/produtos-acabados/template-xlsx";

export async function list(params?: FinishedProductListParams): Promise<PaginatedResponse<FinishedProduct>> {
  const response = await client.get<PaginatedResponse<FinishedProduct>>("/api/v1/produtos-acabados/", {
    params: {
      code: params?.code,
      desc: params?.desc,
      active_only: params?.active_only ?? true,
      without_bom: params?.without_bom,
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

export async function listVariacoesCusto(
  id: string,
  params?: { skip?: number; limit?: number },
): Promise<PaginatedResponse<BomCostImpact>> {
  const response = await client.get<PaginatedResponse<BomCostImpact>>(
    `/api/v1/produtos-acabados/${id}/variacoes-custo`,
    { params: { skip: params?.skip ?? 0, limit: params?.limit ?? 50 } },
  );
  return response.data;
}

export async function importCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post<ImportResult>(
    "/api/v1/produtos-acabados/import-csv",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}
