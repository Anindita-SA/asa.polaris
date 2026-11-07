-- Migration: 20261107123000_create_scout_category_tracker.sql
-- Scout Category Tracker (3-Day Rolling Window)
-- Note: Apply manually via Supabase dashboard / SQL editor.

-- 1. Create scout_category_tracker table
CREATE TABLE IF NOT EXISTS public.scout_category_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    fetch_count INT NOT NULL DEFAULT 0,
    window_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT scout_category_tracker_user_category_unique UNIQUE (user_id, category)
);

-- 2. Enable Row Level Security
ALTER TABLE public.scout_category_tracker ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can select scout_category_tracker"
ON public.scout_category_tracker
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert scout_category_tracker"
ON public.scout_category_tracker
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update scout_category_tracker"
ON public.scout_category_tracker
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete scout_category_tracker"
ON public.scout_category_tracker
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Supabase Data API Grants (Required for post-Oct 30 2026 PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_category_tracker TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_category_tracker TO service_role;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scout_category_tracker_user_id ON public.scout_category_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_scout_category_tracker_category ON public.scout_category_tracker(category);
