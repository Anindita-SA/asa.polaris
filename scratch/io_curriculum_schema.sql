-- ─────────────────────────────────────────────────────────────────────────────
-- POLARIS — IO Balance + Curriculum Schema
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- IO Balance logs
CREATE TABLE IF NOT EXISTS io_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text CHECK (type IN ('input', 'output')) NOT NULL,
  category text NOT NULL,
  minutes integer NOT NULL,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE io_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own io_logs" ON io_logs;
CREATE POLICY "own io_logs" ON io_logs FOR ALL USING (auth.uid() = user_id);

-- Curriculum chapters
CREATE TABLE IF NOT EXISTS curriculum_chapters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  node_title text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE curriculum_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own curriculum_chapters" ON curriculum_chapters;
CREATE POLICY "own curriculum_chapters" ON curriculum_chapters FOR ALL USING (auth.uid() = user_id);

-- Curriculum topics
CREATE TABLE IF NOT EXISTS curriculum_topics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  chapter_id uuid REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own curriculum_topics" ON curriculum_topics;
CREATE POLICY "own curriculum_topics" ON curriculum_topics FOR ALL USING (auth.uid() = user_id);
