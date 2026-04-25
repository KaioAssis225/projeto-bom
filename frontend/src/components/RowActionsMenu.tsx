import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
};

type Props = {
  actions: RowAction[];
  align?: "right" | "left";
  trigger?: ReactNode;
};

export function RowActionsMenu({ actions, align = "right", trigger }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const visible = actions.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="Ações"
      >
        {trigger ?? <MoreVertical className="h-4 w-4" />}
      </button>

      {isOpen ? (
        <div
          className={cn(
            "absolute top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setIsOpen(false);
                  action.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                  action.variant === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
