import type { AppSettings, Transaction } from "@/types";

export const signed = (t: Pick<Transaction, "type" | "amountPaise">) =>
  t.type === "income" ? t.amountPaise : -t.amountPaise;

/** Single source of truth: opening balance + all income − all expenses. Each transaction counted once. */
export function calculateBalance(openingBalancePaise: number, txs: Transaction[]): number {
  return txs.reduce((sum, t) => sum + signed(t), openingBalancePaise);
}

export const monthKey = (date: string) => date.slice(0, 7); // YYYY-MM

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(d);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function todayISO(now = new Date()): string {
  return `${currentMonthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

export interface MonthlySummary {
  incomePaise: number;
  expensePaise: number;
  savingsPaise: number;
  /** % of income spent (0 if no income) */
  spentPercentOfIncome: number;
  budgetUsedPercent: number | null;
  overBudget: boolean;
  savingsProgressPercent: number | null;
}

export function summarizeMonth(txs: Transaction[], month: string, settings: AppSettings): MonthlySummary {
  let incomePaise = 0;
  let expensePaise = 0;
  for (const t of txs) {
    if (monthKey(t.transactionDate) !== month) continue;
    if (t.type === "income") incomePaise += t.amountPaise;
    else expensePaise += t.amountPaise;
  }
  const savingsPaise = incomePaise - expensePaise;
  const budget = settings.monthlyBudgetPaise;
  return {
    incomePaise,
    expensePaise,
    savingsPaise,
    spentPercentOfIncome: incomePaise > 0 ? (expensePaise / incomePaise) * 100 : 0,
    budgetUsedPercent: budget > 0 ? (expensePaise / budget) * 100 : null,
    overBudget: budget > 0 && expensePaise > budget,
    savingsProgressPercent:
      settings.savingsTargetPaise > 0 ? (Math.max(savingsPaise, 0) / settings.savingsTargetPaise) * 100 : null,
  };
}

export function categoryBreakdown(txs: Transaction[], month: string, type: "expense" | "income" = "expense") {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type || monthKey(t.transactionDate) !== month) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountPaise);
  }
  return [...map.entries()].map(([name, paise]) => ({ name, paise })).sort((a, b) => b.paise - a.paise);
}

export function dailySpending(txs: Transaction[], month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const arr = Array.from({ length: days }, (_, i) => ({ day: i + 1, paise: 0 }));
  for (const t of txs) {
    if (t.type !== "expense" || monthKey(t.transactionDate) !== month) continue;
    arr[Number(t.transactionDate.slice(8, 10)) - 1].paise += t.amountPaise;
  }
  return arr;
}

/** Last `count` months ending at `endMonth`. */
export function monthlyTrend(txs: Transaction[], endMonth: string, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonth(endMonth, i - (count - 1));
    const s = summarizeMonth(txs, key, { monthlyBudgetPaise: 0, savingsTargetPaise: 0 } as AppSettings);
    return { key, label: monthLabel(key).slice(0, 3), income: s.incomePaise, expense: s.expensePaise, savings: s.savingsPaise };
  });
}

export function largestExpenses(txs: Transaction[], month: string, n = 5) {
  return txs
    .filter((t) => t.type === "expense" && monthKey(t.transactionDate) === month)
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, n);
}

export function compareTx(a: Transaction, b: Transaction): number {
  return (
    b.transactionDate.localeCompare(a.transactionDate) ||
    (b.transactionTime ?? "").localeCompare(a.transactionTime ?? "") ||
    b.createdAt.localeCompare(a.createdAt)
  );
}
