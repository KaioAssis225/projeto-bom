import { client } from "@/api/client";
import type {
  BomCostPreview,
  CalculationBatchPayload,
  CalculationProductPayload,
  CalculationResponse,
} from "@/types";

export async function getCustoBom(item_id: string): Promise<BomCostPreview> {
  const response = await client.get<BomCostPreview>(`/api/v1/calculos/${item_id}/custo-bom`);
  return response.data;
}

export async function calcularProduto(data: CalculationProductPayload): Promise<CalculationResponse> {
  const response = await client.post<CalculationResponse>("/api/v1/calculos/produto", data);
  return response.data;
}

export async function calcularLote(data: CalculationBatchPayload): Promise<CalculationResponse> {
  const response = await client.post<CalculationResponse>("/api/v1/calculos/lote", data);
  return response.data;
}

export async function downloadExcel(filename: string): Promise<void> {
  const safeFilename = filename.split("/").pop() ?? filename;
  const response = await client.get<Blob>(`/api/v1/calculos/download/${safeFilename}`, {
    responseType: "blob",
  });

  const blobUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}
