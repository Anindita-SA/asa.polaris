ALTER TABLE hardware_opportunities
  ADD COLUMN IF NOT EXISTS profile_match int2 DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acceptance_chance int2 DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_match_range') THEN
    ALTER TABLE hardware_opportunities ADD CONSTRAINT profile_match_range CHECK (profile_match IS NULL OR (profile_match >= 0 AND profile_match <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acceptance_chance_range') THEN
    ALTER TABLE hardware_opportunities ADD CONSTRAINT acceptance_chance_range CHECK (acceptance_chance IS NULL OR (acceptance_chance >= 0 AND acceptance_chance <= 100));
  END IF;
END $$;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

