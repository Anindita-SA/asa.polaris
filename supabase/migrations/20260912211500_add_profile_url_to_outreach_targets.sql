-- Migration: Add profile_url to outreach_targets
-- Created at: 2026-09-12 21:15:00

ALTER TABLE public.outreach_targets
  ADD COLUMN IF NOT EXISTS profile_url text DEFAULT NULL;
