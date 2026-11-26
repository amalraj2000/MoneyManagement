"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryBreakdown, dailySpending, largestExpenses, monthlyTrend } from "@/lib/finance/calc";
import { formatCompact, formatPaise } from "@/lib/finance/money";
import type { Transaction } from "@/types";

const COLORS = ["#e11d48", "#f97316", "#eab308", "#8b5cf6", "#0ea5e9", "#14b8a6", "#64748b", "#ec4899"];
const tip = (v: unknown) => formatPaise(Number(v));

export function Analytics({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const trend = monthlyTrend(transactions, month, 6);
  const cats = categoryBreakdown(transactions, month);
  const daily = dailySpending(transactions, month);
  const top = largestExpenses(transactions, month);
  const empty = transactions.length === 0;
  if (empty) return <p className="py-4 text-center text-sm text-slate-500">Charts appear once you add transactions.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Income vs expenses (6 months)</h3>
        <div className="h-48" role="img" aria-label="Bar chart of income versus expenses by month">
          <ResponsiveContainer>
            <BarChart data={trend} margin={{ left: -10, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={tip} />
              <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Spending by category</h3>
        {cats.length === 0 ? <p className="text-sm text-slate-500">No spending this month.</p> : (
          <div className="flex items-center gap-3">
            <div className="h-36 w-36 shrink-0" role="img" aria-label="Pie chart of spending by category">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={cats} dataKey="paise" nameKey="name" innerRadius={30} outerRadius={64}>
                    {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1 text-sm">
              {cats.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular-nums">{formatPaise(c.paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Daily spending</h3>
        <div className="h-32" role="img" aria-label="Bar chart of daily spending">
          <ResponsiveContainer>
            <BarChart data={daily} margin={{ left: -10, right: 4 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10 }} width={50} />
              <Tooltip formatter={tip} labelFormatter={(d) => `Day ${d}`} />
              <Bar dataKey="paise" name="Spent" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Monthly savings trend</h3>
        <div className="h-36" role="img" aria-label="Line chart of monthly savings">
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={tip} />
              <Line type="monotone" dataKey="savings" name="Savings" stroke="#0ea5e9" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Largest expenses this month</h3>
        {top.length === 0 ? <p className="text-sm text-slate-500">No expenses this month.</p> : (
          <ol className="space-y-1 text-sm">
            {top.map((t) => (
              <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.description}</span><span className="tabular-nums text-rose-600">{formatPaise(t.amountPaise)}</span></li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
