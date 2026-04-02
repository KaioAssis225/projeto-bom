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
  const matchedRoute = Object.keys(routeTitleMap).find((route) => pathname.startsWith(route));
  return matchedRoute ? routeTitleMap[matchedRoute] : "BOM Sistema";
}

export function AppLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
