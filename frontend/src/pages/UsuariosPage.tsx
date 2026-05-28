import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Search, Shield, Trash2, X, LogOut } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import { extractErrorMessage } from "@/api/client";
import type { UserAdminResponse, UserRoleInput } from "@/api/usuarios";
import {
  useUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  useUpdateRoles,
  useRevogarSessoes,
} from "@/hooks/useUsuarios";

const AREAS = ["CUSTOS", "ESTOQUE", "CADASTRO", "GERAL"] as const;
const NIVEIS = ["VIEWER", "ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN"] as const;

const AREA_LABEL: Record<string, string> = {
  CUSTOS: "Custos",
  ESTOQUE: "Estoque",
  CADASTRO: "Cadastro",
  GERAL: "Geral",
};

const NIVEL_COLOR: Record<string, string> = {
  VIEWER: "bg-slate-100 text-slate-700",
  ESTOQUISTA: "bg-blue-100 text-blue-700",
  ANALISTA: "bg-indigo-100 text-indigo-700",
  GESTOR: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100 text-red-700",
};

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().trim().max(100).optional(),
  senha_inicial: z.string().min(8, "Mínimo 8 caracteres"),
  area: z.enum(AREAS),
  nivel: z.enum(NIVEIS),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().trim().max(100).optional(),
  is_active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Criar usuário ──────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateUsuario();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", full_name: "", senha_inicial: "", area: "CUSTOS", nivel: "VIEWER" },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        email: values.email,
        full_name: values.full_name || null,
        senha_inicial: values.senha_inicial,
        roles: [{ area: values.area, nivel: values.nivel }],
      });
      onClose();
    } catch {
      // error toast handled in hook
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Novo Usuário</h2>
            <p className="text-sm text-slate-500">Crie um novo usuário e defina a permissão inicial.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input type="email" className={inputCls} disabled={create.isPending} {...form.register("email")} />
          </Field>

          <Field label="Nome completo (opcional)" error={form.formState.errors.full_name?.message}>
            <input type="text" className={inputCls} disabled={create.isPending} {...form.register("full_name")} />
          </Field>

          <Field label="Senha inicial" error={form.formState.errors.senha_inicial?.message}>
            <input type="password" className={inputCls} disabled={create.isPending} {...form.register("senha_inicial")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" error={form.formState.errors.area?.message}>
              <select className={inputCls} disabled={create.isPending} {...form.register("area")}>
                {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
              </select>
            </Field>
            <Field label="Nível" error={form.formState.errors.nivel?.message}>
              <select className={inputCls} disabled={create.isPending} {...form.register("nivel")}>
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <CancelBtn onClick={onClose} disabled={create.isPending} />
            <SaveBtn loading={create.isPending} />
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Editar dados ────────────────────────────────────────────────────────────

function EditModal({ user, onClose }: { user: UserAdminResponse | null; onClose: () => void }) {
  const update = useUpdateUsuario();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { email: "", full_name: "", is_active: true },
  });

  useEffect(() => {
    if (user) {
      form.reset({ email: user.email, full_name: user.full_name ?? "", is_active: user.is_active });
    }
  }, [form, user]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    try {
      await update.mutateAsync({ id: user.id, data: { email: values.email, full_name: values.full_name || null, is_active: values.is_active } });
      onClose();
    } catch {
      // error toast handled in hook
    }
  });

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Editar Usuário</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input type="email" className={inputCls} disabled={update.isPending} {...form.register("email")} />
          </Field>

          <Field label="Nome completo" error={form.formState.errors.full_name?.message}>
            <input type="text" className={inputCls} disabled={update.isPending} {...form.register("full_name")} />
          </Field>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input
              id="is-active"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              disabled={update.isPending}
              {...form.register("is_active")}
            />
            <label htmlFor="is-active" className="cursor-pointer select-none text-sm font-medium text-slate-700">
              Usuário ativo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <CancelBtn onClick={onClose} disabled={update.isPending} />
            <SaveBtn loading={update.isPending} />
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Gerenciar permissões ────────────────────────────────────────────────────

function RolesModal({ user, onClose }: { user: UserAdminResponse | null; onClose: () => void }) {
  const updateRoles = useUpdateRoles();
  const [roles, setRoles] = useState<UserRoleInput[]>([]);

  useEffect(() => {
    if (user) setRoles(user.roles.map((r) => ({ area: r.area, nivel: r.nivel })));
  }, [user]);

  const addRole = () => setRoles((prev) => [...prev, { area: "CUSTOS", nivel: "VIEWER" }]);

  const removeRole = (i: number) => setRoles((prev) => prev.filter((_, idx) => idx !== i));

  const changeRole = (i: number, field: "area" | "nivel", value: string) => {
    setRoles((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!user) return;
    if (roles.length === 0) { toast.error("Adicione pelo menos uma permissão"); return; }
    try {
      await updateRoles.mutateAsync({ id: user.id, roles });
      onClose();
    } catch {
      // error toast handled in hook
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Permissões</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {roles.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma permissão. Adicione ao menos uma.</p>
          )}

          {roles.map((role, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={role.area}
                onChange={(e) => changeRole(i, "area", e.target.value)}
                className={cn(inputCls, "flex-1")}
                disabled={updateRoles.isPending}
              >
                {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
              </select>
              <select
                value={role.nivel}
                onChange={(e) => changeRole(i, "nivel", e.target.value)}
                className={cn(inputCls, "flex-1")}
                disabled={updateRoles.isPending}
              >
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeRole(i)}
                disabled={updateRoles.isPending}
                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRole}
            disabled={updateRoles.isPending}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Adicionar permissão
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <CancelBtn onClick={onClose} disabled={updateRoles.isPending} />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateRoles.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {updateRoles.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CancelBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      Cancelar
    </button>
  );
}

function SaveBtn({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Salvar
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Modal = "none" | "create" | "edit" | "roles";

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>("none");
  const [selected, setSelected] = useState<UserAdminResponse | null>(null);

  const usuariosQuery = useUsuarios();
  const revogar = useRevogarSessoes();

  const items = useMemo(() => {
    const all = usuariosQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((u) => `${u.email} ${u.full_name ?? ""}`.toLowerCase().includes(q));
  }, [usuariosQuery.data, search]);

  const openEdit = (u: UserAdminResponse) => { setSelected(u); setModal("edit"); };
  const openRoles = (u: UserAdminResponse) => { setSelected(u); setModal("roles"); };
  const closeModal = () => { setModal("none"); setSelected(null); };

  const handleRevogar = async (u: UserAdminResponse) => {
    if (!window.confirm(`Revogar todas as sessões de ${u.email}?`)) return;
    await revogar.mutateAsync(u.id);
  };

  const buildActions = (u: UserAdminResponse): RowAction[] => [
    { label: "Editar dados", icon: Pencil, onClick: () => openEdit(u) },
    { label: "Permissões", icon: Shield, onClick: () => openRoles(u) },
    { label: "Revogar sessões", icon: LogOut, onClick: () => void handleRevogar(u) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Usuários</h1>
            <p className="mt-1 text-sm text-slate-500">Gerencie usuários e suas permissões de acesso.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal("create")}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email ou nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm text-slate-500">
            {usuariosQuery.data ? `${items.length} usuário(s)` : "Carregando..."}
          </span>
        </div>
      </div>

      {/* Table */}
      {usuariosQuery.isLoading && <TableSkeleton />}

      {usuariosQuery.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os usuários.</p>
          <button
            type="button"
            onClick={() => void usuariosQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!usuariosQuery.isLoading && !usuariosQuery.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Permissões</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Último acesso</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r.id}
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                                NIVEL_COLOR[r.nivel] ?? "bg-slate-100 text-slate-700",
                              )}
                            >
                              {AREA_LABEL[r.area] ?? r.area} · {r.nivel}
                            </span>
                          ))}
                          {u.roles.length === 0 && <span className="text-xs text-slate-400">Sem permissão</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            u.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {u.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString("pt-BR")
                          : "Nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <RowActionsMenu actions={buildActions(u)} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateModal open={modal === "create"} onClose={closeModal} />
      <EditModal user={modal === "edit" ? selected : null} onClose={closeModal} />
      <RolesModal user={modal === "roles" ? selected : null} onClose={closeModal} />
    </div>
  );
}
