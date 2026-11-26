import type { ParsedSms, Transaction } from "@/types";

/** Stable key for a transaction used to detect repeat imports. */
export function duplicateKey(p: {
  type: string | null;
  amountPaise: number | null;
  date: string | null;
  time?: string | null;
  merchant?: string | null;
  referenceNumber?: string | null;
  accountLastFour?: string | null;
  bankName?: string | null;
}): string {
  const acct = `${(p.bankName ?? "").toLowerCase()}|${p.accountLastFour ?? ""}`;
  if (p.referenceNumber) return `ref:${acct}|${p.referenceNumber.toLowerCase()}|${p.amountPaise}`;
  return `fp:${acct}|${p.type}|${p.amountPaise}|${p.date}|${p.time ?? ""}|${(p.merchant ?? "").toLowerCase().replace(/\s+/g, " ")}`;
}

export function txDuplicateKey(t: Transaction): string {
  return duplicateKey({
    type: t.type,
    amountPaise: t.amountPaise,
    date: t.transactionDate,
    time: t.transactionTime,
    merchant: t.merchant,
    referenceNumber: t.referenceNumber,
    accountLastFour: t.accountLastFour,
    bankName: t.bankName,
  });
}

/** True if the parsed SMS matches an existing transaction or already-seen key. */
export function isDuplicate(p: ParsedSms, existing: Transaction[], seenKeys: Iterable<string> = []): boolean {
  const key = duplicateKey(p);
  const keys = new Set<string>(seenKeys);
  for (const t of existing) keys.add(txDuplicateKey(t));
  if (keys.has(key)) return true;
  // Same reference + amount regardless of account detail differences
  if (p.referenceNumber) {
    return existing.some(
      (t) => t.referenceNumber?.toLowerCase() === p.referenceNumber!.toLowerCase() && t.amountPaise === p.amountPaise,
    );
  }
  return false;
}
