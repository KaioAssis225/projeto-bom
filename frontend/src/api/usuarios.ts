import { client } from "./client";

export interface UserRoleResponse {
  id: string;
  area: string;
  nivel: string;
}

export interface UserAdminResponse {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  roles: UserRoleResponse[];
}

export interface UserAdminListResponse {
  items: UserAdminResponse[];
  total: number;
}

export interface UserRoleInput {
  area: string;
  nivel: string;
}

export interface UserCreatePayload {
  email: string;
  full_name?: string | null;
  senha_inicial: string;
  roles: UserRoleInput[];
}

export interface UserUpdatePayload {
  email?: string;
  full_name?: string | null;
  is_active?: boolean;
}

export const usuariosApi = {
  list: (skip = 0, limit = 100) =>
    client
      .get<UserAdminListResponse>("/api/v1/admin/usuarios/", { params: { skip, limit } })
      .then((r) => r.data),

  create: (payload: UserCreatePayload) =>
    client.post<UserAdminResponse>("/api/v1/admin/usuarios/", payload).then((r) => r.data),

  update: (id: string, payload: UserUpdatePayload) =>
    client.put<UserAdminResponse>(`/api/v1/admin/usuarios/${id}`, payload).then((r) => r.data),

  updateRoles: (id: string, roles: UserRoleInput[]) =>
    client
      .put<UserAdminResponse>(`/api/v1/admin/usuarios/${id}/roles`, { roles })
      .then((r) => r.data),

  updatePassword: (id: string, nova_senha: string) =>
    client.patch(`/api/v1/admin/usuarios/${id}/senha`, { nova_senha }),

  revokeSessions: (id: string) =>
    client.delete(`/api/v1/admin/usuarios/${id}/sessoes`),
};
