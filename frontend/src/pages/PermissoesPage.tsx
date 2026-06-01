import { ShieldCheck, Eye, Package, DollarSign, Warehouse, BookOpen, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Dados ────────────────────────────────────────────────────────────────────

const AREAS = [
  {
    key: "CUSTOS",
    label: "Custos",
    icon: DollarSign,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    description: "Gerencia BOMs, cálculo de custo, preços de matérias-primas e histórico de variações.",
  },
  {
    key: "ESTOQUE",
    label: "Estoque",
    icon: Warehouse,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    description: "Controla movimentações de entrada e saída, saldos e alertas de estoque mínimo.",
  },
  {
    key: "CADASTRO",
    label: "Cadastro",
    icon: BookOpen,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    badge: "bg-violet-100 text-violet-800",
    description: "Mantém o cadastro de matérias-primas, produtos acabados, grupos, setores, fornecedores e unidades.",
  },
  {
    key: "GERAL",
    label: "Geral",
    icon: Package,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    badge: "bg-orange-100 text-orange-800",
    description: "Acesso de suporte às demais áreas, sem operações específicas de negócio.",
  },
] as const;

const NIVEIS = [
  {
    key: "VIEWER",
    label: "Viewer",
    color: "bg-slate-100 text-slate-700",
    description: "Somente leitura. Visualiza listas, detalhes e relatórios, mas não pode criar, editar ou excluir nada.",
  },
  {
    key: "ESTOQUISTA",
    label: "Estoquista",
    color: "bg-blue-100 text-blue-700",
    description: "Disponível apenas na área Estoque. Pode registrar entradas e saídas de material além de visualizar.",
  },
  {
    key: "ANALISTA",
    label: "Analista",
    color: "bg-indigo-100 text-indigo-700",
    description: "Pode criar e editar registros. Em Custos, executa cálculos e registra preços. Em Cadastro, cria e atualiza itens.",
  },
  {
    key: "GESTOR",
    label: "Gestor",
    color: "bg-purple-100 text-purple-700",
    description: "Todas as ações do Analista mais inativar registros e ver valores de custo de qualquer área.",
  },
  {
    key: "ADMIN",
    label: "Admin",
    color: "bg-red-100 text-red-700",
    description: "Acesso irrestrito. Gerencia usuários e permissões além de todas as operações de todas as áreas.",
  },
] as const;

// O que cada nível pode fazer por área
const MATRIX: Record<string, Record<string, string[]>> = {
  CUSTOS: {
    VIEWER:     ["Ver BOMs", "Ver cálculos", "Baixar planilhas"],
    ESTOQUISTA: ["—"],
    ANALISTA:   ["Ver BOMs", "Criar/editar BOMs", "Executar cálculos", "Registrar preços", "Ver valores de custo"],
    GESTOR:     ["Tudo do Analista", "Inativar BOMs", "Ver preços e variações de custo"],
    ADMIN:      ["Acesso total"],
  },
  ESTOQUE: {
    VIEWER:     ["Ver saldo de estoque", "Ver histórico de movimentos"],
    ESTOQUISTA: ["Ver estoque", "Registrar entradas e saídas", "Definir estoque mínimo e alerta"],
    ANALISTA:   ["Ver estoque", "Registrar entradas e saídas", "Definir estoque mínimo e alerta"],
    GESTOR:     ["Tudo do Estoquista"],
    ADMIN:      ["Acesso total"],
  },
  CADASTRO: {
    VIEWER:     ["Ver matérias-primas", "Ver produtos acabados", "Ver grupos/setores/fornecedores/unidades"],
    ESTOQUISTA: ["—"],
    ANALISTA:   ["Ver cadastros", "Criar e editar todos os cadastros", "Importar via CSV"],
    GESTOR:     ["Tudo do Analista", "Inativar registros"],
    ADMIN:      ["Acesso total"],
  },
  GERAL: {
    VIEWER:     ["Acesso de leitura às áreas autorizadas"],
    ESTOQUISTA: ["—"],
    ANALISTA:   ["Acesso de edição às áreas autorizadas"],
    GESTOR:     ["Acesso completo às áreas autorizadas", "Ver valores de custo"],
    ADMIN:      ["Acesso total"],
  },
};

// ─── Componentes ──────────────────────────────────────────────────────────────

function NivelBadge({ nivel }: { nivel: string }) {
  const n = NIVEIS.find((x) => x.key === nivel);
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", n?.color)}>
      {n?.label ?? nivel}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermissoesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Guia de Permissões</h1>
            <p className="mt-1 text-sm text-slate-500">
              O acesso ao sistema é controlado por combinações de <strong>Área</strong> e <strong>Nível</strong>.
              Um usuário pode ter múltiplas combinações — por exemplo, Analista em Custos e Estoquista em Estoque ao mesmo tempo.
            </p>
          </div>
        </div>
      </div>

      {/* Áreas */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Áreas do sistema</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {AREAS.map(({ key, label, icon: Icon, color, description }) => (
            <div key={key} className={cn("flex gap-3 rounded-xl border p-4", color)}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm opacity-80">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Níveis */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Níveis de acesso</h2>
        <div className="space-y-2">
          {NIVEIS.map(({ key, label, color, description }) => (
            <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <NivelBadge nivel={key} />
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Matriz */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">O que cada combinação permite</h2>
        <div className="space-y-4">
          {AREAS.map(({ key: areaKey, label: areaLabel, badge }) => (
            <div key={areaKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={cn("flex items-center gap-2 border-b border-slate-100 px-5 py-3", badge.replace("text-", "text-").replace("bg-", "bg-"))}>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", badge)}>{areaLabel}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {NIVEIS.filter((n) => MATRIX[areaKey][n.key][0] !== "—").map(({ key: nivelKey }) => (
                  <div key={nivelKey} className="flex items-start gap-4 px-5 py-3">
                    <div className="w-24 shrink-0 pt-0.5">
                      <NivelBadge nivel={nivelKey} />
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {MATRIX[areaKey][nivelKey].map((item) => (
                        <li key={item} className="flex items-center gap-1 text-sm text-slate-600">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Regra de preços */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Regra especial — Visualização de valores</h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-2 text-sm text-amber-900">
              <p className="font-semibold">Quem pode ver preços e custos?</p>
              <p>
                Valores monetários (preços de matérias-primas, custos de BOM, variações de custo) são visíveis para:
              </p>
              <ul className="ml-4 space-y-1 list-disc">
                <li>Qualquer usuário com acesso à área <strong>Custos</strong> (qualquer nível)</li>
                <li>Usuários com nível <strong>Gestor</strong> ou <strong>Admin</strong> em qualquer área</li>
              </ul>
              <p className="text-xs text-amber-700 mt-1">
                Viewers e Analistas de outras áreas (Estoque, Cadastro, Geral) não veem valores financeiros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Admin */}
      <section>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm text-red-900">
              <p className="font-semibold">Nível Admin — acesso irrestrito</p>
              <p className="mt-1">
                Usuários Admin ignoram todas as restrições de área. Podem acessar qualquer funcionalidade
                do sistema, além de gerenciar usuários, permissões e visualizar o sistema pelo ponto de
                vista de qualquer outro usuário.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
