-- Sprint B.1: Fixes & Integrity

-- 1. Add xp_awarded tracking to daily_plan
ALTER TABLE public.daily_plan
ADD COLUMN IF NOT EXISTS xp_awarded integer NOT NULL DEFAULT 0;

-- 2. Add nullable plan_id to pomodoro_logs and io_logs
ALTER TABLE public.pomodoro_logs
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.daily_plan(id) ON DELETE SET NULL;

ALTER TABLE public.io_logs
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.daily_plan(id) ON DELETE SET NULL;

-- 3. Indexes for plan_id lookups
CREATE INDEX IF NOT EXISTS idx_pomodoro_logs_plan_id ON public.pomodoro_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_io_logs_plan_id ON public.io_logs(plan_id);

-- 4. Allow 'heuristic' in tasks_estimate_source_check
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_estimate_source_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_estimate_source_check 
  CHECK (estimate_source IS NULL OR estimate_source IN ('user', 'ai', 'heuristic'));

-- 5. One-time backfill of estimated_minutes for existing tasks with (~N min) pattern
UPDATE public.tasks
SET 
  estimated_minutes = substring(title from '\(~?([0-9]{1,4})\s*(?:min|m)')::integer,
  time_estimate_minutes = COALESCE(time_estimate_minutes, substring(title from '\(~?([0-9]{1,4})\s*(?:min|m)')::integer),
  estimate_source = 'heuristic'
WHERE 
  (estimated_minutes IS NULL OR estimated_minutes = 0)
  AND title ~* '\(~?[0-9]{1,4}\s*(min|m)\)';
