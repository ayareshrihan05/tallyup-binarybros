import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_META, CATEGORY_ORDER, type SpendCategory, type TxnType } from "@/lib/finance";
import { useAddTransaction } from "@/lib/queries";

export function AddTransactionSheet({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("necessity");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const addTransaction = useAddTransaction();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount above zero");
      return;
    }
    if (note.length > 120) {
      toast.error("Keep the note short");
      return;
    }
    try {
      await addTransaction.mutateAsync({
        amount: value,
        type,
        category: type === "expense" ? category : null,
        note: note.trim(),
        occurred_on: date,
      });
      toast.success(type === "income" ? "Money in! 💰" : "Logged. Nice work! ✅");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 px-0">
      <div className="w-full max-w-md rounded-t-3xl border-t-2 border-border bg-surface p-5 pb-8 animate-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Add entry</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-bold text-muted-foreground"
          >
            Close
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {(["expense", "income"] as TxnType[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={`rounded-xl py-2 font-display text-sm capitalize ${
                type === option ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {option === "expense" ? "Spent" : "Received"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Amount
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-display text-2xl outline-none focus:border-primary"
            />
          </label>

          {type === "expense" ? (
            <div>
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <div className="grid gap-2">
                {CATEGORY_ORDER.map((key) => {
                  const meta = CATEGORY_META[key];
                  const active = category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ${
                        active ? "border-primary bg-secondary" : "border-border bg-background"
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {meta.emoji}
                      </span>
                      <span>
                        <span className="block font-display text-sm">{meta.label}</span>
                        <span className="block text-xs font-semibold text-muted-foreground">
                          {meta.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Note
              </span>
              <input
                value={note}
                maxLength={120}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Canteen"
                className="w-full rounded-2xl border-2 border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={addTransaction.isPending}
            className="w-full rounded-2xl bg-primary py-4 font-display text-lg text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5 disabled:opacity-60"
          >
            {addTransaction.isPending ? "Saving…" : "Save entry"}
          </button>
        </form>
      </div>
    </div>
  );
}