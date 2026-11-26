"use client";
import { useState } from "react";
import { Button, Field, Sheet, inputCls } from "./ui";
import { CategorySelect } from "./CategorySelect";
import { parseRupeesToPaise, paiseToInput } from "@/lib/finance/money";
import { todayISO } from "@/lib/finance/calc";
import { isValidDate, isValidTime, sanitizeText } from "@/lib/validation/transaction";
import { PAYMENT_METHODS, type Transaction, type TransactionType } from "@/types";
import type { NewTransaction } from "@/hooks/useStore";

interface Props {
  open: boolean;
  type: TransactionType;
  editing?: Transaction | null;
  onClose: () => void;
  onSave: (t: NewTransaction, editing?: Transaction | null) => Promise<void>;
  categories: string[];
  onAddCategory: (name: string) => Promise<string | null>;
}

export function TransactionForm(props: Props) {
  // Remount the inner form whenever it opens/changes target so state initialises fresh.
  return (
    <Sheet open={props.open} title={`${props.editing ? "Edit" : "Add"} ${props.type === "income" ? "Income" : "Expense"}`} onClose={props.onClose}>
      <Inner key={`${props.type}-${props.editing?.id ?? "new"}`} {...props} />
    </Sheet>
  );
}

function Inner({ type, editing, onClose, onSave, categories: cats, onAddCategory }: Props) {
  const e = editing;
  const [amount, setAmount] = useState(e ? paiseToInput(e.amountPaise) : "");
  const [category, setCategory] = useState(e?.category ?? cats[0]);
  const [desc, setDesc] = useState(e?.description ?? "");
  const [date, setDate] = useState(e?.transactionDate ?? todayISO());
  const [time, setTime] = useState(e?.transactionTime ?? "");
  const [method, setMethod] = useState(e?.paymentMethod ?? (type === "expense" ? "UPI" : "Bank transfer"));
  const [notes, setNotes] = useState(e?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (saving) return; // prevent duplicate submissions
    const errs: Record<string, string> = {};
    const paise = parseRupeesToPaise(amount);
    if (!paise || paise <= 0) errs.amount = "Enter a valid amount greater than 0 (max 2 decimals).";
    if (!isValidDate(date)) errs.date = "Enter a valid date.";
    if (time && !isValidTime(time)) errs.time = "Enter a valid time.";
    if (!desc.trim()) errs.desc = type === "income" ? "Enter the income source." : "Enter a description or merchant.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await onSave(
        {
          type,
          amountPaise: paise!,
          category,
          description: sanitizeText(desc, 120),
          merchant: type === "expense" ? sanitizeText(desc, 120) : null,
          transactionDate: date,
          transactionTime: time || null,
          paymentMethod: method,
          source: e?.source ?? "manual",
          bankName: e?.bankName ?? null,
          accountLastFour: e?.accountLastFour ?? null,
          referenceNumber: e?.referenceNumber ?? null,
          originalMessage: e?.originalMessage ?? null,
          notes: sanitizeText(notes, 500) || null,
        },
        e,
      );
      onClose();
    } catch {
      setErrors({ form: "Could not save. Please try again." });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Amount (₹)" error={errors.amount}>
        <input className={inputCls} inputMode="decimal" autoFocus placeholder="0.00" value={amount} onChange={(x) => setAmount(x.target.value)} />
      </Field>
      <Field label={type === "income" ? "Income source" : "Description / merchant"} error={errors.desc}>
        <input className={inputCls} value={desc} maxLength={120} onChange={(x) => setDesc(x.target.value)} />
      </Field>
      <Field label="Category">
        <CategorySelect value={category} categories={cats} onChange={setCategory} onAdd={onAddCategory} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={errors.date}>
          <input type="date" className={inputCls} value={date} onChange={(x) => setDate(x.target.value)} />
        </Field>
        <Field label="Time (optional)" error={errors.time}>
          <input type="time" className={inputCls} value={time} onChange={(x) => setTime(x.target.value)} />
        </Field>
      </div>
      <Field label="Payment method">
        <select className={inputCls} value={method} onChange={(x) => setMethod(x.target.value)}>
          {[...new Set([...PAYMENT_METHODS, method])].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Notes (optional)">
        <textarea className={inputCls} rows={2} value={notes} maxLength={500} onChange={(x) => setNotes(x.target.value)} />
      </Field>
      {errors.form && <p role="alert" className="text-sm text-red-600">{errors.form}</p>}
      <Button type="submit" variant={type} className="w-full" disabled={saving}>
        {saving ? "Saving…" : editing ? "Save changes" : type === "income" ? "Add income" : "Add expense"}
      </Button>
    </form>
  );
}
