-- Migration: 20261102190000_create_daily_plan_items.sql
-- Sprint C1: Foundations for Daily Plan Board
-- Note: Apply manually via Supabase dashboard / SQL editor.

-- 1. Add manual_boxes column to daily_plan
ALTER TABLE public.daily_plan 
ADD COLUMN IF NOT EXISTS manual_boxes INT NOT NULL DEFAULT 0;

-- 2. Create daily_plan_items table
CREATE TABLE IF NOT EXISTS public.daily_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.daily_plan(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    position INT NOT NULL DEFAULT 0,
    completed_by_slot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT daily_plan_items_plan_task_unique UNIQUE (plan_id, task_id)
);

-- 3. Enable Row Level Security
ALTER TABLE public.daily_plan_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies with Double Ownership Verification
-- Verifies that both the target plan_id and the referenced task_id belong to auth.uid()
CREATE POLICY "Users can insert daily_plan_items"
ON public.daily_plan_items
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.daily_plan p
        WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update daily_plan_items"
ON public.daily_plan_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.daily_plan p
        WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Users can select daily_plan_items"
ON public.daily_plan_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete daily_plan_items"
ON public.daily_plan_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Supabase Data API Grants (Required for post-Oct 30 2026 PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_items TO service_role;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_plan_id ON public.daily_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_user_id ON public.daily_plan_items(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_task_id ON public.daily_plan_items(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_plan_pos ON public.daily_plan_items(plan_id, position);
