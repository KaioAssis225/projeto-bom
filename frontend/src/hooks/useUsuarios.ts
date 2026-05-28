import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usuariosApi, type UserCreatePayload, type UserRoleInput, type UserUpdatePayload } from "@/api/usuarios";
import { extractErrorMessage } from "@/api/client";

const QUERY_KEY = ["usuarios"];

export function useUsuarios() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => usuariosApi.list(),
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => usuariosApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Usuário criado com sucesso");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdatePayload }) =>
      usuariosApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Usuário atualizado");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUpdateRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: UserRoleInput[] }) =>
      usuariosApi.updateRoles(id, roles),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Permissões atualizadas");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useRevogarSessoes() {
  return useMutation({
    mutationFn: (id: string) => usuariosApi.revokeSessions(id),
    onSuccess: () => toast.success("Sessões revogadas"),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}
