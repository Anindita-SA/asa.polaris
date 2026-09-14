-- Add missing user_id column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() NOT NULL;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure clean state
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON tasks;

-- Apply strict RLS policy
CREATE POLICY "Users manage own tasks"
ON tasks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add the requested index
CREATE INDEX IF NOT EXISTS idx_tasks_triage ON tasks (user_id, status, quadrant);
