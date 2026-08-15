-- Run this SQL in your Supabase SQL Editor to create tables for Dynamic Calendar Sync, Backups, and Staged Schedules

-- 1. Table for Synced & Proposed Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  gcal_event_id text,
  summary text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  color_id text,
  location text,
  source text DEFAULT 'gcal', -- 'gcal', 'polaris_sprint', 'manual', 'ai_proposed'
  status text DEFAULT 'confirmed', -- 'confirmed', 'proposed', 'cancelled'
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own calendar_events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Create index for fast date range querying
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_dates ON calendar_events(user_id, start_time, end_time);

-- 2. Table for Full Schedule Backups (Snapshots)
CREATE TABLE IF NOT EXISTS calendar_backups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  snapshot_name text NOT NULL,
  event_count integer DEFAULT 0,
  raw_ics_content text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own calendar_backups" ON calendar_backups FOR ALL USING (auth.uid() = user_id);

-- 3. RPC Function to Upsert Synced Calendar Events safely
CREATE OR REPLACE FUNCTION upsert_calendar_event(
  p_user_id uuid,
  p_gcal_event_id text,
  p_summary text,
  p_description text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_is_all_day boolean,
  p_color_id text,
  p_source text,
  p_status text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_gcal_event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM calendar_events WHERE user_id = p_user_id AND gcal_event_id = p_gcal_event_id
  ) THEN
    UPDATE calendar_events
    SET 
      summary = p_summary,
      description = p_description,
      start_time = p_start_time,
      end_time = p_end_time,
      is_all_day = p_is_all_day,
      color_id = p_color_id,
      source = p_source,
      status = p_status,
      updated_at = now()
    WHERE user_id = p_user_id AND gcal_event_id = p_gcal_event_id;
  ELSE
    INSERT INTO calendar_events (
      user_id, gcal_event_id, summary, description, start_time, end_time, is_all_day, color_id, source, status
    ) VALUES (
      p_user_id, p_gcal_event_id, p_summary, p_description, p_start_time, p_end_time, p_is_all_day, p_color_id, p_source, p_status
    );
  END IF;
END;
$$;
