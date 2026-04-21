import { useState } from "react";

import { cn } from "@/lib/utils";
import BomAnalyzePage from "@/pages/BomAnalyzePage";
import BomCreatePage from "@/pages/BomCreatePage";

type TabKey = "criar" | "analisar";

export default function BomPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("criar");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("criar")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "criar"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Criar BOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analisar")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "analisar"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Analisar BOM
          </button>
        </div>
      </div>

      {activeTab === "criar" ? <BomCreatePage /> : <BomAnalyzePage />}
    </div>
  );
}
