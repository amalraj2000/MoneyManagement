"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Field, Progress, inputCls } from "./ui";
import { formatPaise, paiseToInput, parseRupeesToPaise } from "@/lib/finance/money";
import type { MonthlySummary } from "@/lib/finance/calc";
import type { AppSettings } from "@/types";

export function BudgetPanel({ summary, settings, onSave }: { summary: MonthlySummary; settings: AppSettings; onSave: (p: Partial<AppSettings>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [inc, setInc] = useState(paiseToInput(settings.monthlyIncomeTargetPaise));
  const [bud, setBud] = useState(paiseToInput(settings.monthlyBudgetPaise));
  const [sav, setSav] = useState(paiseToInput(settings.savingsTargetPaise));
  const [err, setErr] = useState("");

  async function save() {
    const vals = [inc, bud, sav].map((v) => (v.trim() === "" ? 0 : parseRupeesToPaise(v)));
    if (vals.some((v) => v === null)) return setErr("Enter valid amounts.");
    await onSave({ monthlyIncomeTargetPaise: vals[0]!, monthlyBudgetPaise: vals[1]!, savingsTargetPaise: vals[2]! });
    setErr("");
    setEditing(false);
  }

  const incomeTarget = settings.monthlyIncomeTargetPaise;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Remaining from income</dt><dd className="text-lg font-semibold">{formatPaise(summary.savingsPaise)}</dd></div>
        <div><dt className="text-slate-500">Income spent</dt><dd className="text-lg font-semibold">{summary.spentPercentOfIncome.toFixed(0)}%</dd></div>
      </dl>
      {summary.overBudget && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> You are {formatPaise(summary.expensePaise - settings.monthlyBudgetPaise)} over your monthly budget.
        </p>
      )}
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>Spending vs budget</span><span>{settings.monthlyBudgetPaise ? `${formatPaise(summary.expensePaise)} / ${formatPaise(settings.monthlyBudgetPaise)}` : "No budget set"}</span></div>
        <Progress percent={summary.budgetUsedPercent ?? 0} over={summary.overBudget} color="bg-orange-500" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>Savings vs target</span><span>{settings.savingsTargetPaise ? `${formatPaise(Math.max(summary.savingsPaise, 0))} / ${formatPaise(settings.savingsTargetPaise)}` : "No target set"}</span></div>
        <Progress percent={summary.savingsProgressPercent ?? 0} />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>Income vs target</span><span>{incomeTarget ? `${formatPaise(summary.incomePaise)} / ${formatPaise(incomeTarget)}` : "No target set"}</span></div>
        <Progress percent={incomeTarget ? (summary.incomePaise / incomeTarget) * 100 : 0} />
      </div>
      {editing ? (
        <div className="space-y-3">
          <Field label="Monthly income target (₹)"><input className={inputCls} inputMode="decimal" value={inc} onChange={(e) => setInc(e.target.value)} /></Field>
          <Field label="Monthly spending budget (₹)"><input className={inputCls} inputMode="decimal" value={bud} onChange={(e) => setBud(e.target.value)} /></Field>
          <Field label="Savings target (₹, optional)" error={err}><input className={inputCls} inputMode="decimal" value={sav} onChange={(e) => setSav(e.target.value)} /></Field>
          <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button><Button className="flex-1" onClick={save}>Save</Button></div>
        </div>
      ) : <Button variant="ghost" onClick={() => setEditing(true)}>Edit targets</Button>}
    </div>
  );
}
