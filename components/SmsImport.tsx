"use client";
import { useState } from "react";
import { Button, Field, cx, inputCls } from "./ui";
import { parseBankSms, splitMessages } from "@/lib/sms-parser";
import { duplicateKey, isDuplicate } from "@/lib/sms-parser/duplicate";
import { formatPaise, paiseToInput, parseRupeesToPaise } from "@/lib/finance/money";
import { isValidDate, isValidTime } from "@/lib/validation/transaction";
import { newId, type Store } from "@/hooks/useStore";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type ImportRecord, type ParsedSms } from "@/types";

interface Row {
  id: string;
  parsed: ParsedSms;
  type: "income" | "expense" | "";
  amount: string;
  date: string;
  time: string;
  merchant: string;
  category: string;
  duplicate: boolean;
  include: boolean;
}

function toRow(p: ParsedSms, store: Store, seen: string[]): Row {
  const dup = p.status !== "ignored" && p.amountPaise !== null && isDuplicate(p, store.transactions, [...store.knownKeys, ...seen]);
  return {
    id: newId(), parsed: p, type: p.type ?? "", amount: p.amountPaise ? paiseToInput(p.amountPaise) : "",
    date: p.date ?? "", time: p.time ?? "", merchant: p.merchant ?? "",
    category: p.type === "income" ? INCOME_CATEGORIES[3] : EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1],
    duplicate: dup, include: p.status === "ok" && !dup,
  };
}

function rowIssue(r: Row): string | null {
  if (!r.type) return "Choose credit or debit";
  if (!parseRupeesToPaise(r.amount)) return "Invalid amount";
  if (!isValidDate(r.date)) return "Date needed";
  if (r.time && !isValidTime(r.time)) return "Invalid time";
  return null;
}

export function SmsImport({ store }: { store: Store }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [ignored, setIgnored] = useState<{ msg: string; reason: string }[]>([]);
  const [msg, setMsg] = useState("");

  function preview(texts: string[]) {
    const seen: string[] = [];
    const nextRows: Row[] = [];
    const ign: { msg: string; reason: string }[] = [];
    for (const m of texts) {
      const p = parseBankSms(m);
      if (p.status === "ignored") { ign.push({ msg: p.originalMessage.slice(0, 80), reason: p.reason ?? "Not a transaction" }); continue; }
      const r = toRow(p, store, seen);
      seen.push(duplicateKey(p));
      nextRows.push(r);
    }
    setRows(nextRows); setIgnored(ign);
    setMsg(nextRows.length || ign.length ? "" : "Paste at least one message.");
  }

  const upd = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function confirmImport() {
    const chosen = rows.filter((r) => r.include && !r.duplicate);
    const bad = chosen.find((r) => rowIssue(r));
    if (bad) return setMsg(`Fix "${bad.parsed.originalMessage.slice(0, 40)}…": ${rowIssue(bad)}`);
    const now = new Date().toISOString();
    const records: ImportRecord[] = [];
    const txs = chosen.map((r) => {
      const amountPaise = parseRupeesToPaise(r.amount)!;
      const p: ParsedSms = { ...r.parsed, type: r.type as "income" | "expense", amountPaise, date: r.date, time: r.time || null, merchant: r.merchant || null };
      records.push({ id: newId(), source: "sms_import", originalMessage: p.originalMessage, parsedTransaction: p, importStatus: "imported", duplicateKey: duplicateKey(p), createdAt: now });
      return {
        type: r.type as "income" | "expense", amountPaise, category: r.category,
        description: r.merchant || p.bankName || (r.type === "income" ? "Bank credit" : "Bank debit"),
        merchant: r.merchant || null, transactionDate: r.date, transactionTime: r.time || null,
        paymentMethod: "Bank", source: "sms_import" as const, bankName: p.bankName, accountLastFour: p.accountLastFour,
        referenceNumber: p.referenceNumber, originalMessage: p.originalMessage, notes: null,
      };
    });
    // Unchecked, non-duplicate rows go to the review list (no balance change).
    for (const r of rows.filter((r) => !r.include && !r.duplicate)) {
      records.push({ id: newId(), source: "sms_import", originalMessage: r.parsed.originalMessage, parsedTransaction: r.parsed, importStatus: "review", duplicateKey: duplicateKey(r.parsed), createdAt: now });
    }
    try {
      if (txs.length) await store.addTransactions(txs);
      if (records.length) await store.addImportRecords(records);
      const toReview = records.filter((r) => r.importStatus === "review").length;
      setMsg(`Imported ${txs.length} transaction(s)${toReview ? `, ${toReview} sent to review` : ""}.`);
      setRows([]); setIgnored([]); setText("");
    } catch { setMsg("Import failed. Nothing was changed."); }
  }

  const review = store.importRecords.filter((r) => r.importStatus === "review");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Paste bank SMS messages (separate with a blank line). Parsing happens on your device; messages are never uploaded. A browser app cannot read your SMS automatically.
      </p>
      <Field label="Bank SMS messages">
        <textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your account has been debited by INR 450.00 at XYZ STORE on 26-Nov-2026." />
      </Field>
      <Button className="w-full" onClick={() => preview(splitMessages(text))} disabled={!text.trim()}>Preview</Button>
      {msg && <p role="status" className="text-sm font-medium">{msg}</p>}

      {rows.map((r) => {
        const issue = rowIssue(r);
        return (
          <div key={r.id} className={cx("space-y-2 rounded-xl border p-3 text-sm", r.duplicate ? "border-amber-400 bg-amber-50 dark:bg-amber-950" : "border-slate-200 dark:border-slate-700")}>
            <p className="break-words text-xs text-slate-500">{r.parsed.originalMessage}</p>
            {r.duplicate && <p className="font-semibold text-amber-700 dark:text-amber-300">Already imported – will be skipped.</p>}
            {r.parsed.reason && !r.duplicate && <p className="text-amber-700 dark:text-amber-300">{r.parsed.reason}</p>}
            {!r.duplicate && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="Type" className={inputCls} value={r.type} onChange={(e) => upd(r.id, { type: e.target.value as Row["type"], category: e.target.value === "income" ? INCOME_CATEGORIES[3] : EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1] })}>
                    <option value="">Type?</option><option value="income">Credit (income)</option><option value="expense">Debit (expense)</option>
                  </select>
                  <input aria-label="Amount" className={inputCls} inputMode="decimal" value={r.amount} onChange={(e) => upd(r.id, { amount: e.target.value })} />
                  <input aria-label="Date" type="date" className={inputCls} value={r.date} onChange={(e) => upd(r.id, { date: e.target.value })} />
                  <input aria-label="Time" type="time" className={inputCls} value={r.time} onChange={(e) => upd(r.id, { time: e.target.value })} />
                  <input aria-label="Merchant" className={cx(inputCls, "col-span-2")} placeholder="Merchant / sender" value={r.merchant} onChange={(e) => upd(r.id, { merchant: e.target.value })} />
                  <select aria-label="Category" className={cx(inputCls, "col-span-2")} value={r.category} onChange={(e) => upd(r.id, { category: e.target.value })}>
                    {(r.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <label className="flex min-h-10 items-center gap-2">
                  <input type="checkbox" className="size-5" checked={r.include} onChange={(e) => upd(r.id, { include: e.target.checked })} />
                  Import this transaction {r.amount && parseRupeesToPaise(r.amount) ? `(${formatPaise(parseRupeesToPaise(r.amount)!)})` : ""}
                </label>
                {r.include && issue && <p className="text-red-600">{issue}</p>}
              </>
            )}
          </div>
        );
      })}
      {ignored.length > 0 && (
        <details className="text-sm"><summary className="cursor-pointer">{ignored.length} message(s) ignored</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-500">{ignored.map((i, k) => <li key={k}>{i.reason}: {i.msg}…</li>)}</ul>
        </details>
      )}
      {rows.length > 0 && <Button variant="income" className="w-full" onClick={confirmImport}>Confirm import</Button>}
      {rows.length > 0 && <p className="text-xs text-slate-500">Unchecked messages are saved to the review list and do not change your balance.</p>}

      {review.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Needs review ({review.length})</h3>
          <ul className="space-y-2">
            {review.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="break-words text-xs text-slate-500">{r.originalMessage}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={async () => { await store.removeImportRecord(r.id); preview([r.originalMessage]); }}>Review now</Button>
                  <Button variant="ghost" className="flex-1" onClick={() => store.removeImportRecord(r.id)}>Dismiss</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
