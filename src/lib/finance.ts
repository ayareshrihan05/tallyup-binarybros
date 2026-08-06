export type TxnType = "income" | "expense";
export type SpendCategory = "necessity" | "optional" | "luxury";

export type Transaction = {
  id: string;
  amount: number;
  type: TxnType;
  category: SpendCategory | null;
  note: string;
  occurred_on: string;
  is_recurring?: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  pocket_money: number;
  currency: string;
  streak_count: number;
};

export type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  achieved: boolean;
};

export const CATEGORY_META: Record<
  SpendCategory,
  { label: string; emoji: string; token: string; hint: string }
> = {
  necessity: {
    label: "Necessities",
    emoji: "🍚",
    token: "necessity",
    hint: "Food, rent, travel, books",
  },
  optional: {
    label: "Subscriptions",
    emoji: "📱",
    token: "optional",
    hint: "Netflix, Spotify, gym, data packs",
  },
  luxury: {
    label: "Luxuries",
    emoji: "🎉",
    token: "luxury",
    hint: "Treats, parties, gadgets",
  },
};

export const CATEGORY_ORDER: SpendCategory[] = ["necessity", "optional", "luxury"];

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isFuture(dateISO: string) {
  return dateISO > todayISO();
}

/** Chart.js needs real color strings, so resolve the CSS token at runtime. */
export function tokenColor(token: string, fallback = "#22c55e") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${token}`)
    .trim();
  return value || fallback;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(key: string) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year!, month! - 1 + delta, 1));
}

export function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export type MonthSummary = {
  income: number;
  spent: number;
  left: number;
  budget: number;
  byCategory: Record<SpendCategory, number>;
  /** (category × 100) ÷ pocket money */
  ratios: Record<SpendCategory, number>;
  spentRatio: number;
  /** Scheduled entries dated after today — never counted in spent/left. */
  upcoming: number;
};

export function summarize(
  transactions: Transaction[],
  pocketMoney: number,
): MonthSummary {
  const byCategory: Record<SpendCategory, number> = {
    necessity: 0,
    optional: 0,
    luxury: 0,
  };
  let income = 0;
  let spent = 0;
  let upcoming = 0;

  for (const txn of transactions) {
    const amount = Number(txn.amount) || 0;
    if (isFuture(txn.occurred_on)) {
      if (txn.type === "expense") upcoming += amount;
      continue;
    }
    if (txn.type === "income") {
      income += amount;
      continue;
    }
    spent += amount;
    if (txn.category) byCategory[txn.category] += amount;
  }

  const budget = pocketMoney > 0 ? pocketMoney : income;
  const ratio = (value: number) => (budget > 0 ? (value * 100) / budget : 0);

  return {
    income,
    spent,
    left: (pocketMoney > 0 ? pocketMoney + income : income) - spent,
    budget,
    byCategory,
    ratios: {
      necessity: ratio(byCategory.necessity),
      optional: ratio(byCategory.optional),
      luxury: ratio(byCategory.luxury),
    },
    spentRatio: ratio(spent),
    upcoming,
  };
}

/** Simple, explainable savings forecast from the last months of behaviour. */
export function forecastSavings(opts: {
  budget: number;
  avgMonthlySpend: number;
  target: number;
  saved: number;
}) {
  const monthlySurplus = Math.max(opts.budget - opts.avgMonthlySpend, 0);
  const remaining = Math.max(opts.target - opts.saved, 0);
  const monthsNeeded =
    monthlySurplus > 0 ? Math.ceil(remaining / monthlySurplus) : null;
  return { monthlySurplus, remaining, monthsNeeded };
}