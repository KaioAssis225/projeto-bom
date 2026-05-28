import { useState } from "react";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { extractErrorMessage } from "@/api/client";

interface Props {
  onSuccess: () => void;
}

export function ForcePasswordChange({ onSuccess }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { toast.error("A nova senha deve ter no mínimo 8 caracteres"); return; }
    if (next !== confirm) { toast.error("As senhas não coincidem"); return; }

    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      toast.success("Senha alterada com sucesso!");
      onSuccess();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-100 px-6 py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Troque sua senha</h2>
          <p className="mt-1 text-sm text-slate-500">
            Este é seu primeiro acesso. Por segurança, defina uma nova senha antes de continuar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Senha atual */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Senha atual</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="Senha temporária recebida"
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nova senha</label>
            <div className="relative">
              <input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="Mínimo 8 caracteres"
              />
              <button type="button" onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {next.length > 0 && next.length < 8 && (
              <p className="text-xs text-red-500">Mínimo 8 caracteres</p>
            )}
          </div>

          {/* Confirmar */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              placeholder="Repita a nova senha"
            />
            {confirm.length > 0 && next !== confirm && (
              <p className="text-xs text-red-500">As senhas não coincidem</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || next.length < 8 || next !== confirm}
            className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Definir nova senha
          </button>
        </form>
      </div>
    </div>
  );
}
