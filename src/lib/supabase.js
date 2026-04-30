import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── SQL to run in Supabase SQL Editor ───────────────────────────────────────
//
// -- Enable UUID extension
// create extension if not exists "uuid-ossp";
//
// -- Profiles
// create table profiles (
//   id uuid references auth.users primary key,
//   clarity_anchor text default 'Engineer who thinks like a designer.',
//   current_chapter text default 'Chapter I: The Foundation',
//   xp integer default 0,
//   level integer default 1,
//   created_at timestamptz default now()
// );
// alter table profiles enable row level security;
// create policy "own profile" on profiles for all using (auth.uid() = id);
//
// -- Nodes (constellation graph)
// create table nodes (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   parent_id uuid references nodes(id),
//   type text check (type in ('career','academic','self','root')),
//   title text not null,
//   description text,
//   x_pos float,
//   y_pos float,
//   status text default 'active',
//   created_at timestamptz default now()
// );
// alter table nodes enable row level security;
// create policy "own nodes" on nodes for all using (auth.uid() = user_id);
//
// -- Goals
// create table goals (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   node_id uuid references nodes(id),
//   scope text check (scope in ('weekly','monthly','quarterly','yearly','5yr')),
//   title text not null,
//   target numeric not null,
//   current numeric default 0,
//   unit text,
//   xp_reward integer default 50,
//   completed boolean default false,
//   created_at timestamptz default now()
// );
// alter table goals enable row level security;
// create policy "own goals" on goals for all using (auth.uid() = user_id);
//
// -- Focus items (max 3 enforced in app logic)
// create table focus_items (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   title text not null,
//   category text,
//   why_now text,
//   status text default 'active',
//   created_at timestamptz default now()
// );
// alter table focus_items enable row level security;
// create policy "own focus" on focus_items for all using (auth.uid() = user_id);
//
// -- Backburner
// create table backburner (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   title text not null,
//   why_deferred text,
//   context_snapshot text,
//   revisit_after date,
//   created_at timestamptz default now()
// );
// alter table backburner enable row level security;
// create policy "own backburner" on backburner for all using (auth.uid() = user_id);
//
// -- Milestones
// create table milestones (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   title text not null,
//   deadline date not null,
//   status text default 'upcoming',
//   note text,
//   xp_reward integer default 100,
//   created_at timestamptz default now()
// );
// alter table milestones enable row level security;
// create policy "own milestones" on milestones for all using (auth.uid() = user_id);
//
// -- Highlights (daily journal)
// create table highlights (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   date date default current_date,
//   text text,
//   photo_url text,
//   created_at timestamptz default now(),
//   unique(user_id, date)
// );
// alter table highlights enable row level security;
// create policy "own highlights" on highlights for all using (auth.uid() = user_id);
//
// -- Habits
// create table habits (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   title text not null,
//   frequency text default 'daily',
//   xp_reward integer default 10,
//   created_at timestamptz default now()
// );
// alter table habits enable row level security;
// create policy "own habits" on habits for all using (auth.uid() = user_id);
//
// -- Habit logs
// create table habit_logs (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   habit_id uuid references habits(id),
//   date date default current_date,
//   completed boolean default true,
//   unique(user_id, habit_id, date)
// );
// alter table habit_logs enable row level security;
// create policy "own habit_logs" on habit_logs for all using (auth.uid() = user_id);
//
// -- Eulogies (append-only)
// create table eulogies (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   content text not null,
//   version_label text,
//   written_date date default current_date,
//   created_at timestamptz default now()
// );
// alter table eulogies enable row level security;
// create policy "own eulogies" on eulogies for all using (auth.uid() = user_id);
//
// -- Pomodoro logs
// create table pomodoro_logs (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   date date default current_date,
//   duration_minutes integer not null,
//   node_id uuid references nodes(id),
//   label text,
//   created_at timestamptz default now()
// );
// alter table pomodoro_logs enable row level security;
// create policy "own pomodoro" on pomodoro_logs for all using (auth.uid() = user_id);
//
// -- Subtasks
// create table subtasks (
//   id uuid primary key default uuid_generate_v4(),
//   user_id uuid references auth.users not null,
//   parent_id uuid,
//   parent_type text,
//   title text not null,
//   completed boolean default false,
//   position integer default 0,
//   created_at timestamptz default now()
// );
// alter table subtasks enable row level security;
// create policy "own subtasks" on subtasks for all using (auth.uid() = user_id);
//
// -- Required RPC
// create or replace function increment_xp(user_id uuid, amount int)
// returns void language sql security definer as $$
//   update profiles set xp = xp + amount where id = user_id;
// $$;
//
// -- Storage bucket for journal photos
// insert into storage.buckets (id, name, public) values ('journal-photos', 'journal-photos', false);
// create policy "own photos" on storage.objects for all using (auth.uid()::text = (storage.foldername(name))[1]);
