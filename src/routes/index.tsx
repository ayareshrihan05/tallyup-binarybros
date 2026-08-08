import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tallyup-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TallyUP — Student money tracker & savings goals" },
      {
        name: "description",
        content:
          "Track pocket money, sort spending into necessities, optional and luxuries, and hit savings goals with playful streaks.",
      },
      { property: "og:title", content: "TallyUP — Student money tracker" },
      {
        property: "og:description",
        content:
          "A friendly mobile money tracker for students: monthly summaries, category charts and savings goals.",
      },
    ],
  }),
  component: Landing,
});

const HIGHLIGHTS = [
  { emoji: "🍚", title: "Necessities", text: "Food, travel, books" },
  { emoji: "🎧", title: "Optional", text: "Nice, not needed" },
  { emoji: "🎉", title: "Luxuries", text: "Treats and fun" },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-10">
      <div className="animate-pop-in">
        <img
          src={logo.url}
          alt="TallyUP logo"
          className="h-9 w-auto"
          width={180}
          height={36}
        />
        <h1 className="mt-6 text-4xl leading-tight">
          Know where your pocket money really goes.
        </h1>
        <p className="mt-3 text-base font-semibold text-muted-foreground">
          A tiny money coach for students. Log spends in seconds, watch your
          charts, and keep your savings streak alive.
        </p>
      </div>

      <ul className="my-8 grid gap-3">
        {HIGHLIGHTS.map((item) => (
          <li key={item.title} className="card-pop flex items-center gap-4 p-4">
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            <div>
              <p className="font-display text-base">{item.title}</p>
              <p className="text-sm font-semibold text-muted-foreground">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <Link
          to="/auth"
          className="block w-full rounded-2xl bg-primary py-4 text-center font-display text-lg text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5"
        >
          Get started
        </Link>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="block w-full rounded-2xl border-2 border-border py-3 text-center font-display text-base text-foreground"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
