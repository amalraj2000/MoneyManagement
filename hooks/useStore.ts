"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storage } from "@/lib/db/storage";
import { buildBackup, parseBackup } from "@/lib/db/backup";
import { calculateBalance, compareTx } from "@/lib/finance/calc";
import { txDuplicateKey } from "@/lib/sms-parser/duplicate";
import { DEFAULT_SETTINGS, type AppSettings, type ImportRecord, type Transaction } from "@/types";

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

  const balancePaise = useMemo(() => calculateBalance(settings.openingBalancePaise, transactions), [settings, transactions]);
  const knownKeys = useMemo(
    () => [...transactions.map(txDuplicateKey), ...importRecords.filter((r) => r.importStatus === "imported").map((r) => r.duplicateKey)],
    [transactions, importRecords],
  );

  return {
    loading, error, transactions, settings, importRecords, balancePaise, knownKeys,
    addTransactions, updateTransaction, deleteTransaction, saveSettings,
    addImportRecords, removeImportRecord, clearAll, exportJson, importBackup,
  };
}
export type Store = ReturnType<typeof useStore>;
