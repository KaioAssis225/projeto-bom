import {
  Factory,
  FolderTree,
  Boxes,
  Package2,
  Ruler,
  Calculator,
  ScrollText,
  Coins,
  Truck,
  Upload,
  Warehouse,
  ChevronLeft,
  Users,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Quais áreas enxergam cada rota
const ROUTE_AREAS: Record<string, string[]> = {
  "/itens":        ["CUSTOS", "CADASTRO", "GERAL"],
  "/bom":          ["CUSTOS", "CADASTRO", "GERAL"],
  "/precos":       ["CUSTOS", "GERAL"],
  "/calculos":     ["CADASTRO"],
  "/estoques":     ["ESTOQUE"],
  "/grupos":       ["CUSTOS", "CADASTRO", "GERAL"],
  "/setores":      ["CUSTOS", "CADASTRO", "GERAL"],
  "/unidades":     ["CUSTOS", "CADASTRO", "GERAL"],
  "/fornecedores": ["CUSTOS", "CADASTRO", "GERAL"],
  "/importacoes":  ["CADASTRO"],
  "/logs":         ["CUSTOS", "GERAL"],
};

interface NavItem {
  label: string;
  to: string;
  icon: typeof Package2;
}

const ALL_ITEMS: NavItem[] = [
  { label: "Itens",        to: "/itens",        icon: Package2   },
  { label: "BOM",          to: "/bom",          icon: FolderTree },
  { label: "Preços",       to: "/precos",       icon: Coins      },
  { label: "Cálculo",      to: "/calculos",     icon: Calculator },
  { label: "Estoques",     to: "/estoques",     icon: Warehouse  },
  { label: "Grupos",       to: "/grupos",       icon: Boxes      },
  { label: "Setores",      to: "/setores",      icon: Boxes      },
  { label: "Unidades",     to: "/unidades",     icon: Ruler      },
  { label: "Fornecedores", to: "/fornecedores", icon: Truck      },
  { label: "Importações",  to: "/importacoes",  icon: Upload     },
  { label: "Logs",         to: "/logs",         icon: ScrollText },
];

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  onCollapse: () => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const { user, realUser, viewingAs } = useAuth();

  const isRealAdmin = realUser?.roles.some((r) => r.nivel === "ADMIN") ?? false;
  // In view-as mode, filter by the simulated user's areas
  const userAreas = user?.roles.map((r) => r.area) ?? [];

  const canSee = (route: string): boolean => {
    // Real admin not in view-as mode sees everything
    if (isRealAdmin && !viewingAs) return true;
    const allowed = ROUTE_AREAS[route];
    if (!allowed) return true;
    return userAreas.some((a) => allowed.includes(a));
  };

  const visibleItems = ALL_ITEMS.filter((item) => canSee(item.to));

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Factory className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">BOM Sistema</p>
          <p className="text-xs text-slate-500">Gestão industrial</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        {isRealAdmin && (
          <>
            <div className="mx-2 my-3 border-t border-slate-200" />
            <SidebarLink item={{ label: "Usuários",   to: "/usuarios",   icon: Users       }} />
            <SidebarLink item={{ label: "Permissões", to: "/permissoes", icon: ShieldCheck }} />
          </>
        )}
      </nav>

      {/* Recolher */}
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onCollapse}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Recolher</span>
        </button>
      </div>
    </aside>
  );
}
