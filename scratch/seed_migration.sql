-- POLARIS MIGRATION SCRIPT
-- Paste this entire file into your Supabase SQL Editor and hit RUN.

DO $$
DECLARE
  uid uuid;
  portf_id uuid;
  res_id uuid;
BEGIN
  -- 1. Get your user ID (assumes you are the only user, or gets the first one)
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users';
  END IF;

  -- 2. Update Goals constraint and add Google Calendar columns
  ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_scope_check;
  ALTER TABLE goals ADD CONSTRAINT goals_scope_check CHECK (scope IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', '5yr'));
  ALTER TABLE goals ADD COLUMN IF NOT EXISTS reminder_time timestamptz;
  ALTER TABLE goals ADD COLUMN IF NOT EXISTS google_event_id text;

  -- 3. Create Ritual tables
  CREATE TABLE IF NOT EXISTS ritual_items (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users not null,
    title text not null,
    time_of_day text check (time_of_day in ('morning', 'anytime', 'evening')),
    position integer default 0,
    created_at timestamptz default now()
  );
  ALTER TABLE ritual_items ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "own ritual_items" ON ritual_items;
  CREATE POLICY "own ritual_items" on ritual_items for all using (auth.uid() = user_id);

  CREATE TABLE IF NOT EXISTS ritual_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users not null,
    item_id uuid references ritual_items(id) on delete cascade,
    date date default current_date,
    completed_at timestamptz default now(),
    unique(user_id, item_id, date)
  );
  ALTER TABLE ritual_logs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "own ritual_logs" ON ritual_logs;
  CREATE POLICY "own ritual_logs" on ritual_logs for all using (auth.uid() = user_id);

  -- 4. Update existing Milestone status
  UPDATE milestones SET status = 'done' WHERE user_id = uid AND title = 'Deploy concrete speaker to portfolio';

  -- 5. Seed Goals
  INSERT INTO goals (user_id, title, scope, target, current, unit, xp_reward, completed) VALUES
  (uid, 'Work on portfolio case study', 'weekly', 3, 0, 'sessions', 50, false),
  (uid, 'PCB design sessions', 'weekly', 2, 0, 'sessions', 50, false),
  (uid, 'DAB research / simulation', 'weekly', 3, 0, 'sessions', 50, false),
  (uid, 'Paper writing sessions', 'weekly', 2, 0, 'sessions', 50, false),
  (uid, 'Greek Commoner Workouts', 'weekly', 4, 0, 'sessions', 50, false),
  (uid, 'Hit protein target', 'weekly', 5, 0, 'days', 50, false),
  (uid, 'Substack writing session', 'weekly', 1, 0, 'session', 50, false),
  (uid, 'Research and shortlist programs', 'monthly', 5, 0, 'programs', 50, false),
  (uid, 'Complete one case study writeup', 'monthly', 1, 0, 'writeup', 50, false),
  (uid, 'Sections drafted', 'monthly', 2, 0, 'sections', 50, false),
  (uid, 'Assignments completed', 'monthly', 4, 0, 'assignments', 50, false),
  (uid, 'Publish Substack post', 'monthly', 1, 0, 'post', 50, false),
  (uid, 'Review scholarship opportunities', 'monthly', 2, 0, 'reviews', 50, false),
  (uid, 'Complete CHAARG PCB v1', 'quarterly', 1, 0, 'board', 50, false),
  (uid, 'Cold email TU Delft / TU/e faculty', 'quarterly', 10, 0, 'emails', 50, false),
  (uid, 'Submit DAB survey paper', 'quarterly', 1, 0, 'submission', 50, false),
  (uid, 'Build consistent workout habit', 'yearly', 200, 0, 'sessions', 50, false),
  (uid, 'Scholarship applications submitted', 'yearly', 5, 0, 'applications', 50, false),
  (uid, 'Complete MSc in Europe', '5yr', 1, 0, 'degree', 500, false),
  (uid, 'Reach financial independence through invention', '5yr', 1, 0, 'milestone', 1000, false),
  (uid, 'Build creative brand', '5yr', 1, 0, 'brand', 500, false);

  -- 6. Seed Habits
  INSERT INTO habits (user_id, title, frequency, xp_reward) VALUES
  (uid, 'Morning workout', 'daily', 15),
  (uid, 'Hit protein target', 'daily', 10),
  (uid, 'DAB / research work', 'daily', 15),
  (uid, 'Read or study', 'daily', 10),
  (uid, 'Creative work — writing or art', 'daily', 15),
  (uid, 'No doom scrolling after 10pm', 'daily', 10);

  -- 7. Seed Focus Items
  -- First clear old ones to respect the max 3 limit
  DELETE FROM focus_items WHERE user_id = uid;
  INSERT INTO focus_items (user_id, title, category, why_now, status) VALUES
  (uid, 'Deploy concrete speaker to portfolio', 'portfolio', 'First real case study and the unlock for everything else', 'active'),
  (uid, 'DAB survey paper', 'research', 'June deadline, Dr. Vignesh Kumar is waiting', 'active'),
  (uid, 'CHAARG PCB v1', 'portfolio', 'Key portfolio piece for TU Delft IPD application', 'active');

  -- 8. Seed Backburner
  INSERT INTO backburner (user_id, title, why_deferred, context_snapshot) VALUES
  (uid, 'Agricultural monitoring drone (ROS2)', 'Not enough bandwidth right now', 'Planned personal project using ROS2, revisit after CHAARG PCB is done'),
  (uid, 'LSTM smart inverter anomaly detection paper', 'Needs DAB paper done first', 'Genuinely publishable direction, builds on PSA cybersecurity assignment, LSTM-based'),
  (uid, 'Deskimon', 'Protecting IP, need more time to develop', 'Physical desk companion pomodoro timer, satisfying tactile interaction mechanic, James Dyson Award 2026 candidate, deadline July 15, solo project'),
  (uid, 'AAKRUTI Innovation Competition', 'No project idea decided yet', 'Dassault Systemes competition, deadline May 31, solo entry, cannot use CHAARG due to IP ownership concerns');

  -- 9. Seed Eulogy
  INSERT INTO eulogies (user_id, content, version_label, written_date) VALUES
  (uid, 'Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education — not academic learning in general — and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff.
All her life, she devoted herself to make a good life for her family and the needy. She always advocated for sustainable living, reusing trash to form treasure and teach and motivate others to do the same. She built a brand and multiple companies that focused on creative output, expression, sustainable products, agri-tech and robotics with a non profit working towards a better future for ecosystems. She was one of the greatest artists of her time, using her art as a guide and a vessel for growing the things that she held dear.
She pursued her MSc in Europe not as an end goal but as a launchpad — building toward companies at the intersection of engineering, design, and sustainability. She achieved financial independence through invention, not employment, within a decade. A Renaissance woman in the truest sense: engineer, designer, artist, inventor.
She never left her family's side and was always present for her mother and father. She might not have been a perfect human being, but she always strived to be a good, loving, caring person and a good daughter, sister and friend.', 'Original — June 2024', '2024-06-25');

  -- 10. Update Profile Anchor and Chapter
  UPDATE profiles SET clarity_anchor = 'You hold the steering wheel. Polaris is your GPS.', current_chapter = 'Chapter I: The Foundation' WHERE id = uid;

END $$;
