import { describe, expect, it } from "vitest";
import { parseBankSms, splitMessages } from "@/lib/sms-parser";
import { isDuplicate } from "@/lib/sms-parser/duplicate";
import type { Transaction } from "@/types";

describe("sms parser", () => {
  it("credit", () => {
    const p = parseBankSms("Your account has been credited with INR 25000.00 on 26-Nov-2026.");
    expect(p.type).toBe("income");
    expect(p.amountPaise).toBe(2500000);
    expect(p.date).toBe("2026-11-26");
    expect(p.status).toBe("ok");
  });
  it("debit with merchant", () => {
    const p = parseBankSms("Your account has been debited by INR 450.00 at XYZ STORE on 26-Nov-2026.");
    expect(p.type).toBe("expense");
    expect(p.amountPaise).toBe(45000);
    expect(p.merchant).toBe("XYZ STORE");
    expect(p.date).toBe("2026-11-26");
  });
  it("Rs, time, account, ref, bank", () => {
    const p = parseBankSms("HDFC Bank: Rs.1,299.50 debited from A/c XX1234 on 05-11-26 14:35. UPI Ref 412345678901. Info: NETFLIX");
    expect(p.amountPaise).toBe(129950);
    expect(p.bankName).toBe("HDFC");
    expect(p.accountLastFour).toBe("1234");
    expect(p.referenceNumber).toBe("412345678901");
    expect(p.time).toBe("14:35");
    expect(p.date).toBe("2026-11-05");
  });
  it("ignores declined, OTP, balance, promo", () => {
    expect(parseBankSms("Transaction of INR 500 was declined at SHOP").status).toBe("ignored");
    expect(parseBankSms("123456 is your OTP for payment of Rs 500. Do not share.").status).toBe("ignored");
    expect(parseBankSms("Your available balance is INR 10,000.00").status).toBe("ignored");
    expect(parseBankSms("Pre-approved loan of Rs 5,00,000! Apply now http://x.co").status).toBe("ignored");
    expect(parseBankSms("OTP 123456 for debit of Rs 500").originalMessage).not.toContain("123456");
  });
  it("ambiguous when no date", () => {
    expect(parseBankSms("INR 200.00 debited from your account").status).toBe("ambiguous");
  });
  it("ignores balance figure in amount", () => {
    const p = parseBankSms("INR 450.00 debited from A/c XX1234 on 26-Nov-2026. Avl Bal INR 9,550.00");
    expect(p.amountPaise).toBe(45000);
  });
  it("splits multiple messages", () => {
    expect(splitMessages("Rs 10 debited on 01-Jan-2026\nRs 20 credited on 02-Jan-2026")).toHaveLength(2);
  });
});

describe("duplicates", () => {
  const existing: Transaction = {
    id: "1", type: "expense", amountPaise: 45000, category: "Food", description: "XYZ STORE", merchant: "XYZ STORE",
    transactionDate: "2026-11-26", source: "sms_import", createdAt: "", updatedAt: "",
  };
  it("detects same fingerprint", () => {
    const p = parseBankSms("Your account has been debited by INR 450.00 at XYZ STORE on 26-Nov-2026.");
    expect(isDuplicate(p, [existing])).toBe(true);
    expect(isDuplicate({ ...p, amountPaise: 46000 }, [existing])).toBe(false);
  });
  it("detects by reference", () => {
    const withRef = { ...existing, referenceNumber: "ABC12345" };
    const p = { ...parseBankSms("Rs 450 debited on 27-Nov-2026 Ref ABC12345") };
    expect(isDuplicate(p, [withRef])).toBe(true);
  });
});
