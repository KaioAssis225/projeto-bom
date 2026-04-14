import { useState } from "react";

import { cn } from "@/lib/utils";
import MateriaisPrimasTab from "@/pages/MateriaisPrimasTab";
import ProdutosAcabadosTab from "@/pages/ProdutosAcabadosTab";

type TabKey = "materias" | "produtos";

export default function ItensPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("materias");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("materias")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "materias"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Matérias-Primas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("produtos")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "produtos"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Produtos Acabados
          </button>
        </div>
      </div>

      {activeTab === "materias" ? (
        <MateriaisPrimasTab />
      ) : (
        <ProdutosAcabadosTab />
      )}
    </div>
  );
}
