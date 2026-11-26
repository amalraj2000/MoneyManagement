"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800", className)}>{children}</section>;
}

export function Button({
  variant = "primary", className, ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "income" | "expense" }) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    income: "bg-emerald-600 text-white hover:bg-emerald-700",
    expense: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button
      {...p}
      className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50", v, className)}
    />
  );
}

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl outline-none dark:bg-slate-900 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Progress({ percent, over, color = "bg-emerald-500" }: { percent: number; over?: boolean; color?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={Math.round(Math.min(percent, 100))} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all duration-500", over ? "bg-red-500" : color)} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
    </div>
  );
}

export function Collapsible({ id, title, children, defaultOpen = false }: { id?: string; title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details id={id} open={defaultOpen} className="group scroll-mt-4 rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        {title}
        <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
