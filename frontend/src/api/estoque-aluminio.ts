import { client } from "@/api/client";
import type {
  EstoqueEntradaPayload,
  EstoqueItem,
  EstoqueMinimoPayload,
  EstoqueMovimento,
  EstoqueMovimentoRecente,
  EstoqueSaidaPayload,
  PaginatedResponse,
} from "@/types";

export async function listEstoque(groupId: string, skip = 0, limit = 200): Promise<PaginatedResponse<EstoqueItem>> {
  const response = await client.get<PaginatedResponse<EstoqueItem>>("/api/v1/estoque-aluminio/", {
    params: { group_id: groupId, skip, limit },
  });
  return response.data;
}

export async function addEntrada(groupId: string, itemId: string, payload: EstoqueEntradaPayload): Promise<EstoqueMovimento> {
  const response = await client.post<EstoqueMovimento>(
    `/api/v1/estoque-aluminio/${itemId}/entrada`,
    payload,
    { params: { group_id: groupId } },
  );
  return response.data;
}

export async function addSaida(groupId: string, itemId: string, payload: EstoqueSaidaPayload): Promise<EstoqueMovimento> {
  const response = await client.post<EstoqueMovimento>(
    `/api/v1/estoque-aluminio/${itemId}/saida`,
    payload,
    { params: { group_id: groupId } },
  );
  return response.data;
}

export async function getHistorico(
  groupId: string,
  itemId: string,
  skip = 0,
  limit = 10,
): Promise<PaginatedResponse<EstoqueMovimento>> {
  const response = await client.get<PaginatedResponse<EstoqueMovimento>>(
    `/api/v1/estoque-aluminio/${itemId}/historico`,
    { params: { group_id: groupId, skip, limit } },
  );
  return response.data;
}

export async function getUltimosMovimentos(groupId: string, limit = 10): Promise<EstoqueMovimentoRecente[]> {
  const response = await client.get<EstoqueMovimentoRecente[]>(
    "/api/v1/estoque-aluminio/ultimos-movimentos",
    { params: { group_id: groupId, limit } },
  );
  return response.data;
}

export async function setEstoqueMinimo(
  groupId: string,
  itemId: string,
  payload: EstoqueMinimoPayload,
): Promise<EstoqueItem> {
  const response = await client.patch<EstoqueItem>(
    `/api/v1/estoque-aluminio/${itemId}/estoque-minimo`,
    payload,
    { params: { group_id: groupId } },
  );
  return response.data;
}
