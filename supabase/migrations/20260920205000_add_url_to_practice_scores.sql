-- Migration: Add url column to practice_scores table
-- Created at: 2026-09-20 20:50:00

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'practice_scores' AND column_name = 'url'
  ) THEN
    ALTER TABLE public.practice_scores ADD COLUMN url text;
  END IF;
END $$;
