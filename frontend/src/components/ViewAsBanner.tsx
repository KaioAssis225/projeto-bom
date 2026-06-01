import { Eye, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function ViewAsBanner() {
  const { viewingAs, setViewingAs } = useAuth();

  if (!viewingAs) return null;

  const roleLabels = viewingAs.roles
    .map((r) => `${r.area} · ${r.nivel}`)
    .join(" | ");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-6 py-2.5 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Visualizando como{" "}
          <strong>{viewingAs.full_name ?? viewingAs.email}</strong>
          {roleLabels && (
            <span className="ml-2 font-normal opacity-75">({roleLabels})</span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setViewingAs(null)}
        className="flex items-center gap-1.5 rounded-lg bg-amber-950/15 px-3 py-1 text-sm font-semibold text-amber-950 transition hover:bg-amber-950/25"
      >
        <X className="h-3.5 w-3.5" />
        Sair da visualização
      </button>
    </div>
  );
}
