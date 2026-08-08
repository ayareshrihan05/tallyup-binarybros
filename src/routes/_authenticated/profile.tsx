import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — TallyUP" },
      { name: "description", content: "Update your name, monthly pocket money and currency." },
      { property: "og:title", content: "Your profile — TallyUP" },
      { property: "og:description", content: "Manage your TallyUP account settings." },
    ],
  }),
  component: ProfileScreen,
});

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

function ProfileScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [pocketMoney, setPocketMoney] = useState("");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name);
    setPocketMoney(String(profile.data.pocket_money || ""));
    setCurrency(profile.data.currency);
  }, [profile.data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(pocketMoney || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("TallyUP money must be zero or more");
      return;
    }
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim().slice(0, 80),
        pocket_money: amount,
        currency,
      });
      toast.success("Saved ✅");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <ScreenHeader title="You" subtitle="Your budget settings" />

      <form onSubmit={save} className="card-pop space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Name
          </span>
          <input
            value={fullName}
            maxLength={80}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Monthly pocket money
          </span>
          <input
            inputMode="decimal"
            value={pocketMoney}
            onChange={(event) => setPocketMoney(event.target.value)}
            placeholder="5000"
            className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-display text-xl outline-none focus:border-primary"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Currency
          </span>
          <div className="flex gap-2">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={`flex-1 rounded-2xl border-2 py-2 font-display text-sm ${
                  currency === code ? "border-primary bg-secondary text-primary" : "border-border"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full rounded-2xl bg-primary py-3 font-display text-base text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary)_65%,black)] active:translate-y-0.5 disabled:opacity-60"
        >
          {updateProfile.isPending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full rounded-2xl border-2 border-border py-3 font-display text-base text-muted-foreground"
      >
        Log out
      </button>
    </AppShell>
  );
}