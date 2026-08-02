import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  monthRange,
  type Profile,
  type SavingsGoal,
  type SpendCategory,
  type Transaction,
  type TxnType,
} from "@/lib/finance";

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, pocket_money, currency, streak_count")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return { ...data, pocket_money: Number(data.pocket_money) };
      const inserted = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select("id, full_name, pocket_money, currency, streak_count")
        .single();
      if (inserted.error) throw inserted.error;
      return { ...inserted.data, pocket_money: Number(inserted.data.pocket_money) };
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Pick<Profile, "full_name" | "pocket_money" | "currency">>) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("profiles").update(values).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useMonthTransactions(month: string) {
  return useQuery({
    queryKey: ["transactions", month],
    queryFn: async (): Promise<Transaction[]> => {
      const { start, end } = monthRange(month);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, category, note, occurred_on")
        .gte("occurred_on", start)
        .lte("occurred_on", end)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
    },
  });
}

export function useRecentTransactions(days = 180) {
  return useQuery({
    queryKey: ["transactions", "recent", days],
    queryFn: async (): Promise<Transaction[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, category, note, occurred_on")
        .gte("occurred_on", since.toISOString().slice(0, 10))
        .order("occurred_on", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
    },
  });
}

export type NewTransaction = {
  amount: number;
  type: TxnType;
  category: SpendCategory | null;
  note: string;
  occurred_on: string;
};

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        amount: input.amount,
        type: input.type,
        category: input.type === "expense" ? input.category : null,
        note: input.note,
        occurred_on: input.occurred_on,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async (): Promise<SavingsGoal[]> => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("id, title, target_amount, saved_amount, target_date, achieved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        target_amount: Number(row.target_amount),
        saved_amount: Number(row.saved_amount),
      }));
    },
  });
}

export function useSaveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      target_amount: number;
      target_date: string | null;
    }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("savings_goals").insert({
        user_id: userId,
        title: input.title,
        target_amount: input.target_amount,
        target_date: input.target_date,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useContributeToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goal: SavingsGoal; amount: number }) => {
      const saved = input.goal.saved_amount + input.amount;
      const { error } = await supabase
        .from("savings_goals")
        .update({
          saved_amount: saved,
          achieved: saved >= input.goal.target_amount,
        })
        .eq("id", input.goal.id);
      if (error) throw error;
      return saved >= input.goal.target_amount;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}