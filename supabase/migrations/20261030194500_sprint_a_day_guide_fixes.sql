-- Sprint A: Day Guide Fixes, Status Constraint Expansion, Position Backfill
-- 1. Extend tasks_status_check to allow 'archived'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status = ANY (ARRAY['inbox'::text, 'active'::text, 'in_progress'::text, 'scheduled'::text, 'done'::text, 'archived'::text]));

-- 2. Add position, box_unit, target_count to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position int4;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS box_unit text DEFAULT 'min';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_count int4;

-- 3. Add end_date to recurring_task_templates
ALTER TABLE recurring_task_templates ADD COLUMN IF NOT EXISTS end_date date;

-- 4. Sync estimated_minutes from time_estimate_minutes where null
UPDATE tasks SET estimated_minutes = time_estimate_minutes WHERE estimated_minutes IS NULL AND time_estimate_minutes IS NOT NULL;

-- 5. Archive the two IELTS ghost subtasks (leave parent and other children untouched)
UPDATE tasks SET status = 'archived' WHERE id IN ('28129e68-3cc0-45e1-bf99-218a1264ec0c', '54f027fa-e5b9-46ab-b8d1-ee2b433ed5f2');

-- 6. Deactivate IELTS recurring template and set end_date to IELTS milestone deadline (2026-10-03)
UPDATE recurring_task_templates SET is_active = false, end_date = '2026-10-03' WHERE id = 'd13c4a20-5b41-405c-b939-4ff5f57817b7';

-- 7. Backfill tasks.position for Agri Solar Energy Survey Paper child subtasks
DO $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT id INTO v_parent_id FROM tasks WHERE title = 'Agri Solar Energy Survey Paper (MDPI Energies)' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    UPDATE tasks SET position = 1 WHERE parent_task_id = v_parent_id AND title ILIKE 'Zotero Setup%';
    UPDATE tasks SET position = 2 WHERE parent_task_id = v_parent_id AND title ILIKE 'First Pass%';
    UPDATE tasks SET position = 3 WHERE parent_task_id = v_parent_id AND title ILIKE 'Second Pass%';
    UPDATE tasks SET position = 4 WHERE parent_task_id = v_parent_id AND title ILIKE 'Synthesis%';
    UPDATE tasks SET position = 5 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft PRISMA%';
    UPDATE tasks SET position = 6 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Sections 1 & 2%';
    UPDATE tasks SET position = 7 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Section 3%';
    UPDATE tasks SET position = 8 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Section 4A%';
    UPDATE tasks SET position = 9 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Section 4B%';
    UPDATE tasks SET position = 10 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Section 5%';
    UPDATE tasks SET position = 11 WHERE parent_task_id = v_parent_id AND title ILIKE 'Draft Sections 6 & 7%';
    UPDATE tasks SET position = 12 WHERE parent_task_id = v_parent_id AND title ILIKE 'Edit for flow%';
  END IF;
END $$;
