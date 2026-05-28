import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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
                <Route path="/" element={<Navigate to="/itens" replace />} />
                <Route path="/itens" element={<ItensPage />} />
                <Route path="/importacoes" element={<ImportacoesPage />} />
                <Route path="/bom" element={<BomPage />} />
                <Route path="/bom/criar" element={<Navigate to="/bom" replace />} />
                <Route path="/bom/analisar" element={<Navigate to="/bom" replace />} />
                <Route path="/precos" element={<PrecosPage />} />
                <Route path="/calculos" element={<CalculosPage />} />
                <Route path="/grupos" element={<GruposPage />} />
                <Route path="/setores" element={<SetoresPage />} />
                <Route path="/estoques" element={<EstoquesPage />} />
                <Route path="/unidades" element={<UnidadesPage />} />
                <Route path="/fornecedores" element={<FornecedoresPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="*" element={<Navigate to="/itens" replace />} />
              </Route>
            </Route>
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
