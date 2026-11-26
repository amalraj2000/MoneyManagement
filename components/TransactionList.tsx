"use client";
import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { categoryStyle } from "./categoryStyle";
import { Button, Card, Sheet, cx, inputCls } from "./ui";
import { formatPaise } from "@/lib/finance/money";
import { monthKey } from "@/lib/finance/calc";
import type { Transaction } from "@/types";

const PAGE = 15;

export function TransactionList({
  transactions, month, onEdit, onDelete,
}: { transactions: Transaction[]; month: string; onEdit: (t: Transaction) => void; onDelete: (id: string) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [cat, setCat] = useState("all");
  const [allMonths, setAllMonths] = useState(false);
  const [oldest, setOldest] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [confirmDel, setConfirmDel] = useState<Transaction | null>(null);

  const cats = useMemo(() => [...new Set(transactions.map((t) => t.category))].sort(), [transactions]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = transactions.filter(
      (t) =>
        (allMonths || monthKey(t.transactionDate) === month) &&
        (type === "all" || t.type === type) &&
        (cat === "all" || t.category === cat) &&
        (!s || [t.description, t.merchant, t.category, t.notes, t.paymentMethod, t.bankName].some((f) => f?.toLowerCase().includes(s))),
    );
    return oldest ? [...list].reverse() : list;
  }, [transactions, q, type, cat, month, allMonths, oldest]);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Recent Transactions</h2>
      <div className="relative mb-2">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input aria-label="Search transactions" className={cx(inputCls, "pl-10")} placeholder="Search transactions" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
      </div>
      <details className="mb-3"><summary className="cursor-pointer text-sm font-medium text-blue-600">Filters &amp; sort</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select aria-label="Filter by type" className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <select aria-label="Filter by category" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter by month" className={inputCls} value={allMonths ? "all" : "sel"} onChange={(e) => setAllMonths(e.target.value === "all")}>
          <option value="sel">Selected month</option><option value="all">All months</option>
        </select>
        <select aria-label="Sort order" className={inputCls} value={oldest ? "old" : "new"} onChange={(e) => setOldest(e.target.value === "old")}>
          <option value="new">Newest first</option><option value="old">Oldest first</option>
        </select>
      </div>
      </details>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No transactions found. Add income or an expense to get started.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, shown).map((t) => {
            const { Icon, gradient } = categoryStyle(t.category);
            return (
            <li key={t.id}>
              <button onClick={() => setDetail(t)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition active:scale-[.99] dark:bg-slate-800/60">
                <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm", gradient)}>
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.description}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {t.category} · {t.transactionDate}{t.transactionTime ? ` ${t.transactionTime}` : ""}{t.bankName || t.paymentMethod ? ` · ${t.bankName ?? t.paymentMethod}` : ""}
                  </span>
                </span>
                <span className={cx("shrink-0 font-mono text-sm font-bold tabular-nums", t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {t.type === "income" ? "+" : "−"}{formatPaise(t.amountPaise)}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      )}
      {filtered.length > shown && <Button variant="ghost" className="mt-3 w-full" onClick={() => setShown((n) => n + PAGE)}>Load more ({filtered.length - shown} left)</Button>}

      <Sheet open={!!detail} title="Transaction details" onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3 text-sm">
            <p className={cx("text-3xl font-bold", detail.type === "income" ? "text-emerald-600" : "text-rose-600")}>
              {detail.type === "income" ? "+" : "−"}{formatPaise(detail.amountPaise)}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {([
                ["Type", detail.type], ["Description", detail.description], ["Category", detail.category],
                ["Date", detail.transactionDate], ["Time", detail.transactionTime], ["Payment", detail.paymentMethod],
                ["Bank", detail.bankName], ["Account", detail.accountLastFour && `••${detail.accountLastFour}`],
                ["Reference", detail.referenceNumber], ["Source", detail.source], ["Notes", detail.notes],
              ] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="break-words">{v}</dd></div>
              ))}
            </dl>
            {detail.originalMessage && <p className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">{detail.originalMessage}</p>}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => { const t = detail; setDetail(null); onEdit(t); }}><Pencil size={16} />Edit</Button>
              <Button variant="danger" className="flex-1" onClick={() => { setConfirmDel(detail); setDetail(null); }}><Trash2 size={16} />Delete</Button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!confirmDel} title="Delete transaction?" onClose={() => setConfirmDel(null)}>
        <p className="mb-4 text-sm">
          “{confirmDel?.description}” ({confirmDel && formatPaise(confirmDel.amountPaise)}) will be removed and your balance recalculated. This can’t be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={async () => { if (confirmDel) await onDelete(confirmDel.id); setConfirmDel(null); }}>Delete</Button>
        </div>
      </Sheet>
    </Card>
  );
}
