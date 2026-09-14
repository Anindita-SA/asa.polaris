alter table tasks add column if not exists milestone_id uuid references milestones(id) on delete set null;
create index if not exists idx_tasks_milestone_id on tasks(milestone_id);
