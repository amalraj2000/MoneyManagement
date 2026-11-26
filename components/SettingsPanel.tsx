"use client";
import { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { Button, Field, Sheet, inputCls } from "./ui";
import { InstallGuide } from "./InstallGuide";
import { formatPaise, paiseToInput, parseRupeesToPaise } from "@/lib/finance/money";
import { todayISO } from "@/lib/finance/calc";
import type { Store } from "@/hooks/useStore";

export function SettingsPanel({ store }: { store: Store }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [ob, setOb] = useState(paiseToInput(store.settings.openingBalancePaise));
  const [msg, setMsg] = useState("");

  function download() {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `moneymanagement-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Backup downloaded.");
  }

  async function restore(f: File | undefined) {
    if (!f) return;
    if (!confirm("Restoring replaces ALL current data with the backup. Continue?")) return;
    try {
      await store.importBackup(await f.text());
      setMsg("Backup restored.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Restore failed.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveOb() {
    const p = ob.trim() === "" ? 0 : parseRupeesToPaise(ob);
    if (p === null) return setMsg("Enter a valid opening balance.");
    await store.saveSettings({ openingBalancePaise: p });
    setMsg(`Opening balance set to ${formatPaise(p)}.`);
  }

  async function demo() {
    const d = todayISO().slice(0, 8);
    await store.addTransactions([
      { type: "income", amountPaise: 6000000, category: "Salary", description: "Demo salary", transactionDate: `${d}01`, paymentMethod: "Bank transfer", source: "manual" },
      { type: "expense", amountPaise: 1500000, category: "Rent", description: "Demo rent", transactionDate: `${d}02`, paymentMethod: "UPI", source: "manual" },
      { type: "expense", amountPaise: 45000, category: "Food", description: "Demo groceries", transactionDate: `${d}03`, paymentMethod: "UPI", source: "manual" },
      { type: "expense", amountPaise: 19900, category: "Subscriptions", description: "Demo streaming", transactionDate: `${d}04`, paymentMethod: "Credit card", source: "manual" },
    ]);
    setMsg("Demo transactions added (delete them anytime).");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-2">
        <div className="flex-1"><Field label="Opening balance (₹)"><input className={inputCls} inputMode="decimal" value={ob} onChange={(e) => setOb(e.target.value)} /></Field></div>
        <Button variant="ghost" onClick={saveOb}>Save</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={download}><Download size={16} />Export data</Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={16} />Import backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </div>
      <Button variant="ghost" className="w-full" onClick={demo}>Add optional demo data</Button>
      {msg && <p role="status" className="text-sm font-medium">{msg}</p>}
      <p className="text-xs text-slate-500">
        Privacy: all data lives only in this browser’s IndexedDB. Nothing is uploaded and there is no analytics. Data does not sync between devices — your iPhone and Android keep separate databases; use Export/Import backup to move data.
      </p>
      <InstallGuide />
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}><Trash2 size={16} />Clear all data</Button>
      <Sheet open={open} title="Clear all data?" onClose={() => { setOpen(false); setConfirmText(""); }}>
        <p className="mb-3 text-sm">This permanently deletes every transaction, setting and import record on this device. Export a backup first. Type <b>DELETE</b> to confirm.</p>
        <input aria-label="Type DELETE to confirm" className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <Button variant="danger" className="mt-3 w-full" disabled={confirmText !== "DELETE"} onClick={async () => { await store.clearAll(); setOpen(false); setConfirmText(""); }}>Delete everything</Button>
      </Sheet>
    </div>
  );
}
