import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Home, PiggyBank, User } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/goals", label: "Goals", icon: PiggyBank },
  { to: "/profile", label: "You", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <main className="flex-1 px-4 pt-6 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t-2 border-border bg-surface">
        <ul className="flex items-stretch justify-between px-2 py-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={2.6} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {subtitle ? (
          <p className="text-sm font-semibold text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </header>
  );
}