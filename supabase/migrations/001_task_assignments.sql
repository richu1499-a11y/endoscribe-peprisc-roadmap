-- Migration 001: Task Assignments
-- Links roadmap tasks to authenticated users for assignment tracking.
-- The tasks.owner text field remains for human-readable ownership display,
-- but task_assignments is the authoritative user assignment layer.
-- Run this in Supabase SQL Editor after deploying the base schema.

-- ============================================================
-- task_assignments table
-- ============================================================
create table if not exists task_assignments (
  id          uuid primary key default gen_random_uuid(),
  task_id     text not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  role        text not null default 'assignee',
  notes       text,
  unique(task_id, user_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table task_assignments enable row level security;

-- All authenticated users can read assignments
create policy "Authenticated can read task_assignments"
  on task_assignments for select to authenticated using (true);

-- Admins can insert/update/delete assignments
create policy "Admins can manage task_assignments"
  on task_assignments for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
