-- Task Parking, Status Constraint Update, and Deadline Source Migration
-- 1. Extend tasks_status_check to allow 'parked'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status = ANY (ARRAY['inbox'::text, 'active'::text, 'in_progress'::text, 'scheduled'::text, 'done'::text, 'archived'::text, 'parked'::text]));

-- 2. Add deadline_source column with default 'manual'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_source text DEFAULT 'manual' CHECK (deadline_source = ANY (ARRAY['manual'::text, 'auto'::text]));

-- 3. Backfill deadline_source:
-- Children whose parent has a deadline become 'auto', everything else remains 'manual'
UPDATE tasks c
SET deadline_source = 'auto'
FROM tasks p
WHERE c.parent_task_id = p.id
  AND p.deadline IS NOT NULL;

UPDATE tasks
SET deadline_source = 'manual'
WHERE deadline_source IS NULL OR (deadline_source != 'auto' AND deadline_source != 'manual');
