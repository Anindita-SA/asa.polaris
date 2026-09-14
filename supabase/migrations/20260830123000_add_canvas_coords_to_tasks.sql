-- Add canvas coordinates to tasks for Eisenhower Matrix spatial tethering
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS canvas_x FLOAT,
ADD COLUMN IF NOT EXISTS canvas_y FLOAT;
