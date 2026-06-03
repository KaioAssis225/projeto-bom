import { client } from "./client";

export interface GrupoEstoque {
  id: string;
  code: string;
  name: string;
}

export interface ItemRequisicao {
  id: string;
  code: string;
  description: string;
  uom1_code: string;
  uom2_code: string | null;
}

export interface ProdutoAcabadoReq {
  id: string;
  code: string;
  description: string;
}

export interface RequisicaoItemPayload {
  item_id: string;
  quantidade: number;
  unidade_key: "UOM1" | "UOM2";
  notes?: string;
}

export interface RequisicaoCreatePayload {
  group_id: string;
  itens: RequisicaoItemPayload[];
  notes?: string;
}

export interface RequisicaoItemResponse {
  id: string;
  item_id: string;
  item_code: string;
  item_description: string;
  quantidade: number;
  unidade_key: string;
  uom1_code: string;
  uom2_code: string | null;
  notes: string | null;
}

export interface RequisicaoResponse {
  id: string;
  user_id: string;
  user_name: string;
  group_id: string;
  group_name: string;
  status: string;
  notes: string | null;
  created_at: string;
  itens: RequisicaoItemResponse[];
}

export const requisicoesApi = {
  grupos: () =>
    client.get<GrupoEstoque[]>("/api/v1/requisicoes/grupos-estoque").then((r) => r.data),

  materiasPorGrupo: (groupId: string) =>
    client.get<ItemRequisicao[]>(`/api/v1/requisicoes/grupos/${groupId}/materias-primas`).then((r) => r.data),

  itensBomPorGrupo: (paId: string, groupId: string) =>
    client.get<ItemRequisicao[]>(`/api/v1/requisicoes/pa/${paId}/itens-bom`, { params: { group_id: groupId } }).then((r) => r.data),

  produtosAcabados: () =>
    client.get<ProdutoAcabadoReq[]>("/api/v1/requisicoes/produtos-acabados").then((r) => r.data),

  create: (payload: RequisicaoCreatePayload) =>
    client.post<RequisicaoResponse>("/api/v1/requisicoes/", payload).then((r) => r.data),

  list: (skip = 0, limit = 50) =>
    client.get<{ items: RequisicaoResponse[]; total: number }>("/api/v1/requisicoes/", { params: { skip, limit } }).then((r) => r.data),

  updateStatus: (id: string, status: string, notes?: string) =>
    client.patch<RequisicaoResponse>(`/api/v1/requisicoes/${id}/status`, { status, notes }).then((r) => r.data),
};
