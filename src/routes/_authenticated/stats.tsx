import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { RatioBars, TrendLine } from "@/components/charts/SpendCharts";
import {
  CATEGORY_META,
  formatMoney,
  monthKey,
  monthLabel,
  shiftMonth,
  summarize,
} from "@/lib/finance";
import { useMonthTransactions, useProfile, useRecentTransactions } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Spending stats — Pocket" },
      {
        name: "description",
        content: "Category ratios against your pocket money plus a six-month spending trend.",
      },
      { property: "og:title", content: "Spending stats — Pocket" },
      { property: "og:description", content: "Charts of your necessity, optional and luxury spending." },
    ],
  }),
  component: StatsScreen,
});

function StatsScreen() {
  const [month] = useState(() => monthKey());
  const [range, setRange] = useState<1 | 3 | 6>(6);
  const profile = useProfile();
  const transactions = useMonthTransactions(month);
  const recent = useRecentTransactions();

  const currency = profile.data?.currency ?? "INR";
  const pocketMoney = profile.data?.pocket_money ?? 0;
  const summary = useMemo(
    () => summarize(transactions.data ?? [], pocketMoney),
    [transactions.data, pocketMoney],
  );

  const trend = useMemo(() => {
    const months = Array.from({ length: range }, (_, index) =>
      shiftMonth(month, index - (range - 1)),
    );
    const totals = new Map(months.map((key) => [key, 0]));
    for (const txn of recent.data ?? []) {
      if (txn.type !== "expense") continue;
      const key = txn.occurred_on.slice(0, 7);
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + txn.amount);
    }
    return {
      labels: months.map((key) => monthLabel(key).split(" ")[0]!.slice(0, 3)),
      values: months.map((key) => totals.get(key) ?? 0),
    };
  }, [recent.data, month, range]);

  const avgSpend =
    trend.values.filter((value) => value > 0).length > 0
      ? trend.values.reduce((sum, value) => sum + value, 0) /
        trend.values.filter((value) => value > 0).length
      : 0;

  return (
    <AppShell>
      <ScreenHeader title="Your stats" subtitle={monthLabel(month)} />

      <section className="card-pop mb-4 p-5">
        <h2 className="text-lg">Share of pocket money</h2>
        <p className="mb-3 text-xs font-semibold text-muted-foreground">
          (category × 100) ÷ pocket money
        </p>
        <RatioBars summary={summary} />
        <ul className="mt-3 space-y-1 text-sm font-bold">
          <li className="flex justify-between">
            <span>Necessity share</span>
            <span>{summary.ratios.necessity.toFixed(1)}%</span>
          </li>
          <li className="flex justify-between">
            <span>Luxury share</span>
            <span>{summary.ratios.luxury.toFixed(1)}%</span>
          </li>
        </ul>
        {summary.budget === 0 ? (
          <p className="mt-3 rounded-2xl bg-muted p-3 text-xs font-semibold text-muted-foreground">
            Add your monthly pocket money in the You tab to unlock these percentages.
          </p>
        ) : null}
      </section>

      <section className="card-pop mb-4 p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg">Spending trend</h2>
          <select
            value={range}
            aria-label="Trend range"
            onChange={(event) => setRange(Number(event.target.value) as 1 | 3 | 6)}
            className="rounded-xl border-2 border-border bg-background px-2 py-1 text-xs font-bold outline-none focus:border-primary"
          >
            <option value={1}>This month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
          </select>
        </div>
        <TrendLine labels={trend.labels} spent={trend.values} />
        <p className="mt-3 text-sm font-bold">
          Average month:{" "}
          <span className="text-primary">{formatMoney(Math.round(avgSpend), currency)}</span>
        </p>
      </section>

      <section className="card-pop p-5">
        <h2 className="mb-2 text-lg">Coach tip</h2>
        <p className="text-sm font-semibold text-muted-foreground">
          {summary.ratios.luxury > 30
            ? `Luxuries are ${Math.round(summary.ratios.luxury)}% of your pocket money. Trimming ${CATEGORY_META.luxury.label.toLowerCase()} by a third would free up ${formatMoney(Math.round(summary.byCategory.luxury / 3), currency)} this month.`
            : summary.spentRatio > 90
              ? "You are close to your budget limit. Try a no-spend day this week."
              : "Nice balance! Keep logging daily to protect your streak."}
        </p>
      </section>
    </AppShell>
  );
}