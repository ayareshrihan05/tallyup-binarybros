import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "login" ? ("login" as const) : ("signup" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in to Pocket" },
      {
        name: "description",
        content: "Log in or create your Pocket account to track student spending and savings.",
      },
      { property: "og:title", content: "Sign in to Pocket" },
      { property: "og:description", content: "Access your student money tracker." },
    ],
  }),
  component: AuthScreen,
});

const schema = z.object({
  fullName: z.string().trim().max(80),
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password needs at least 6 characters" }).max(72),
});

function AuthScreen() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  async function onReset(event: React.FormEvent) {
    event.preventDefault();
    const parsedEmail = z.string().trim().email().max(255).safeParse(email);
    if (!parsedEmail.success) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent — check your inbox 📬");
      setMode("login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    if (isSignup && parsed.data.fullName.length < 2) {
      toast.error("Tell us your name");
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account 📬");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
      navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="animate-pop-in">
        <h1 className="text-3xl">
          {isForgot ? "Reset password" : isSignup ? "Create your Pocket" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {isForgot
            ? "We'll email you a link to set a new password."
            : isSignup
            ? "Your money, tracked in seconds a day."
            : "Log in to keep your streak going."}
        </p>
      </div>

      <form onSubmit={isForgot ? onReset : onSubmit} className="mt-8 space-y-4">
        {isSignup ? (
          <Field
            label="Your name"
            value={fullName}
            onChange={setFullName}
            placeholder="Aarav"
            autoComplete="name"
          />
        ) : null}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@college.edu"
          autoComplete="email"
        />
        {isForgot ? null : (
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        )}

        {mode === "login" ? (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="block text-sm font-bold text-primary"
          >
            Forgot password?
          </button>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-4 font-display text-lg text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] transition active:translate-y-0.5 disabled:opacity-60"
        >
          {busy
            ? "One sec…"
            : isForgot
              ? "Send reset link"
              : isSignup
                ? "Start tracking"
                : "Log in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignup ? "login" : isForgot ? "login" : "signup")}
        className="mt-6 text-center text-sm font-bold text-primary"
      >
        {isSignup
          ? "I already have an account"
          : isForgot
            ? "Back to log in"
            : "New here? Create an account"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
      />
    </label>
  );
}