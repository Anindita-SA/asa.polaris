-- Sprint B.2: Day Guide Integrity and Auto-completion

-- 1. Drop the two energy_tier constraints and the NOT NULL first
ALTER TABLE public.day_state DROP CONSTRAINT IF EXISTS day_state_energy_tier_check;
ALTER TABLE public.daily_plan DROP CONSTRAINT IF EXISTS daily_plan_energy_tier_check;
ALTER TABLE public.day_state ALTER COLUMN energy_tier DROP NOT NULL;
ALTER TABLE public.daily_plan ALTER COLUMN energy_tier DROP NOT NULL;

-- 2. Then the UPDATEs
UPDATE public.day_state SET energy_tier = LOWER(energy_tier) WHERE energy_tier IS NOT NULL;
UPDATE public.day_state SET energy_tier = NULL, unwell = true WHERE energy_tier = 'unwell';
UPDATE public.daily_plan SET energy_tier = LOWER(energy_tier) WHERE energy_tier IS NOT NULL;
UPDATE public.daily_plan SET energy_tier = NULL WHERE energy_tier = 'unwell';

-- 3. Then the new constraints
ALTER TABLE public.day_state ADD CONSTRAINT day_state_energy_tier_check
  CHECK (energy_tier IS NULL OR energy_tier IN ('low', 'medium', 'high'));
ALTER TABLE public.daily_plan ADD CONSTRAINT daily_plan_energy_tier_check
  CHECK (energy_tier IS NULL OR energy_tier IN ('low', 'medium', 'high'));

-- 4. Then the new columns
ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS auto_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS target_overridden boolean NOT NULL DEFAULT false;
