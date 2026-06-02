import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { AppLayout } from "@/components/layout/AppLayout";
import { canAccessRoute } from "@/lib/routeAreas";
import LoginPage from "@/pages/LoginPage";
import BomPage from "@/pages/BomPage";
import CalculosPage from "@/pages/CalculosPage";
import FornecedoresPage from "@/pages/FornecedoresPage";
import GruposPage from "@/pages/GruposPage";
import EstoquesPage from "@/pages/EstoqueAluminioPage";
import SetoresPage from "@/pages/SetoresPage";
import ImportacoesPage from "@/pages/ImportacoesPage";
import ItensPage from "@/pages/ItensPage";
import LogsPage from "@/pages/LogsPage";
import UsuariosPage from "@/pages/UsuariosPage";
import PermissoesPage from "@/pages/PermissoesPage";
import PrecosPage from "@/pages/PrecosPage";
import UnidadesPage from "@/pages/UnidadesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

function SmartRedirect() {
  const { user, realUser } = useAuth();
  const isAdmin = realUser?.roles.some((r) => r.nivel === "ADMIN");
  if (isAdmin) return <Navigate to="/itens" replace />;
  const areas = user?.roles.map((r) => r.area) ?? [];
  if (areas.includes("ESTOQUE") && !areas.includes("CUSTOS") && !areas.includes("CADASTRO")) {
    return <Navigate to="/estoques" replace />;
  }
  return <Navigate to="/itens" replace />;
}

/** Protege uma rota pelo path — redireciona se o usuário não tem área adequada. */
function A({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, realUser, viewingAs } = useAuth();
  const isAdmin = realUser?.roles.some((r) => r.nivel === "ADMIN") ?? false;
  const userAreas = user?.roles.map((r) => r.area) ?? [];
  if (!canAccessRoute(userAreas, isAdmin, !!viewingAs, path)) {
    return <SmartRedirect />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<SmartRedirect />} />
                <Route path="/itens"        element={<A path="/itens">       <ItensPage />       </A>} />
                <Route path="/importacoes"  element={<A path="/importacoes"> <ImportacoesPage /> </A>} />
                <Route path="/bom"          element={<A path="/bom">         <BomPage />         </A>} />
                <Route path="/bom/criar"    element={<Navigate to="/bom" replace />} />
                <Route path="/bom/analisar" element={<Navigate to="/bom" replace />} />
                <Route path="/precos"       element={<A path="/precos">      <PrecosPage />      </A>} />
                <Route path="/calculos"     element={<A path="/calculos">    <CalculosPage />    </A>} />
                <Route path="/grupos"       element={<A path="/grupos">      <GruposPage />      </A>} />
                <Route path="/setores"      element={<A path="/setores">     <SetoresPage />     </A>} />
                <Route path="/estoques"     element={<A path="/estoques">    <EstoquesPage />    </A>} />
                <Route path="/unidades"     element={<A path="/unidades">    <UnidadesPage />    </A>} />
                <Route path="/fornecedores" element={<A path="/fornecedores"><FornecedoresPage /></A>} />
                <Route path="/logs"         element={<A path="/logs">        <LogsPage />        </A>} />
                <Route path="/usuarios"     element={<UsuariosPage />} />
                <Route path="/permissoes"   element={<PermissoesPage />} />
                <Route path="*"             element={<SmartRedirect />} />
              </Route>
            </Route>
          </Routes>
          <ViewAsBanner />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
