import { createFileRoute } from "@tanstack/react-router";
import { Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { formatMoney, todayISO } from "@/lib/finance";
import {
  useAddFriend,
  useCreateSplit,
  useDeleteFriend,
  useDeleteSplit,
  useFriends,
  useProfile,
  useSplitExpenses,
  useToggleShare,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/split")({
  head: () => ({
    meta: [
      { title: "Split with friends — TallyUP" },
      {
        name: "description",
        content: "Split bills with friends, track who still owes you and settle up.",
      },
      { property: "og:title", content: "Split with friends — TallyUP" },
      {
        property: "og:description",
        content: "Share a bill, split it evenly and keep track of who has paid you back.",
      },
    ],
  }),
  component: SplitScreen,
});

function SplitScreen() {
  const profile = useProfile();
  const friends = useFriends();
  const splits = useSplitExpenses();
  const addFriend = useAddFriend();
  const deleteFriend = useDeleteFriend();
  const createSplit = useCreateSplit();
  const toggleShare = useToggleShare();
  const deleteSplit = useDeleteSplit();

  const currency = profile.data?.currency ?? "INR";
  const [friendName, setFriendName] = useState("");
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(() => todayISO());
  const [picked, setPicked] = useState<string[]>([]);

  const owed = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of splits.data ?? []) {
      for (const share of expense.split_shares) {
        if (!share.friend_id || share.settled) continue;
        map.set(share.friend_id, (map.get(share.friend_id) ?? 0) + share.amount);
      }
    }
    return map;
  }, [splits.data]);

  const totalOwed = [...owed.values()].reduce((sum, value) => sum + value, 0);

  async function submitFriend(event: React.FormEvent) {
    event.preventDefault();
    const name = friendName.trim();
    if (!name) return;
    try {
      await addFriend.mutateAsync(name);
      setFriendName("");
      toast.success(`${name} added 🤝`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add friend");
    }
  }

  async function submitSplit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(total);
    if (!title.trim()) {
      toast.error("What was this for?");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount above zero");
      return;
    }
    if (picked.length === 0) {
      toast.error("Pick at least one friend");
      return;
    }
    try {
      const each = await createSplit.mutateAsync({
        title: title.trim(),
        total_amount: amount,
        occurred_on: date,
        note: "",
        participants: [null, ...picked],
      });
      setTitle("");
      setTotal("");
      setPicked([]);
      toast.success(`Split! ${formatMoney(each, currency)} each 🎉`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not split");
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Split with friends 🤝"
        subtitle={
          totalOwed > 0
            ? `${formatMoney(totalOwed, currency)} still coming back to you`
            : "Everyone is settled up"
        }
      />

      <section className="card-pop mb-4 p-5">
        <h2 className="mb-3 text-lg">Your contacts</h2>
        <form onSubmit={submitFriend} className="mb-3 flex gap-2">
          <input
            value={friendName}
            maxLength={40}
            onChange={(event) => setFriendName(event.target.value)}
            placeholder="Friend's name"
            className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
          />
          <button
            type="submit"
            aria-label="Add friend"
            className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <UserPlus className="size-5" strokeWidth={2.6} />
          </button>
        </form>
        {(friends.data ?? []).length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">
            Add names only — no phone numbers needed.
          </p>
        ) : (
          <ul className="space-y-2">
            {(friends.data ?? []).map((friend) => {
              const balance = owed.get(friend.id) ?? 0;
              return (
                <li
                  key={friend.id}
                  className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-secondary font-display text-sm text-secondary-foreground">
                    {friend.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm">
                    {friend.name}
                  </span>
                  <span
                    className={`font-display text-sm ${
                      balance > 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {balance > 0 ? `owes ${formatMoney(balance, currency)}` : "settled"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${friend.name}`}
                    onClick={() => deleteFriend.mutate(friend.id)}
                    className="rounded-xl p-1 text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-pop mb-4 p-5">
        <h2 className="mb-3 text-lg">New split</h2>
        <form onSubmit={submitSplit} className="space-y-3">
          <input
            value={title}
            maxLength={60}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Pizza night"
            className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              inputMode="decimal"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              placeholder="Total amount"
              className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
            />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(friends.data ?? []).map((friend) => {
              const active = picked.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() =>
                    setPicked((current) =>
                      active
                        ? current.filter((id) => id !== friend.id)
                        : [...current, friend.id],
                    )
                  }
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${
                    active
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {friend.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Split evenly between you and {picked.length} friend{picked.length === 1 ? "" : "s"}.
          </p>
          <button
            type="submit"
            disabled={createSplit.isPending}
            className="w-full rounded-2xl bg-primary py-3 font-display text-base text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5 disabled:opacity-60"
          >
            {createSplit.isPending ? "Splitting…" : "Split it"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-lg">Recent splits</h2>
        {(splits.data ?? []).length === 0 ? (
          <p className="card-pop p-4 text-sm font-semibold text-muted-foreground">
            No splits yet. Share your first bill above.
          </p>
        ) : (
          <ul className="space-y-3">
            {(splits.data ?? []).map((expense) => (
              <li key={expense.id} className="card-pop p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base">{expense.title}</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {expense.occurred_on} · {formatMoney(expense.total_amount, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete split"
                    onClick={() => deleteSplit.mutate(expense.id)}
                    className="rounded-xl p-2 text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <ul className="space-y-1">
                  {expense.split_shares.map((share) => {
                    const friend = (friends.data ?? []).find((f) => f.id === share.friend_id);
                    const label = share.friend_id ? (friend?.name ?? "Friend") : "You";
                    return (
                      <li key={share.id} className="flex items-center gap-2 text-sm font-bold">
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <span>{formatMoney(share.amount, currency)}</span>
                        {share.friend_id ? (
                          <button
                            type="button"
                            onClick={() =>
                              toggleShare.mutate({ id: share.id, settled: !share.settled })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                              share.settled
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {share.settled ? "Paid ✅" : "Mark paid"}
                          </button>
                        ) : (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold text-muted-foreground">
                            your share
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}