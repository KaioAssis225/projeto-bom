import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

const routeTitleMap: Record<string, string> = {
  "/grupos": "Grupos de Matéria-Prima",
  "/unidades": "Unidades de Medida",
  "/itens": "Itens",
  "/bom": "Estrutura BOM",
  "/precos": "Histórico de Preços",
  "/calculos": "Cálculos de Custo",
  "/logs": "Logs de Execução",
};

function getPageTitle(pathname: string): string {
  const matchedRoute = Object.keys(routeTitleMap).find((route) =>
    pathname.startsWith(route)
  );
  return matchedRoute ? routeTitleMap[matchedRoute] : "BOM Sistema";
}

export function AppLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch {
      // localStorage indisponível (ex: Safari private, iframe cross-origin)
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Wrapper que anima a largura da sidebar */}
      <div
        className="overflow-hidden shrink-0 transition-all duration-300 ease-in-out"
        style={{ width: collapsed ? 0 : 224 }}
      >
        <Sidebar onCollapse={toggle} />
      </div>

      {/* Botão flutuante visível apenas quando colapsada */}
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expandir sidebar"
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 rounded-r-md bg-blue-600 p-1.5 text-white shadow-md transition-colors hover:bg-blue-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
