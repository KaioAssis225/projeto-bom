import { Factory, FolderTree, Boxes, Package2, Ruler, Calculator, ScrollText, Coins } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Package2;
}

const primaryItems: NavItem[] = [
  { label: "Itens", to: "/itens", icon: Package2 },
  { label: "BOM", to: "/bom", icon: FolderTree },
  { label: "Preços", to: "/precos", icon: Coins },
  { label: "Cálculo", to: "/calculos", icon: Calculator },
];

const secondaryItems: NavItem[] = [
  { label: "Grupos", to: "/grupos", icon: Boxes },
  { label: "Unidades", to: "/unidades", icon: Ruler },
];

const tertiaryItems: NavItem[] = [
  { label: "Logs", to: "/logs", icon: ScrollText },
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

function SidebarSection({ items }: { items: NavItem[] }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <SidebarLink key={item.to} item={item} />
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-white border-r flex flex-col shrink-0">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Factory className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">BOM Sistema</p>
          <p className="text-xs text-slate-500">Gestão industrial</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 px-3 py-4">
        <SidebarSection items={primaryItems} />
        <div className="mx-2 border-t border-slate-200" />
        <SidebarSection items={secondaryItems} />
        <div className="mx-2 border-t border-slate-200" />
        <SidebarSection items={tertiaryItems} />
      </nav>
    </aside>
  );
}
