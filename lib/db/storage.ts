import type { AppSettings, ImportRecord, Transaction } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

/** Storage abstraction – swap the implementation to sync with a backend later. */
export interface Storage {
  getTransactions(): Promise<Transaction[]>;
  putTransaction(t: Transaction): Promise<void>;
  putTransactions(t: Transaction[]): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  getSettings(): Promise<AppSettings>;
  saveSettings(s: AppSettings): Promise<void>;
  getImportRecords(): Promise<ImportRecord[]>;
  putImportRecords(r: ImportRecord[]): Promise<void>;
  deleteImportRecord(id: string): Promise<void>;
  clearAll(): Promise<void>;
  replaceAll(data: BackupData): Promise<void>;
}

export interface BackupData {
  app: "MoneyManagement";
  version: number;
  exportedAt: string;
  settings: AppSettings;
  transactions: Transaction[];
  importRecords: ImportRecord[];
}

export const DB_NAME = "moneymanagement";
export const DB_VERSION = 1;
const STORES = ["transactions", "settings", "importRecords"] as const;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export class IndexedDbStorage implements Storage {
  private dbp: Promise<IDBDatabase> | null = null;
  constructor(private name = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const open = indexedDB.open(this.name, DB_VERSION);
        open.onupgradeneeded = (e) => {
          const db = open.result;
          // Versioned migrations: add `if (e.oldVersion < N)` blocks for future schema changes.
          if (e.oldVersion < 1) {
            const tx = db.createObjectStore("transactions", { keyPath: "id" });
            tx.createIndex("by_date", "transactionDate");
            db.createObjectStore("settings");
            const imp = db.createObjectStore("importRecords", { keyPath: "id" });
            imp.createIndex("by_key", "duplicateKey");
          }
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
    }
    return this.dbp;
  }

  async getTransactions() {
    const db = await this.db();
    return req(db.transaction("transactions").objectStore("transactions").getAll() as IDBRequest<Transaction[]>);
  }
  async putTransaction(t: Transaction) {
    await this.putTransactions([t]);
  }
  async putTransactions(list: Transaction[]) {
    const db = await this.db();
    const tx = db.transaction("transactions", "readwrite");
    list.forEach((t) => tx.objectStore("transactions").put(t));
    await done(tx);
  }
  async deleteTransaction(id: string) {
    const db = await this.db();
    const tx = db.transaction("transactions", "readwrite");
    tx.objectStore("transactions").delete(id);
    await done(tx);
  }
  async getSettings() {
    const db = await this.db();
    const s = await req(db.transaction("settings").objectStore("settings").get("app") as IDBRequest<AppSettings | undefined>);
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  }
  async saveSettings(s: AppSettings) {
    const db = await this.db();
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put(s, "app");
    await done(tx);
  }
  async getImportRecords() {
    const db = await this.db();
    return req(db.transaction("importRecords").objectStore("importRecords").getAll() as IDBRequest<ImportRecord[]>);
  }
  async putImportRecords(list: ImportRecord[]) {
    const db = await this.db();
    const tx = db.transaction("importRecords", "readwrite");
    list.forEach((r) => tx.objectStore("importRecords").put(r));
    await done(tx);
  }
  async deleteImportRecord(id: string) {
    const db = await this.db();
    const tx = db.transaction("importRecords", "readwrite");
    tx.objectStore("importRecords").delete(id);
    await done(tx);
  }
  async clearAll() {
    const db = await this.db();
    const tx = db.transaction([...STORES], "readwrite");
    STORES.forEach((s) => tx.objectStore(s).clear());
    await done(tx);
  }
  async replaceAll(data: BackupData) {
    const db = await this.db();
    const tx = db.transaction([...STORES], "readwrite");
    STORES.forEach((s) => tx.objectStore(s).clear());
    data.transactions.forEach((t) => tx.objectStore("transactions").put(t));
    data.importRecords.forEach((r) => tx.objectStore("importRecords").put(r));
    tx.objectStore("settings").put({ ...DEFAULT_SETTINGS, ...data.settings }, "app");
    await done(tx);
  }
}

export const storage: Storage = new IndexedDbStorage();
