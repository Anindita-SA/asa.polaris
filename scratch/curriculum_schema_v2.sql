-- ─────────────────────────────────────────────────────────────────────────────
-- POLARIS — Curriculum System v2 Schema
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Curriculum categories (Career, Academic, Self, Media & Lit)
CREATE TABLE IF NOT EXISTS curriculum_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  accent_color text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE curriculum_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own curriculum_categories" ON curriculum_categories;
CREATE POLICY "own curriculum_categories" ON curriculum_categories FOR ALL USING (auth.uid() = user_id);

-- 2. Individual curricula (the textbooks)
CREATE TABLE IF NOT EXISTS curricula (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  category_id uuid REFERENCES curriculum_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  banner_url text,
  estimated_hours integer,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own curricula" ON curricula;
CREATE POLICY "own curricula" ON curricula FOR ALL USING (auth.uid() = user_id);

-- 3. Enhanced curriculum topics
--    Add new columns to existing table if it exists, or create fresh
DO $$
BEGIN
  -- Add curriculum_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'curriculum_id'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN curriculum_id uuid REFERENCES curricula(id) ON DELETE CASCADE;
  END IF;

  -- Add estimated_hours if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN estimated_hours numeric;
  END IF;

  -- Add is_recommended_next if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'is_recommended_next'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN is_recommended_next boolean DEFAULT false;
  END IF;

  -- Add date_started if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'date_started'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN date_started date;
  END IF;

  -- Add date_completed if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'date_completed'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN date_completed date;
  END IF;

  -- Add notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'curriculum_topics' AND column_name = 'notes'
  ) THEN
    ALTER TABLE curriculum_topics ADD COLUMN notes text;
  END IF;
END $$;

-- 4. Book/resource recommendations per curriculum
CREATE TABLE IF NOT EXISTS curriculum_resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  curriculum_id uuid REFERENCES curricula(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  resource_type text DEFAULT 'book',
  url text,
  recommended_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE curriculum_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own curriculum_resources" ON curriculum_resources;
CREATE POLICY "own curriculum_resources" ON curriculum_resources FOR ALL USING (auth.uid() = user_id);

-- 5. Media & Lit log (separate from structured curricula)
CREATE TABLE IF NOT EXISTS media_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  author_or_creator text,
  media_type text,
  status text DEFAULT 'want_to',
  date_started date,
  date_finished date,
  recommended_by text,
  rating integer,
  one_line_takeaway text,
  full_review text,
  tags text[],
  cover_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE media_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own media_log" ON media_log;
CREATE POLICY "own media_log" ON media_log FOR ALL USING (auth.uid() = user_id);
