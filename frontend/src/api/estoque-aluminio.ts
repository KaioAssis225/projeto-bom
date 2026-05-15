import { client } from "@/api/client";
import type {
  EstoqueEntradaPayload,
  EstoqueItem,
  EstoqueMinimoPayload,
  EstoqueMovimento,
  EstoqueSaidaPayload,
  PaginatedResponse,
} from "@/types";

export async function listEstoque(skip = 0, limit = 200): Promise<PaginatedResponse<EstoqueItem>> {
  const response = await client.get<PaginatedResponse<EstoqueItem>>("/api/v1/estoque-aluminio/", {
    params: { skip, limit },
  });
  return response.data;
}

export async function addEntrada(itemId: string, payload: EstoqueEntradaPayload): Promise<EstoqueMovimento> {
  const response = await client.post<EstoqueMovimento>(
    `/api/v1/estoque-aluminio/${itemId}/entrada`,
    payload,
  );
  return response.data;
}

export async function addSaida(itemId: string, payload: EstoqueSaidaPayload): Promise<EstoqueMovimento> {
  const response = await client.post<EstoqueMovimento>(
    `/api/v1/estoque-aluminio/${itemId}/saida`,
    payload,
  );
  return response.data;
}

export async function getHistorico(
  itemId: string,
  skip = 0,
  limit = 10,
): Promise<PaginatedResponse<EstoqueMovimento>> {
  const response = await client.get<PaginatedResponse<EstoqueMovimento>>(
    `/api/v1/estoque-aluminio/${itemId}/historico`,
    { params: { skip, limit } },
  );
  return response.data;
}

export async function setEstoqueMinimo(
  itemId: string,
  payload: EstoqueMinimoPayload,
): Promise<EstoqueItem> {
  const response = await client.patch<EstoqueItem>(
    `/api/v1/estoque-aluminio/${itemId}/estoque-minimo`,
    payload,
  );
  return response.data;
}
