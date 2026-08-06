import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { GoalCoach } from "@/components/GoalCoach";
import {
  forecastSavings,
  formatMoney,
  monthKey,
  shiftMonth,
  type SavingsGoal,
} from "@/lib/finance";
import {
  useContributeToGoal,
  useDeleteGoal,
  useGoals,
  useProfile,
  useRecentTransactions,
  useSaveGoal,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Savings goals — Pocket" },
      {
        name: "description",
        content: "Set savings goals, get a predicted finish date and earn rewards when you hit them.",
      },
      { property: "og:title", content: "Savings goals — Pocket" },
      { property: "og:description", content: "Plan your savings and celebrate every goal you reach." },
    ],
  }),
  component: GoalsScreen,
});

function GoalsScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const recent = useRecentTransactions();
  const saveGoal = useSaveGoal();
  const deleteGoal = useDeleteGoal();
  const contribute = useContributeToGoal();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const currency = profile.data?.currency ?? "INR";
  const budget = profile.data?.pocket_money ?? 0;

  const avgMonthlySpend = useMemo(() => {
    const months = Array.from({ length: 3 }, (_, index) => shiftMonth(monthKey(), index - 2));
    const totals = new Map(months.map((key) => [key, 0]));
    for (const txn of recent.data ?? []) {
      if (txn.type !== "expense") continue;
      const key = txn.occurred_on.slice(0, 7);
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + txn.amount);
    }
    const active = [...totals.values()].filter((value) => value > 0);
    return active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  }, [recent.data]);

  async function createGoal(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(target);
    if (title.trim().length < 2) {
      toast.error("Name your goal");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a target above zero");
      return;
    }
    try {
      await saveGoal.mutateAsync({
        title: title.trim().slice(0, 80),
        target_amount: amount,
        target_date: targetDate || null,
      });
      setTitle("");
      setTarget("");
      setTargetDate("");
      setShowForm(false);
      toast.success("Goal created 🎯");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save goal");
    }
  }

  async function addSavings(goal: SavingsGoal) {
    const step = Math.max(Math.round(goal.target_amount / 10), 1);
    try {
      const achieved = await contribute.mutateAsync({ goal, amount: step });
      toast.success(
        achieved
          ? "🏆 Goal smashed! Reward unlocked: bragging rights + a guilt-free treat."
          : `Added ${formatMoney(step, currency)} to ${goal.title}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update goal");
    }
  }

  const achievedCount = (goals.data ?? []).filter((goal) => goal.achieved).length;
  const coachGoals = (goals.data ?? []).map((goal) => ({
    title: goal.title,
    target: goal.target_amount,
    saved: goal.saved_amount,
    targetDate: goal.target_date,
  }));

  return (
    <AppShell>
      <ScreenHeader
        title="Savings goals"
        subtitle={achievedCount > 0 ? `${achievedCount} goal(s) achieved 🏆` : "Small steps, big wins"}
        right={
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            aria-label="New goal"
            className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5"
          >
            <Plus className="size-6" strokeWidth={3} />
          </button>
        }
      />

      {showForm ? (
        <form onSubmit={createGoal} className="card-pop mb-4 space-y-3 p-4 animate-pop-in">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            placeholder="New headphones"
            className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-semibold outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Target amount"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-semibold outline-none focus:border-primary"
            />
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saveGoal.isPending}
            className="w-full rounded-2xl bg-primary py-3 font-display text-base text-primary-foreground active:translate-y-0.5 disabled:opacity-60"
          >
            {saveGoal.isPending ? "Saving…" : "Create goal"}
          </button>
        </form>
      ) : null}

      <GoalCoach
        currency={currency}
        pocketMoney={budget}
        avgMonthlySpend={avgMonthlySpend}
        goals={coachGoals}
      />

      {goals.isLoading ? (
        <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
      ) : (goals.data ?? []).length === 0 ? (
        <p className="card-pop p-4 text-sm font-semibold text-muted-foreground">
          No goals yet. Add one and Pocket will predict when you'll get there.
        </p>
      ) : (
        <ul className="space-y-3">
          {(goals.data ?? []).map((goal) => {
            const progress = Math.min(
              Math.round((goal.saved_amount / goal.target_amount) * 100),
              100,
            );
            const forecast = forecastSavings({
              budget,
              avgMonthlySpend,
              target: goal.target_amount,
              saved: goal.saved_amount,
            });
            return (
              <li key={goal.id} className="card-pop p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base">
                      {goal.achieved ? "🏆 " : ""}
                      {goal.title}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatMoney(goal.saved_amount, currency)} of{" "}
                      {formatMoney(goal.target_amount, currency)}
                      {goal.target_date ? ` · by ${goal.target_date}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete goal"
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="rounded-xl p-2 text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary p-3 text-xs font-bold text-secondary-foreground">
                  {goal.achieved ? (
                    <Trophy className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <Sparkles className="mt-0.5 size-4 shrink-0" />
                  )}
                  {goal.achieved
                    ? "Achieved! Reward unlocked — enjoy it guilt-free."
                    : forecast.monthsNeeded
                      ? `Saving ${formatMoney(Math.round(forecast.monthlySurplus), currency)} a month gets you there in about ${forecast.monthsNeeded} month(s).`
                      : "Log a few spends and set your pocket money so Pocket can predict your finish date."}
                </p>

                {goal.achieved ? null : (
                  <button
                    type="button"
                    onClick={() => addSavings(goal)}
                    disabled={contribute.isPending}
                    className="mt-3 w-full rounded-2xl border-2 border-primary py-2 font-display text-sm text-primary active:translate-y-0.5 disabled:opacity-60"
                  >
                    Add {formatMoney(Math.max(Math.round(goal.target_amount / 10), 1), currency)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}