"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storage } from "@/lib/db/storage";
import { buildBackup, parseBackup } from "@/lib/db/backup";
import { calculateBalance, compareTx } from "@/lib/finance/calc";
import { txDuplicateKey } from "@/lib/sms-parser/duplicate";
import { DEFAULT_SETTINGS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type AppSettings, type ImportRecord, type Transaction } from "@/types";

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export function useStore() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, s, r] = await Promise.all([storage.getTransactions(), storage.getSettings(), storage.getImportRecords()]);
        if (cancelled) return;
        setTransactions(t.sort(compareTx));
        setSettings(s);
        setImportRecords(r);
      } catch {
        if (!cancelled) setError("Could not open local storage. Private browsing may block it.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTransactions = useCallback(async (list: NewTransaction[]) => {
    const now = new Date().toISOString();
    const full: Transaction[] = list.map((t) => ({ ...t, id: newId(), createdAt: now, updatedAt: now }));
    await storage.putTransactions(full);
    setTransactions((prev) => [...prev, ...full].sort(compareTx));
    return full;
  }, []);

  const updateTransaction = useCallback(async (t: Transaction) => {
    const next = { ...t, updatedAt: new Date().toISOString() };
    await storage.putTransaction(next);
    setTransactions((prev) => prev.map((x) => (x.id === t.id ? next : x)).sort(compareTx));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await storage.deleteTransaction(id);
    setTransactions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    let next!: AppSettings;
    setSettings((prev) => (next = { ...prev, ...patch }));
    await storage.saveSettings(next);
  }, []);

  const addImportRecords = useCallback(async (recs: ImportRecord[]) => {
    await storage.putImportRecords(recs);
    setImportRecords((prev) => [...prev, ...recs]);
  }, []);

  const removeImportRecord = useCallback(async (id: string) => {
    await storage.deleteImportRecord(id);
    setImportRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    setTransactions([]);
    setImportRecords([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify(buildBackup(settings, transactions, importRecords), null, 2),
    [settings, transactions, importRecords],
  );

  const importBackup = useCallback(async (json: string) => {
    const data = parseBackup(json);
    await storage.replaceAll(data);
    setTransactions([...data.transactions].sort(compareTx));
    setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    setImportRecords(data.importRecords);
  }, []);

  const categoriesFor = useCallback(
    (type: "income" | "expense") =>
      type === "income"
        ? settings.incomeCategories ?? [...INCOME_CATEGORIES, ...(settings.customIncomeCategories ?? [])]
        : settings.expenseCategories ?? [...EXPENSE_CATEGORIES, ...(settings.customExpenseCategories ?? [])],
    [settings],
  );
  const saveCategories = (type: "income" | "expense", list: string[]) =>
    saveSettings(type === "income" ? { incomeCategories: list } : { expenseCategories: list });

  /** Adds a category (case-insensitive de-dupe) and returns the canonical name. */
  const addCategory = useCallback(
    async (type: "income" | "expense", raw: string) => {
      const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!name) return null;
      const list = categoriesFor(type);
      const existing = list.find((c) => c.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      await saveCategories(type, [...list, name]);
      return name;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoriesFor, saveSettings],
  );

  /** Rename a category everywhere, including existing transactions. */
  const renameCategory = useCallback(
    async (type: "income" | "expense", oldName: string, raw: string) => {
      const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
      const list = categoriesFor(type);
      if (!name || name === oldName || list.some((c) => c !== oldName && c.toLowerCase() === name.toLowerCase())) return false;
      await saveCategories(type, list.map((c) => (c === oldName ? name : c)));
      const changed = transactions.filter((t) => t.type === type && t.category === oldName).map((t) => ({ ...t, category: name, updatedAt: new Date().toISOString() }));
      if (changed.length) {
        await storage.putTransactions(changed);
        setTransactions((prev) => prev.map((t) => changed.find((c) => c.id === t.id) ?? t));
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoriesFor, transactions],
  );

  /** Remove from the list. Existing transactions keep their category text. */
  const removeCategory = useCallback(
    async (type: "income" | "expense", name: string) => saveCategories(type, categoriesFor(type).filter((c) => c !== name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoriesFor],
  );

  const balancePaise = useMemo(() => calculateBalance(settings.openingBalancePaise, transactions), [settings, transactions]);
  const knownKeys = useMemo(
    () => [...transactions.map(txDuplicateKey), ...importRecords.filter((r) => r.importStatus === "imported").map((r) => r.duplicateKey)],
    [transactions, importRecords],
  );

  return {
    loading, error, transactions, settings, importRecords, balancePaise, knownKeys,
    categoriesFor, addCategory, renameCategory, removeCategory, addTransactions, updateTransaction, deleteTransaction, saveSettings,
    addImportRecords, removeImportRecord, clearAll, exportJson, importBackup,
  };
}
export type Store = ReturnType<typeof useStore>;
