create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  feature_flags jsonb not null default '{
    "auto_quadrant_suggest": false,
    "nudges_enabled": true,
    "nudge_intervals": {},
    "contact_reminders_enabled": true,
    "celebration_sounds": true,
    "ambient_audio_default": "lofi"
  }'::jsonb,
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users manage own settings" on user_settings for all using (auth.uid() = user_id);
