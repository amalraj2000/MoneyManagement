"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Moon, Plus, Sun, Wallet } from "lucide-react";
import { useStore, type NewTransaction } from "@/hooks/useStore";
import { Button, Card, Collapsible, Field, Sheet, inputCls } from "./ui";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { Analytics } from "./Analytics";
import { BudgetPanel } from "./BudgetPanel";
import { SmsImport } from "./SmsImport";
import { SettingsPanel } from "./SettingsPanel";
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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white"><Wallet size={20} /></span>
          <h1 className="text-lg font-bold">MoneyManagement</h1>
        </div>
        <button
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
          onClick={() => store.saveSettings({ theme: dark ? "light" : "dark" })}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {store.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{store.error}</p>}

      <div className="flex items-center justify-between">
        <button aria-label="Previous month" className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></button>
        <button className="font-semibold" onClick={() => setMonth(currentMonthKey())} aria-label="Jump to current month">{monthLabel(month)}</button>
        <button aria-label="Next month" className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></button>
      </div>

      <section aria-label="Available balance" className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <p className="text-sm opacity-90">Available Balance</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{formatPaise(store.balancePaise)}</p>
        <p className="mt-1 text-xs opacity-80">Opening balance + all income − all expenses (not affected by month selection)</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3"><p className="text-xs text-slate-500">Income</p><p className="text-sm font-bold text-emerald-600 tabular-nums sm:text-base dark:text-emerald-400">{formatPaise(summary.incomePaise)}</p></Card>
        <Card className="!p-3"><p className="text-xs text-slate-500">Spent</p><p className="text-sm font-bold text-rose-600 tabular-nums sm:text-base dark:text-rose-400">{formatPaise(summary.expensePaise)}</p></Card>
        <Card className="!p-3"><p className="text-xs text-slate-500">Savings</p><p className={`text-sm font-bold tabular-nums sm:text-base ${summary.savingsPaise < 0 ? "text-rose-600" : ""}`}>{formatPaise(summary.savingsPaise)}</p></Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="income" className="min-h-14 text-base" onClick={() => setForm({ type: "income", editing: null })}><Plus size={20} />Add Income</Button>
        <Button variant="expense" className="min-h-14 text-base" onClick={() => setForm({ type: "expense", editing: null })}><Minus size={20} />Add Expense</Button>
      </div>

      <Collapsible title="Monthly budget & savings" defaultOpen>
        <BudgetPanel key={JSON.stringify([settings.monthlyBudgetPaise, settings.monthlyIncomeTargetPaise, settings.savingsTargetPaise])} summary={summary} settings={settings} onSave={store.saveSettings} />
      </Collapsible>

      <Collapsible title="Analytics">
        <Analytics transactions={store.transactions} month={month} />
      </Collapsible>

      <TransactionList transactions={store.transactions} month={month} onEdit={(t) => setForm({ type: t.type, editing: t })} onDelete={store.deleteTransaction} />

      <Collapsible title={`Import bank SMS${store.importRecords.some((r) => r.importStatus === "review") ? " • review pending" : ""}`}>
        <SmsImport store={store} />
      </Collapsible>

      <Collapsible title="Settings, backup & install">
        <SettingsPanel store={store} />
      </Collapsible>

      <TransactionForm open={!!form} type={form?.type ?? "expense"} editing={form?.editing} onClose={() => setForm(null)} onSave={save} />
      <Onboarding open={!settings.firstLaunchCompleted} onDone={(p) => store.saveSettings({ openingBalancePaise: p, firstLaunchCompleted: true })} />
    </main>
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
