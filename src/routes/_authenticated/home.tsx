import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { MonthCalendar } from "@/components/MonthCalendar";
import { CategoryDoughnut } from "@/components/charts/SpendCharts";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  formatMoney,
  isFuture,
  monthKey,
  monthLabel,
  shiftMonth,
  summarize,
  todayISO,
} from "@/lib/finance";
import { useDeleteTransaction, useMonthTransactions, useProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your month — TallyUP" },
      { name: "description", content: "Monthly summary of your income, spending and category split." },
      { property: "og:title", content: "Your month — TallyUP" },
      { property: "og:description", content: "See what is left of your pocket money this month." },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const currentMonth = monthKey();
  const [month, setMonth] = useState(() => monthKey());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => todayISO());
  const profile = useProfile();
  const transactions = useMonthTransactions(month);
  const deleteTransaction = useDeleteTransaction();
  const readOnly = month < currentMonth;

  const currency = profile.data?.currency ?? "INR";
  const summary = useMemo(
    () => summarize(transactions.data ?? [], profile.data?.pocket_money ?? 0),
    [transactions.data, profile.data?.pocket_money],
  );

  const firstName = (profile.data?.full_name || "there").split(" ")[0];

  const dayEntries = useMemo(
    () => (transactions.data ?? []).filter((txn) => txn.occurred_on === selectedDay),
    [transactions.data, selectedDay],
  );

  function switchMonth(delta: number) {
    setMonth((current) => {
      const next = shiftMonth(current, delta);
      if (next > currentMonth) return current;
      if (next === currentMonth) {
        setSelectedDay(todayISO());
        return next;
      }
      setSelectedDay(`${next}-01`);
      return next;
    });
  }

  return (
    <AppShell>
      <ScreenHeader
        title={`Hey ${firstName}! 👋`}
        subtitle={
          summary.budget > 0
            ? `${Math.round(summary.spentRatio)}% of your budget used`
            : "Set your pocket money in the You tab"
        }
      />

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-muted px-2 py-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => switchMonth(-1)}
          className="rounded-xl p-2 text-muted-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="font-display text-sm">{monthLabel(month)}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => switchMonth(1)}
          disabled={month >= currentMonth}
          className="rounded-xl p-2 text-muted-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {readOnly ? (
        <p className="mb-4 rounded-2xl bg-muted p-3 text-xs font-bold text-muted-foreground">
          🔒 Viewing a past month — entries can’t be added or removed here.
        </p>
      ) : null}

      <section className="card-pop mb-4 p-5 animate-pop-in">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Left to spend
        </p>
        <p className="mt-1 font-display text-4xl text-primary">
          {formatMoney(summary.left, currency)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Received" value={formatMoney(summary.income, currency)} />
          <Stat label="Spent" value={formatMoney(summary.spent, currency)} />
        </div>
        {summary.upcoming > 0 ? (
          <p className="mt-3 rounded-2xl bg-muted p-3 text-xs font-bold text-muted-foreground">
            📅 {formatMoney(summary.upcoming, currency)} scheduled later this month — not counted
            yet.
          </p>
        ) : null}
      </section>

      <section className="card-pop mb-4 p-5">
        <h2 className="mb-2 text-lg">Where it went</h2>
        <CategoryDoughnut summary={summary} />
        <ul className="mt-3 space-y-2">
          {CATEGORY_ORDER.map((key) => (
            <li key={key} className="flex items-center justify-between text-sm font-bold">
              <span className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: `var(--${CATEGORY_META[key].token})` }}
                />
                {CATEGORY_META[key].label}
              </span>
              <span>
                {formatMoney(summary.byCategory[key], currency)}
                <span className="ml-2 text-muted-foreground">
                  {Math.round(summary.ratios[key])}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-pop mb-4 p-4">
        <h2 className="mb-3 text-lg">Calendar</h2>
        <MonthCalendar
          month={month}
          transactions={transactions.data ?? []}
          selected={selectedDay}
          onSelect={setSelectedDay}
          currency={currency}
        />
        <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
          Tap any day to see what happened.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg">
          {selectedDay
            ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })
            : "Pick a day"}
          {selectedDay && isFuture(selectedDay) ? " · upcoming" : ""}
        </h2>
        {transactions.isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
        ) : dayEntries.length === 0 ? (
          <p className="card-pop p-4 text-sm font-semibold text-muted-foreground">
            {readOnly ? "Nothing on this day." : "Nothing on this day. Tap + to add an entry."}
          </p>
        ) : (
          <ul className="space-y-2">
            {dayEntries.map((txn) => (
              <li key={txn.id} className="card-pop flex items-center gap-3 p-3">
                <span className="text-xl" aria-hidden>
                  {txn.type === "income" ? "💰" : CATEGORY_META[txn.category ?? "necessity"].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm">
                    {txn.note ||
                      (txn.type === "income"
                        ? "Money in"
                        : CATEGORY_META[txn.category ?? "necessity"].label)}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {txn.is_recurring ? "🔁 Monthly" : txn.occurred_on}
                    {isFuture(txn.occurred_on) ? " · scheduled" : ""}
                  </p>
                </div>
                <span
                  className={`font-display text-sm ${
                    txn.type === "income" ? "text-primary" : "text-foreground"
                  }`}
                >
                  {txn.type === "income" ? "+" : "−"}
                  {formatMoney(txn.amount, currency)}
                </span>
                {readOnly ? null : (
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => deleteTransaction.mutate(txn.id)}
                    className="rounded-xl p-2 text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {readOnly ? null : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Add entry"
          className="fixed bottom-24 left-1/2 z-40 ml-[7.5rem] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5"
        >
          <Plus className="size-7" strokeWidth={3} />
        </button>
      )}

      {sheetOpen && !readOnly ? (
        <AddTransactionSheet
          onClose={() => setSheetOpen(false)}
          {...(selectedDay ? { defaultDate: selectedDay } : {})}
        />
      ) : null}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-base">{value}</p>
    </div>
  );
}