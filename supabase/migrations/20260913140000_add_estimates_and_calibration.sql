alter table tasks add column if not exists time_estimate_minutes int4;
alter table tasks add column if not exists mental_load text;

create table if not exists task_estimate_calibration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  task_id uuid references tasks(id) on delete cascade,
  estimated_minutes int4 not null,
  actual_minutes int4,
  created_at timestamptz default now()
);

alter table task_estimate_calibration enable row level security;
create policy "Users manage own calibrations" on task_estimate_calibration for all using (auth.uid() = user_id);
