-- Sprint B: Persistence
-- Create daily_plan, daily_plan_streams, day_state, and exam_dates tables
-- with Row Level Security, Data API grants, and exam date seeds.

-- 1. Table: daily_plan
CREATE TABLE IF NOT EXISTS public.daily_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  slot int2 NOT NULL CHECK (slot BETWEEN 1 AND 4),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'min' CHECK (unit IN ('min', 'count')),
  target_boxes int4 NOT NULL DEFAULT 1 CHECK (target_boxes >= 1),
  done_boxes int4 NOT NULL DEFAULT 0 CHECK (done_boxes >= 0),
  source text NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'rollover')),
  locked boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'cleared', 'swapped', 'skipped')),
  energy_tier text CHECK (energy_tier IN ('Low', 'Medium', 'High', 'Unwell')),
  swapped_from uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_plan_user_date_slot_key UNIQUE (user_id, plan_date, slot)
);

-- 2. Table: daily_plan_streams
CREATE TABLE IF NOT EXISTS public.daily_plan_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.daily_plan(id) ON DELETE CASCADE,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'min' CHECK (unit IN ('min', 'count')),
  target_boxes int4 NOT NULL DEFAULT 1 CHECK (target_boxes >= 1),
  done_boxes int4 NOT NULL DEFAULT 0 CHECK (done_boxes >= 0),
  position int4 NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Table: day_state
CREATE TABLE IF NOT EXISTS public.day_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  energy_tier text CHECK (energy_tier IN ('Low', 'Medium', 'High', 'Unwell')),
  unwell boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT day_state_user_day_key UNIQUE (user_id, day)
);

-- 4. Table: exam_dates
CREATE TABLE IF NOT EXISTS public.exam_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_date date NOT NULL,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_dates_user_name_date_key UNIQUE (user_id, name, exam_date)
);

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_plan_user_date ON public.daily_plan (user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_daily_plan_streams_plan_id ON public.daily_plan_streams (plan_id);
CREATE INDEX IF NOT EXISTS idx_day_state_user_day ON public.day_state (user_id, day);
CREATE INDEX IF NOT EXISTS idx_exam_dates_user_date ON public.exam_dates (user_id, exam_date);

-- 6. Enable Row Level Security
ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_dates ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Users can manage own daily_plan" ON public.daily_plan;
CREATE POLICY "Users can manage own daily_plan" ON public.daily_plan
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own daily_plan_streams" ON public.daily_plan_streams;
CREATE POLICY "Users can manage own daily_plan_streams" ON public.daily_plan_streams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own day_state" ON public.day_state;
CREATE POLICY "Users can manage own day_state" ON public.day_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exam_dates" ON public.exam_dates;
CREATE POLICY "Users can manage own exam_dates" ON public.exam_dates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Explicit Data API Grants (Post-October 30, 2026 requirement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_streams TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_state TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_dates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_dates TO service_role;

-- 9. Seed exam_dates for existing users
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    INSERT INTO public.exam_dates (user_id, name, exam_date, confirmed)
    VALUES
      (v_user_id, 'Robotics', '2026-11-12', true),
      (v_user_id, 'BMS', '2026-11-13', true),
      (v_user_id, 'Economics', '2026-11-16', true),
      (v_user_id, 'Entrepreneurship Development', '2026-11-23', false)
    ON CONFLICT (user_id, name, exam_date) DO NOTHING;
  END LOOP;
END $$;
