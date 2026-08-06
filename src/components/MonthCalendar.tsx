import { formatMoney, isFuture, todayISO, type Transaction } from "@/lib/finance";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MonthCalendar({
  month,
  transactions,
  selected,
  onSelect,
  currency,
}: {
  month: string;
  transactions: Transaction[];
  selected: string | null;
  onSelect: (day: string) => void;
  currency: string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year!, monthNumber!, 0).getDate();
  const leading = new Date(year!, monthNumber! - 1, 1).getDay();
  const today = todayISO();

  const spentByDay = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.type !== "expense") continue;
    spentByDay.set(txn.occurred_on, (spentByDay.get(txn.occurred_on) ?? 0) + txn.amount);
  }
  const max = Math.max(...[...spentByDay.values(), 1]);

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-center text-[10px] font-extrabold uppercase text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const key = iso(year!, monthNumber!, day);
          const spent = spentByDay.get(key) ?? 0;
          const future = isFuture(key);
          const isToday = key === today;
          const active = selected === key;
          const intensity = spent > 0 ? 0.25 + (spent / max) * 0.6 : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${key}${spent > 0 ? `, spent ${formatMoney(spent, currency)}` : ""}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-xs font-bold transition ${
                active
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : isToday
                    ? "border-primary/50 bg-background"
                    : "border-transparent bg-muted"
              } ${future ? "text-muted-foreground" : ""}`}
            >
              <span
                className="absolute inset-0 rounded-xl"
                style={
                  spent > 0 && !active
                    ? { backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 100)}%, transparent)` }
                    : undefined
                }
              />
              <span className="relative">{day}</span>
              {spent > 0 ? (
                <span className="relative mt-0.5 size-1.5 rounded-full bg-foreground/60" />
              ) : future ? null : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}