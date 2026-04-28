import { X } from "lucide-react";

import VariacoesCustoTimeline from "@/components/VariacoesCustoTimeline";

type Props = {
  open: boolean;
  onClose: () => void;
  paId: string | null;
  paCode?: string;
  paDescription?: string;
};

export default function VariacoesCustoModal({ open, onClose, paId, paCode, paDescription }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Histórico de Variações de Custo</h2>
            <p className="text-sm text-slate-500">
              {paCode && paDescription ? (
                <>
                  <span className="font-mono">{paCode}</span> — {paDescription}
                </>
              ) : (
                "Cada entrada representa uma alteração de preço de matéria-prima que afetou este PA."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <VariacoesCustoTimeline paId={open ? paId : null} enabled={open} />
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
