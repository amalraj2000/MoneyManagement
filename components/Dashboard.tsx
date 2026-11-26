"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Moon, Plus, Sun, Wallet } from "lucide-react";
import { useStore, type NewTransaction } from "@/hooks/useStore";
import { Button, Collapsible, Field, Sheet, inputCls } from "./ui";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { Analytics } from "./Analytics";
import { CategoryManager } from "./CategoryManager";
import { currentMonthKey, monthLabel, shiftMonth, summarizeMonth } from "@/lib/finance/calc";
import { formatPaise, parseRupeesToPaise } from "@/lib/finance/money";
import type { Transaction, TransactionType } from "@/types";

export function Dashboard() {
  const store = useStore();
  const [month, setMonth] = useState(currentMonthKey());
  const [form, setForm] = useState<{ type: TransactionType; editing: Transaction | null } | null>(null);
  const [dark, setDark] = useState(false);
  const { settings } = store;

  // Theme: apply class + follow system when "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const d = settings.theme === "dark" || (settings.theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", d);
      setDark(d);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const summary = useMemo(() => summarizeMonth(store.transactions, month, settings), [store.transactions, month, settings]);

  async function save(t: NewTransaction, editing?: Transaction | null) {
    if (editing) await store.updateTransaction({ ...editing, ...t });
    else await store.addTransactions([t]);
  }

  if (store.loading) return <main className="grid min-h-dvh place-items-center text-slate-500">Loading…</main>;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="absolute inset-x-0 top-0 h-60 bg-gradient-to-b from-[#0b1537] to-[#101c4a] dark:from-[#050a1e] dark:to-[#0a1233]" />
      <main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header id="top" className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 ring-1 ring-white/20"><Wallet size={24} /></span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-white/60">Welcome</p>
              <h1 className="text-xl font-bold leading-tight">MoneyManagement</h1>
            </div>
          </div>
          <button
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 hover:bg-white/20"
            onClick={() => store.saveSettings({ theme: dark ? "light" : "dark" })}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {store.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{store.error}</p>}

        <section aria-label="Available balance" className="rounded-[2rem] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 p-5 text-white shadow-xl shadow-blue-600/30 ring-1 ring-white/20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-white/80">Money I have</p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{formatPaise(store.balancePaise)}</p>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">{month === currentMonthKey() ? "This month" : monthLabel(month)}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500"><ArrowDownLeft size={18} /></span>
              <div className="min-w-0"><p className="text-xs text-white/80">Income</p><p className="truncate font-mono text-sm font-bold">{formatPaise(summary.incomePaise)}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500"><ArrowUpRight size={18} /></span>
              <div className="min-w-0"><p className="text-xs text-white/80">Spent</p><p className="truncate font-mono text-sm font-bold">{formatPaise(summary.expensePaise)}</p></div>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/80">Saved this month: <span className="font-mono font-bold">{formatPaise(summary.savingsPaise)}</span></p>
        </section>

        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center justify-between rounded-2xl bg-white px-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <button aria-label="Previous month" className="flex size-12 items-center justify-center rounded-full" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></button>
            <button className="font-bold" onClick={() => setMonth(currentMonthKey())} aria-label="Jump to current month">{monthLabel(month)}</button>
            <button aria-label="Next month" className="flex size-12 items-center justify-center rounded-full" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="income" className="min-h-14 rounded-2xl text-base" onClick={() => setForm({ type: "income", editing: null })}><Plus size={20} />Add Income</Button>
          <Button variant="expense" className="min-h-14 rounded-2xl text-base" onClick={() => setForm({ type: "expense", editing: null })}><Minus size={20} />Add Expense</Button>
        </div>

        <TransactionList transactions={store.transactions} month={month} onEdit={(t) => setForm({ type: t.type, editing: t })} onDelete={store.deleteTransaction} />

        <Collapsible id="analytics" title="Charts">
          <Analytics transactions={store.transactions} month={month} />
        </Collapsible>

        <Collapsible id="categories" title="Categories">
          <CategoryManager store={store} />
        </Collapsible>


      </main>

      <TransactionForm open={!!form} type={form?.type ?? "expense"} editing={form?.editing} onClose={() => setForm(null)} onSave={save} categories={store.categoriesFor(form?.type ?? "expense")} onAddCategory={(n) => store.addCategory(form?.type ?? "expense", n)} />
      <Onboarding open={!settings.firstLaunchCompleted} onDone={(p) => store.saveSettings({ openingBalancePaise: p, firstLaunchCompleted: true })} />
    </div>
  );
}

function Onboarding({ open, onDone }: { open: boolean; onDone: (p: number) => Promise<void> }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  async function go(skip: boolean) {
    const p = skip || v.trim() === "" ? 0 : parseRupeesToPaise(v);
    if (p === null) return setErr("Enter a valid amount, e.g. 10000");
    await onDone(p);
  }
  return (
    <Sheet open={open} title="Welcome to MoneyManagement" onClose={() => go(true)}>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Optionally set your current balance. Your data stays on this device.</p>
      <Field label="Opening balance (₹)" error={err}><input className={inputCls} inputMode="decimal" placeholder="10000" value={v} onChange={(e) => setV(e.target.value)} /></Field>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => go(true)}>Skip</Button>
        <Button className="flex-1" onClick={() => go(false)}>Get started</Button>
      </div>
    </Sheet>
  );
}
