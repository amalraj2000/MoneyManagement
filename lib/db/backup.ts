import type { AppSettings, ImportRecord, Transaction } from "@/types";
import { isValidDate } from "@/lib/validation/transaction";
import type { BackupData } from "./storage";

export function buildBackup(settings: AppSettings, transactions: Transaction[], importRecords: ImportRecord[]): BackupData {
  return { app: "MoneyManagement", version: 1, exportedAt: new Date().toISOString(), settings, transactions, importRecords };
}

/** Validate an untrusted backup file. Throws Error with a readable message. */
export function parseBackup(json: string): BackupData {
  let d: unknown;
  try {
    d = JSON.parse(json);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const o = d as Partial<BackupData>;
  if (!o || o.app !== "MoneyManagement" || !Array.isArray(o.transactions) || !o.settings) {
    throw new Error("This is not a MoneyManagement backup file.");
  }
  for (const t of o.transactions) {
    if (
      !t || typeof t.id !== "string" ||
      (t.type !== "income" && t.type !== "expense") ||
      !Number.isSafeInteger(t.amountPaise) || t.amountPaise <= 0 ||
      typeof t.transactionDate !== "string" || !isValidDate(t.transactionDate)
    ) {
      throw new Error("Backup contains an invalid transaction.");
    }
  }
  return { ...(o as BackupData), importRecords: Array.isArray(o.importRecords) ? o.importRecords : [] };
}
