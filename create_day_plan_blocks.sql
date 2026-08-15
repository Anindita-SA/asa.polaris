-- Migration script for day_plan_blocks table in Polaris

CREATE TABLE IF NOT EXISTS public.day_plan_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    log_date date NOT NULL,
    start_time text NOT NULL,
    duration_minutes int4 NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    source_type text,
    source_id uuid,
    done boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.day_plan_blocks ENABLE ROW LEVEL SECURITY;

-- Drop policy if existing to allow clean re-runs
DROP POLICY IF EXISTS "Users can access their own day plan blocks" ON public.day_plan_blocks;

-- Create RLS policy: auth.uid() is not null, scoped by user_id = auth.uid()
CREATE POLICY "Users can access their own day plan blocks"
ON public.day_plan_blocks
FOR ALL
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
