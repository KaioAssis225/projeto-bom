import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, Pencil, Plus, Search, Shield, Trash2, X, LogOut,
  UserCircle2, CheckCircle2, XCircle, Clock, Eye,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import { extractErrorMessage } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserAdminResponse, UserRoleInput } from "@/api/usuarios";
import {
  useUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  useUpdateRoles,
  useRevogarSessoes,
} from "@/hooks/useUsuarios";

// ─── Constantes ──────────────────────────────────────────────────────────────

const AREAS = ["CUSTOS", "ESTOQUE", "CADASTRO", "GERAL"] as const;
const NIVEIS = ["VIEWER", "ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN"] as const;

const AREA_LABEL: Record<string, string> = {
  CUSTOS: "Custos",
  ESTOQUE: "Estoque",
  CADASTRO: "Cadastro",
  GERAL: "Geral",
};

const AREA_COLOR: Record<string, string> = {
  CUSTOS:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  ESTOQUE:  "bg-blue-50 text-blue-700 border-blue-200",
  CADASTRO: "bg-violet-50 text-violet-700 border-violet-200",
  GERAL:    "bg-orange-50 text-orange-700 border-orange-200",
};

const NIVEL_BADGE: Record<string, string> = {
  VIEWER:     "bg-slate-100 text-slate-600",
  ESTOQUISTA: "bg-blue-100 text-blue-700",
  ANALISTA:   "bg-indigo-100 text-indigo-700",
  GESTOR:     "bg-purple-100 text-purple-700",
  ADMIN:      "bg-red-100 text-red-700",
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

function avatarColor(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(user: UserAdminResponse) {
  if (user.full_name) {
    const parts = user.full_name.trim().split(" ");
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.email[0].toUpperCase();
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

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

function ModalShell({
  title, subtitle, onClose, children,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RolesEditor({
  roles, onChange, disabled,
}: { roles: UserRoleInput[]; onChange: (roles: UserRoleInput[]) => void; disabled: boolean }) {
  const add = () => onChange([...roles, { area: "CUSTOS", nivel: "VIEWER" }]);
  const remove = (i: number) => onChange(roles.filter((_, idx) => idx !== i));
  const change = (i: number, field: "area" | "nivel", val: string) =>
    onChange(roles.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Permissões de acesso</span>
        <button type="button" onClick={add} disabled={disabled}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      {roles.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-400">
          Nenhuma permissão. Clique em "Adicionar" para começar.
        </div>
      )}

      <div className="space-y-2">
        {roles.map((role, i) => (
          <div key={i} className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2",
            AREA_COLOR[role.area] ?? "border-slate-200 bg-white",
          )}>
            <select
              value={role.area}
              onChange={(e) => change(i, "area", e.target.value)}
              disabled={disabled}
              className="flex-1 rounded border-0 bg-transparent text-sm font-medium outline-none cursor-pointer"
            >
              {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
            </select>
            <span className="text-slate-300">·</span>
            <select
              value={role.nivel}
              onChange={(e) => change(i, "nivel", e.target.value)}
              disabled={disabled}
              className="flex-1 rounded border-0 bg-transparent text-sm outline-none cursor-pointer"
            >
              {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button type="button" onClick={() => remove(i)} disabled={disabled}
              className="ml-1 rounded p-1 text-current opacity-60 hover:opacity-100 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().trim().max(100).optional(),
  senha_inicial: z.string().min(8, "Mínimo 8 caracteres"),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().trim().max(100).optional(),
  is_active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

// ─── Modal Criar ──────────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateUsuario();
  const [roles, setRoles] = useState<UserRoleInput[]>([{ area: "CUSTOS", nivel: "VIEWER" }]);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", full_name: "", senha_inicial: "" },
  });

  useEffect(() => {
    if (!open) { form.reset(); setRoles([{ area: "CUSTOS", nivel: "VIEWER" }]); }
  }, [form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (roles.length === 0) { toast.error("Adicione pelo menos uma permissão"); return; }
    try {
      await create.mutateAsync({
        email: values.email,
        full_name: values.full_name || null,
        senha_inicial: values.senha_inicial,
        roles,
      });
      onClose();
    } catch { /* toast handled in hook */ }
  });

  if (!open) return null;

  return (
    <ModalShell title="Novo Usuário" subtitle="O usuário deverá trocar a senha no primeiro acesso." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input type="email" className={inputCls} disabled={create.isPending} {...form.register("email")} />
          </Field>
          <Field label="Nome completo" error={form.formState.errors.full_name?.message}>
            <input type="text" className={inputCls} disabled={create.isPending} {...form.register("full_name")} />
          </Field>
        </div>

        <Field label="Senha inicial" error={form.formState.errors.senha_inicial?.message}>
          <input type="password" className={inputCls} disabled={create.isPending} {...form.register("senha_inicial")} />
        </Field>

        <RolesEditor roles={roles} onChange={setRoles} disabled={create.isPending} />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={create.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar usuário
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────

function EditModal({ user, onClose }: { user: UserAdminResponse | null; onClose: () => void }) {
  const update = useUpdateUsuario();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { email: "", full_name: "", is_active: true },
  });

  useEffect(() => {
    if (user) form.reset({ email: user.email, full_name: user.full_name ?? "", is_active: user.is_active });
  }, [form, user]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    try {
      await update.mutateAsync({ id: user.id, data: { email: values.email, full_name: values.full_name || null, is_active: values.is_active } });
      onClose();
    } catch { /* toast handled in hook */ }
  });

  if (!user) return null;

  return (
    <ModalShell title="Editar Usuário" subtitle={user.email} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input type="email" className={inputCls} disabled={update.isPending} {...form.register("email")} />
        </Field>
        <Field label="Nome completo" error={form.formState.errors.full_name?.message}>
          <input type="text" className={inputCls} disabled={update.isPending} {...form.register("full_name")} />
        </Field>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input id="is-active" type="checkbox" disabled={update.isPending}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
            {...form.register("is_active")} />
          <label htmlFor="is-active" className="cursor-pointer select-none text-sm font-medium text-slate-700">
            Conta ativa
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={update.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={update.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Modal Permissões ─────────────────────────────────────────────────────────

function RolesModal({ user, onClose }: { user: UserAdminResponse | null; onClose: () => void }) {
  const updateRoles = useUpdateRoles();
  const [roles, setRoles] = useState<UserRoleInput[]>([]);

  useEffect(() => {
    if (user) setRoles(user.roles.map((r) => ({ area: r.area, nivel: r.nivel })));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (roles.length === 0) { toast.error("Adicione pelo menos uma permissão"); return; }
    try {
      await updateRoles.mutateAsync({ id: user.id, roles });
      onClose();
    } catch { /* toast handled in hook */ }
  };

  if (!user) return null;

  return (
    <ModalShell title="Permissões de Acesso" subtitle={user.full_name ?? user.email} onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <RolesEditor roles={roles} onChange={setRoles} disabled={updateRoles.isPending} />
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={updateRoles.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={updateRoles.isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {updateRoles.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar permissões
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Card de usuário ──────────────────────────────────────────────────────────

function UserCard({ user, onEdit, onRoles, onRevogar, onViewAs }: {
  user: UserAdminResponse;
  onEdit: () => void;
  onRoles: () => void;
  onRevogar: () => void;
  onViewAs: () => void;
}) {
  const actions: RowAction[] = [
    { label: "Visualizar como", icon: Eye, onClick: onViewAs },
    { label: "Editar dados", icon: Pencil, onClick: onEdit },
    { label: "Permissões", icon: Shield, onClick: onRoles },
    { label: "Revogar sessões", icon: LogOut, onClick: onRevogar },
  ];

  return (
    <div className={cn(
      "flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md",
      user.is_active ? "border-slate-200" : "border-slate-200 opacity-60",
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
        avatarColor(user.email),
      )}>
        {initials(user)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {user.full_name ?? <span className="text-slate-400 font-normal italic">Sem nome</span>}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user.is_active ? (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                <XCircle className="h-3 w-3" /> Inativo
              </span>
            )}
            <RowActionsMenu actions={actions} />
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-wrap gap-1.5">
          {user.roles.length === 0 && (
            <span className="text-xs text-slate-400 italic">Sem permissões</span>
          )}
          {user.roles.map((r) => (
            <span key={r.id} className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              AREA_COLOR[r.area] ?? "bg-slate-50 border-slate-200 text-slate-600",
            )}>
              {AREA_LABEL[r.area] ?? r.area}
              <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", NIVEL_BADGE[r.nivel])}>
                {r.nivel}
              </span>
            </span>
          ))}
        </div>

        {/* Último acesso */}
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          {user.last_login_at
            ? `Último acesso ${new Date(user.last_login_at).toLocaleString("pt-BR")}`
            : "Nunca acessou"}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-slate-200" />
            <div className="h-5 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalState = "none" | "create" | "edit" | "roles";

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>("none");
  const [selected, setSelected] = useState<UserAdminResponse | null>(null);

  const { setViewingAs, realUser } = useAuth();
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

  const handleViewAs = (u: UserAdminResponse) => {
    setViewingAs({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      must_change_password: false,
      roles: u.roles.map((r) => ({ area: r.area, nivel: r.nivel })),
    });
  };

  const total = usuariosQuery.data?.total ?? 0;
  const ativos = usuariosQuery.data?.items.filter((u) => u.is_active).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie quem tem acesso ao sistema e suas permissões por área.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal("create")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </button>
        </div>

        {/* Stats */}
        {usuariosQuery.data && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: total, icon: UserCircle2, color: "text-slate-700" },
              { label: "Ativos", value: ativos, icon: CheckCircle2, color: "text-green-600" },
              { label: "Inativos", value: total - ativos, icon: XCircle, color: "text-slate-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Icon className={cn("h-5 w-5", color)} />
                <div>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Loading */}
      {usuariosQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {usuariosQuery.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>Não foi possível carregar os usuários.</p>
          <button type="button" onClick={() => void usuariosQuery.refetch()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 font-medium text-red-700 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cards */}
      {!usuariosQuery.isLoading && !usuariosQuery.isError && (
        <>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <UserCircle2 className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhum usuário encontrado</p>
              {search && <p className="mt-1 text-xs text-slate-400">Tente outro termo de busca</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onEdit={() => openEdit(u)}
                  onRoles={() => openRoles(u)}
                  onRevogar={() => void handleRevogar(u)}
                  onViewAs={() => handleViewAs(u)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateModal open={modal === "create"} onClose={closeModal} />
      <EditModal user={modal === "edit" ? selected : null} onClose={closeModal} />
      <RolesModal user={modal === "roles" ? selected : null} onClose={closeModal} />
    </div>
  );
}
