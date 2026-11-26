const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format integer paise as Indian currency, e.g. ₹25,000.00 */
export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

/** Compact: ₹25K / ₹1.2L for chart axes */
export function formatCompact(paise: number): string {
  const r = Math.abs(paise) / 100;
  const s = paise < 0 ? "-" : "";
  if (r >= 1e7) return `${s}₹${+(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `${s}₹${+(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `${s}₹${+(r / 1e3).toFixed(1)}K`;
  return `${s}₹${Math.round(r)}`;
}

/**
 * Parse a user-typed rupee amount ("25,000.50", "₹450") into integer paise.
 * Returns null when invalid. Works on strings to avoid float errors.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]|rs\.?|inr/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

export function paiseToInput(paise: number): string {
  const w = Math.floor(paise / 100);
  const f = String(paise % 100).padStart(2, "0");
  return f === "00" ? String(w) : `${w}.${f}`;
}
