import { client } from "./client";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  email: string;
  full_name: string | null;
  must_change_password: boolean;
  roles: { area: string; nivel: string }[];
}

export const authApi = {
  login: (email: string, password: string) =>
    client.post<LoginResponse>("/api/v1/auth/login", { email, password }).then((r) => r.data),

  refresh: (refresh_token: string) =>
    client.post<{ access_token: string }>("/api/v1/auth/refresh", { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    client.post("/api/v1/auth/logout", { refresh_token }),

  me: () =>
    client.get<MeResponse>("/api/v1/auth/me").then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    client.post("/api/v1/auth/change-password", { current_password, new_password }),
};
