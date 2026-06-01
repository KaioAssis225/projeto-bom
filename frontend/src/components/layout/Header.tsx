import { useState } from "react";
import { LogOut, ChevronDown, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { realUser, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName = realUser?.full_name || realUser?.email || "";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[160px] truncate font-medium">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="truncate text-xs font-medium text-slate-900">{realUser?.full_name || "—"}</p>
                <p className="truncate text-xs text-slate-500">{realUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
