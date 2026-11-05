-- Migration: Create practice_scores table
-- Created at: 2026-09-14 19:00:00

CREATE TABLE IF NOT EXISTS public.practice_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  score numeric NOT NULL,
  total numeric,
  band numeric,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practice_scores' AND policyname = 'Users manage own practice scores'
  ) THEN
    CREATE POLICY "Users manage own practice scores" ON public.practice_scores
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_practice_scores_user_curr ON public.practice_scores(user_id, curriculum_id);

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.practice_scores TO "anon", "authenticated", "service_role";
