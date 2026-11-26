import type { ParsedSms } from "@/types";
import { sanitizeText, isValidDate } from "@/lib/validation/transaction";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const AMOUNT_RE = /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const CREDIT_RE = /\b(credited|credit|deposited|deposit|received|refund(?:ed)?)\b/i;
const DEBIT_RE = /\b(debited|debit|purchase|spent|paid|withdrawn|withdrawal|sent|transferred)\b/i;
const DECLINED_RE = /\b(declined|failed|unsuccessful|reversed|not processed|rejected|insufficient)\b/i;
const OTP_RE = /\b(otp|one[- ]time password|verification code|cvv|pin)\b/i;
const PROMO_RE = /\b(offer|apply now|pre-?approved|loan|win|cashback offer|click|http|www\.)\b/i;
const BALANCE_ONLY_RE = /\b(available balance|avl\.? bal|a\/c bal|balance (?:is|as on)|min(?:imum)? balance|opening balance)\b/i;
const LIMIT_RE = /\b(limit|due date|statement|minimum amount due)\b/i;

const BANKS = ["HDFC", "ICICI", "SBI", "Axis", "Kotak", "PNB", "Canara", "Union Bank", "IDFC", "Yes Bank", "IndusInd", "Bank of Baroda", "BOB", "Federal", "Paytm", "AU Bank"];

function parseAmountPaise(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  const [w, f = ""] = cleaned.split(".");
  const n = Number(w) * 100 + Number(f.padEnd(2, "0"));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseDate(text: string, now = new Date()): string | null {
  // 26-Nov-2026, 26 Nov 2026, 26-Nov-26
  let m = text.match(/\b(\d{1,2})[-\/ ]([A-Za-z]{3})[a-z]*[-\/ ,]*(\d{2,4})\b/);
  if (m) {
    const mm = MONTHS[m[2].toLowerCase()];
    if (mm) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      const iso = `${y}-${mm}-${m[1].padStart(2, "0")}`;
      if (isValidDate(iso)) return iso;
    }
  }
  // 26-11-2026 / 26/11/26 (day first, Indian convention)
  m = text.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (isValidDate(iso)) return iso;
  }
  // 2026-11-26
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m && isValidDate(m[0])) return m[0];
  void now;
  return null;
}

function parseTime(text: string): string | null {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) {
    const pm = m[3].toLowerCase() === "pm";
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (pm ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseMerchant(text: string, type: "income" | "expense" | null): string | null {
  const patterns =
    type === "income"
      ? [/\bfrom\s+([A-Za-z0-9 &.\-_*@]+?)(?=\s+(?:on|at|via|ref|UPI|Info|with|\.|,)|[.,]|$)/i]
      : [
          /\b(?:at|to)\s+([A-Za-z0-9 &.\-_*@]+?)(?=\s+(?:on|via|ref|UPI|Info|using|with|\d{1,2}[-\/])|[.,]|$)/i,
          /\bInfo[:\-]\s*([A-Za-z0-9 &.\-_*@\/]+?)(?=[.,]|$)/i,
        ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1 && !/^(your|a\/c|account|acct)/i.test(m[1].trim())) return m[1].trim().slice(0, 80);
  }
  return null;
}

/** Parse a single bank SMS. Never throws. */
export function parseBankSms(input: string, now = new Date()): ParsedSms {
  const original = sanitizeText(input, 1000);
  const base: ParsedSms = {
    type: null, amountPaise: null, date: null, time: null, bankName: null,
    accountLastFour: null, merchant: null, referenceNumber: null,
    originalMessage: original, status: "ignored",
  };
  if (!original) return { ...base, reason: "Empty message" };

  // OTPs are never stored.
  if (OTP_RE.test(original) && !CREDIT_RE.test(original) && !DEBIT_RE.test(original)) {
    return { ...base, originalMessage: "[OTP message – not stored]", reason: "OTP message ignored" };
  }
  if (OTP_RE.test(original)) {
    return { ...base, originalMessage: "[OTP message – not stored]", reason: "Contains OTP/PIN – ignored for safety" };
  }

  const amt = original.match(AMOUNT_RE);
  const hasCredit = CREDIT_RE.test(original);
  const hasDebit = DEBIT_RE.test(original);

  if (DECLINED_RE.test(original)) return { ...base, reason: "Transaction declined/failed – no money moved" };
  if (!amt) return { ...base, reason: "No amount found" };
  if (!hasCredit && !hasDebit) {
    return { ...base, reason: BALANCE_ONLY_RE.test(original) ? "Balance notification, not a transaction" : "Not a transaction alert" };
  }
  if (BALANCE_ONLY_RE.test(original) && !/\b(credited|debited|withdrawn|paid|spent|received)\b/i.test(original)) {
    return { ...base, reason: "Balance notification, not a transaction" };
  }
  if (LIMIT_RE.test(original) && !/\b(credited|debited|spent|withdrawn)\b/i.test(original)) {
    return { ...base, reason: "Limit/statement alert, not a transaction" };
  }
  if (PROMO_RE.test(original) && !/\b(a\/c|account|acct|card)\b/i.test(original)) {
    return { ...base, reason: "Looks promotional" };
  }

  // Direction: if both words appear, pick the one closest to the account/amount; else ambiguous.
  let type: "income" | "expense" | null = null;
  let ambiguous = false;
  if (hasCredit && !hasDebit) type = "income";
  else if (hasDebit && !hasCredit) type = "expense";
  else {
    const ci = original.search(CREDIT_RE);
    const di = original.search(DEBIT_RE);
    const ai = original.search(AMOUNT_RE);
    type = Math.abs(ci - ai) < Math.abs(di - ai) ? "income" : "expense";
    ambiguous = true;
  }

  // Amount: first amount that is not a balance figure.
  const withoutBalance = original.replace(/(?:avl\.?|available|a\/c)?\s*bal(?:ance)?[^.]*?(?:INR|Rs\.?|₹)\s*[\d,]+(?:\.\d{1,2})?/gi, " ");
  const amtMatch = withoutBalance.match(AMOUNT_RE) ?? amt;
  const amountPaise = parseAmountPaise(amtMatch[1]);

  const acct = original.match(/(?:a\/c|acct?|account|card)\s*(?:no\.?)?\s*(?:ending|ending with|[x*]+|no\.?)?\s*[x*]*(\d{3,4})\b/i);
  const ref = original.match(/\b(?:ref(?:erence)?(?:\s*(?:no|number|id))?|UPI\s*Ref|txn\s*(?:id|no)|RRN)[.:\s#-]*([A-Za-z0-9]{6,})/i);
  const bank = BANKS.find((b) => new RegExp(`\\b${b}\\b`, "i").test(original)) ?? null;

  const date = parseDate(original, now);
  const time = parseTime(original);
  const merchant = parseMerchant(original, type);

  const missing = amountPaise === null;
  return {
    ...base,
    type,
    amountPaise,
    date,
    time,
    bankName: bank,
    accountLastFour: acct?.[1] ?? null,
    merchant,
    referenceNumber: ref?.[1] ?? null,
    status: missing ? "ignored" : ambiguous || !date ? "ambiguous" : "ok",
    reason: ambiguous ? "Could not tell if this is a credit or debit – please confirm" : !date ? "No date found – please confirm" : undefined,
  };
}

/** Split pasted text into individual messages (blank-line separated, else one per line if multiple txn lines). */
export function splitMessages(text: string): string[] {
  const blocks = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const txnLines = lines.filter((l) => AMOUNT_RE.test(l));
    if (lines.length > 1 && txnLines.length === lines.length) out.push(...lines);
    else out.push(lines.join(" "));
  }
  return out;
}
