ALTER TABLE public.transactions ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friends TO authenticated;
GRANT ALL ON public.friends TO service_role;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own friends" ON public.friends FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.split_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  occurred_on DATE NOT NULL DEFAULT (now()::date),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.split_expenses TO authenticated;
GRANT ALL ON public.split_expenses TO service_role;
ALTER TABLE public.split_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own split expenses" ON public.split_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.split_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.split_expenses(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.friends(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX split_shares_expense_idx ON public.split_shares (expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.split_shares TO authenticated;
GRANT ALL ON public.split_shares TO service_role;
ALTER TABLE public.split_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own split shares" ON public.split_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.split_expenses e WHERE e.id = expense_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.split_expenses e WHERE e.id = expense_id AND e.user_id = auth.uid()));