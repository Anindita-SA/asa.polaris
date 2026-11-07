-- Migration: Fix RLS for outreach_targets and health tables
-- Created at: 2026-11-07 14:00:00

-- 1. outreach_targets: Revoke anon access and enforce user isolation
REVOKE ALL ON TABLE public.outreach_targets FROM anon;
DROP POLICY IF EXISTS "Allow authenticated users access" ON public.outreach_targets;
DROP POLICY IF EXISTS "Users can manage their own outreach targets" ON public.outreach_targets;

CREATE POLICY "Users can manage their own outreach targets" ON public.outreach_targets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.outreach_targets TO authenticated;
GRANT ALL ON TABLE public.outreach_targets TO service_role;

-- 2. Health and logs tables: Drop permissive legacy policies
DROP POLICY IF EXISTS "allow update" ON public.meal_logs;
DROP POLICY IF EXISTS "auth only" ON public.meal_logs;
DROP POLICY IF EXISTS "auth only" ON public.workout_logs;
DROP POLICY IF EXISTS "auth only" ON public.weight_logs;
DROP POLICY IF EXISTS "auth only" ON public.mood_logs;
DROP POLICY IF EXISTS "auth only" ON public.supplement_logs;
DROP POLICY IF EXISTS "auth only" ON public.supplements;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.weekly_reports;

-- 3. Ensure strict user-isolated policies exist on all personal health and report tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'meal_logs' AND policyname = 'Multi-tenant user access'
  ) THEN
    CREATE POLICY "Multi-tenant user access" ON public.meal_logs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workout_logs' AND policyname = 'Multi-tenant user access'
  ) THEN
    CREATE POLICY "Multi-tenant user access" ON public.workout_logs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weight_logs' AND policyname = 'Multi-tenant user access'
  ) THEN
    CREATE POLICY "Multi-tenant user access" ON public.weight_logs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mood_logs' AND policyname = 'Multi-tenant user access'
  ) THEN
    CREATE POLICY "Multi-tenant user access" ON public.mood_logs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supplement_logs' AND policyname = 'Multi-tenant user access'
  ) THEN
    CREATE POLICY "Multi-tenant user access" ON public.supplement_logs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supplements' AND policyname = 'Users can manage their own supplements'
  ) THEN
    CREATE POLICY "Users can manage their own supplements" ON public.supplements
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weekly_reports' AND policyname = 'Users can access their own weekly_reports'
  ) THEN
    CREATE POLICY "Users can access their own weekly_reports" ON public.weekly_reports
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
