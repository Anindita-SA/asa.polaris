-- Migration to add is_starred to hardware_opportunities

ALTER TABLE hardware_opportunities 
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
