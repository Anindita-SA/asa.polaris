-- Migration script for tasks table (vomit-bucket + Eisenhower matrix feature) in Polaris

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    title text NOT NULL,
    notes text,
    quadrant text CHECK (quadrant IS NULL OR quadrant IN ('urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither')),
    deadline date,
    estimated_minutes int4,
    estimate_source text CHECK (estimate_source IS NULL OR estimate_source IN ('user', 'ai')),
    status text NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'active', 'scheduled', 'done')),
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop policy if existing to allow clean re-runs
DROP POLICY IF EXISTS "Users can access their own tasks" ON public.tasks;

-- Create RLS policy: auth.uid() is not null, scoped by user_id = auth.uid()
CREATE POLICY "Users can access their own tasks"
ON public.tasks
FOR ALL
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
