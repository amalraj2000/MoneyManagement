import { describe, expect, it } from "vitest";
import { calculateBalance, summarizeMonth, categoryBreakdown } from "@/lib/finance/calc";
import { formatPaise, parseRupeesToPaise } from "@/lib/finance/money";
import { DEFAULT_SETTINGS, type Transaction } from "@/types";

const tx = (o: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), type: "expense", amountPaise: 100, category: "Food", description: "x",
  transactionDate: "2026-11-10", source: "manual", createdAt: "", updatedAt: "", ...o,
});

describe("balance", () => {
  it("opening + income - expense, each counted once", () => {
    const list = [tx({ type: "income", amountPaise: 2500000 }), tx({ amountPaise: 45000 })];
    expect(calculateBalance(1000000, list)).toBe(3455000);
  });
  it("recalculates after delete/edit", () => {
    const a = tx({ type: "income", amountPaise: 500 });
    const b = tx({ amountPaise: 200 });
    expect(calculateBalance(0, [a, b])).toBe(300);
    expect(calculateBalance(0, [a])).toBe(500);
    expect(calculateBalance(0, [a, { ...b, amountPaise: 400 }])).toBe(100);
  });
});

describe("monthly summary", () => {
  const list = [
    tx({ type: "income", amountPaise: 100000 }),
    tx({ amountPaise: 40000 }),
    tx({ amountPaise: 99900, transactionDate: "2026-10-30" }),
  ];
  const s = { ...DEFAULT_SETTINGS, monthlyBudgetPaise: 30000, savingsTargetPaise: 100000 };
  it("only counts selected month", () => {
    const m = summarizeMonth(list, "2026-11", s);
    expect(m.incomePaise).toBe(100000);
    expect(m.expensePaise).toBe(40000);
    expect(m.savingsPaise).toBe(60000);
    expect(m.spentPercentOfIncome).toBe(40);
    expect(m.overBudget).toBe(true);
    expect(m.savingsProgressPercent).toBe(60);
  });
  it("category breakdown", () => {
    expect(categoryBreakdown(list, "2026-11")).toEqual([{ name: "Food", paise: 40000 }]);
  });
});

describe("money", () => {
  it("formats and parses", () => {
    expect(formatPaise(2500000)).toBe("₹25,000.00");
    expect(parseRupeesToPaise("₹1,234.5")).toBe(123450);
    expect(parseRupeesToPaise("0.29")).toBe(29);
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("1.234")).toBeNull();
  });
});
