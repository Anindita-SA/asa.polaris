-- Migration: Create outreach_targets table
-- Created at: 2026-09-11 13:00:00

CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  institution text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'researching',
  fit_brief text,
  draft_text text,
  source_papers text,
  sent_date date,
  follow_up_due date,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT outreach_targets_status_check CHECK (status IN ('researching', 'fit_brief_done', 'drafted', 'queued', 'sent', 'replied'))
);

ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'outreach_targets' AND policyname = 'Allow authenticated users access'
  ) THEN
    CREATE POLICY "Allow authenticated users access" ON public.outreach_targets
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.outreach_targets TO "anon", "authenticated", "service_role";

