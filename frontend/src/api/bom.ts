import { client } from "@/api/client";
import type {
  BomHeader,
  BomHeaderPayload,
  BomItemPayload,
  BomItemUpdatePayload,
  BomTree,
  CycleValidationPayload,
  CycleValidationResponse,
} from "@/types";

export async function getTree(item_pai_id: string): Promise<BomTree> {
  const response = await client.get<BomTree>(`/api/v1/bom/${item_pai_id}`);
  return response.data;
}

export async function createHeader(data: BomHeaderPayload): Promise<BomHeader> {
  const response = await client.post<BomHeader>("/api/v1/bom/", data);
  return response.data;
}

export async function addChild(bom_id: string, data: BomItemPayload): Promise<BomTree> {
  const response = await client.post<BomTree>(`/api/v1/bom/${bom_id}/itens`, data);
  return response.data;
}

export async function updateItem(
  bom_item_id: string,
  data: Partial<BomItemUpdatePayload>,
): Promise<BomTree> {
  const response = await client.put<BomTree>(`/api/v1/bom/itens/${bom_item_id}`, data);
  return response.data;
}

export async function deleteItem(bom_item_id: string): Promise<void> {
  await client.delete(`/api/v1/bom/itens/${bom_item_id}`);
}

export async function validateCycle(data: CycleValidationPayload): Promise<CycleValidationResponse> {
  const response = await client.post<CycleValidationResponse>("/api/v1/bom/validar-ciclo", data);
  return response.data;
}
