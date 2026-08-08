import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — TallyUP" },
      {
        name: "description",
        content: "Choose a new password for your TallyUP student money tracker account.",
      },
      { property: "og:title", content: "Set a new password — TallyUP" },
      { property: "og:description", content: "Finish resetting your TallyUP password." },
    ],
  }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("Password needs at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated 🎉");
      navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="animate-pop-in">
        <h1 className="text-3xl">New password</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {ready
            ? "Pick something you'll remember this time."
            : "Open this page from the reset link in your email."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            New password
          </span>
          <span className="relative block">
            <input
              type={revealed ? "text" : "password"}
              value={password}
              placeholder="••••••"
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 pr-12 font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setRevealed((open) => !open)}
              aria-label={revealed ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground"
            >
              {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Confirm password
          </span>
          <input
            type={revealed ? "text" : "password"}
            value={confirm}
            placeholder="••••••"
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
            className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !ready}
          className="w-full rounded-2xl bg-primary py-4 font-display text-lg text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] transition active:translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate({ to: "/auth", search: { mode: "login" } })}
        className="mt-6 text-center text-sm font-bold text-primary"
      >
        Back to log in
      </button>
    </div>
  );
}