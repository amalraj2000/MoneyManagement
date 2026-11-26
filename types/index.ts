export type TransactionType = "income" | "expense";
export type TransactionSource = "manual" | "sms_import" | "bank_integration";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountPaise: number;
  category: string;
  description: string;
  merchant?: string | null;
  /** YYYY-MM-DD (local) */
  transactionDate: string;
  /** HH:mm (local) */
  transactionTime?: string | null;
  paymentMethod?: string | null;
  source: TransactionSource;
  bankName?: string | null;
  accountLastFour?: string | null;
  referenceNumber?: string | null;
  originalMessage?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ThemePref = "light" | "dark" | "system";

export interface AppSettings {
  openingBalancePaise: number;
  monthlyIncomeTargetPaise: number;
  monthlyBudgetPaise: number;
  savingsTargetPaise: number;
  currency: "INR";
  theme: ThemePref;
  firstLaunchCompleted: boolean;
  /** User-added categories */
  customIncomeCategories: string[];
  customExpenseCategories: string[];
}

export type ImportStatus = "imported" | "duplicate" | "review" | "rejected";

export interface ParsedSms {
  type: "income" | "expense" | null;
  amountPaise: number | null;
  date: string | null;
  time: string | null;
  bankName: string | null;
  accountLastFour: string | null;
  merchant: string | null;
  referenceNumber: string | null;
  originalMessage: string;
  /** "ok" = confident transaction, "ambiguous" = needs user confirmation, "ignored" = not a transaction */
  status: "ok" | "ambiguous" | "ignored";
  reason?: string;
}

export interface ImportRecord {
  id: string;
  source: TransactionSource;
  originalMessage: string;
  parsedTransaction: ParsedSms;
  importStatus: ImportStatus;
  duplicateKey: string;
  createdAt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openingBalancePaise: 0,
  monthlyIncomeTargetPaise: 0,
  monthlyBudgetPaise: 0,
  savingsTargetPaise: 0,
  currency: "INR",
  theme: "system",
  firstLaunchCompleted: false,
  customIncomeCategories: [],
  customExpenseCategories: [],
};

export const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Bank transfer", "Other income"];
export const EXPENSE_CATEGORIES = ["Food", "Grocery", "Petrol", "Electricity", "Recharge", "Slice", "Bank loan", "Gadget EMI", "EMI", "Shopping", "Travel", "Bills", "Rent", "Subscriptions", "Other expenses"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Debit card", "Credit card", "Net banking", "Bank transfer", "Other"];
