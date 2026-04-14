import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import BomPage from "@/pages/BomPage";
import CalculosPage from "@/pages/CalculosPage";
import FornecedoresPage from "@/pages/FornecedoresPage";
import GruposPage from "@/pages/GruposPage";
import ItensPage from "@/pages/ItensPage";
import LogsPage from "@/pages/LogsPage";
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
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/itens" replace />} />
            <Route path="/itens" element={<ItensPage />} />
            <Route path="/bom" element={<BomPage />} />
            <Route path="/precos" element={<PrecosPage />} />
            <Route path="/calculos" element={<CalculosPage />} />
            <Route path="/grupos" element={<GruposPage />} />
            <Route path="/unidades" element={<UnidadesPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="*" element={<Navigate to="/itens" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
