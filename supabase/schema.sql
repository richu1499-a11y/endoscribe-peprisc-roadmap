-- EndoScribe + PEPRisc Roadmap OS -- Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- DO NOT store PHI, patient identifiers, or clinical data in these tables.

-- ============================================================
-- Helper: auto-update updated_at on row change
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- profiles (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- workstreams
-- ============================================================
create table if not exists workstreams (
  id         text primary key,
  label      text not null,
  purpose    text,
  owner      text,
  status     text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workstreams_updated_at
  before update on workstreams
  for each row execute function set_updated_at();

-- ============================================================
-- tasks
-- ============================================================
create table if not exists tasks (
  id                    text primary key,
  title                 text not null,
  description           text,
  workstream_id         text references workstreams(id),
  owner                 text,
  contributors          jsonb not null default '[]',
  status                text not null default 'Not started',
  priority              text not null default 'Medium',
  start_date            date,
  target_date           date,
  dependencies          jsonb not null default '[]',
  deliverables          jsonb not null default '[]',
  blockers              jsonb not null default '[]',
  risks                 jsonb not null default '[]',
  decision_needed       text,
  regulatory_relevance  text not null default 'None',
  hipaa_relevance       text not null default 'None',
  evidence_stage        text not null default 'Concept',
  gsd_goal              text,
  next_action           text,
  notes                 text,
  created_by            uuid references auth.users(id),
  updated_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ============================================================
-- milestones
-- ============================================================
create table if not exists milestones (
  id             text primary key,
  title          text,
  description    text,
  target_date    date,
  status         text default 'Not started',
  workstream_id  text references workstreams(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger milestones_updated_at
  before update on milestones
  for each row execute function set_updated_at();

-- ============================================================
-- risks
-- ============================================================
create table if not exists risks (
  id               text primary key,
  title            text,
  description      text,
  severity         text,
  mitigation       text,
  owner            text,
  status           text default 'Open',
  related_task_ids jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger risks_updated_at
  before update on risks
  for each row execute function set_updated_at();

-- ============================================================
-- decisions
-- ============================================================
create table if not exists decisions (
  id               text primary key,
  title            text,
  description      text,
  decision_needed  text,
  owner            text,
  status           text default 'Pending',
  due_date         date,
  related_task_ids jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger decisions_updated_at
  before update on decisions
  for each row execute function set_updated_at();

-- ============================================================
-- activity_log
-- ============================================================
create table if not exists activity_log (
  id             uuid primary key default gen_random_uuid(),
  entity_type    text,
  entity_id      text,
  action         text,
  changed_by     uuid references auth.users(id),
  change_summary text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
alter table profiles    enable row level security;
alter table workstreams enable row level security;
alter table tasks       enable row level security;
alter table milestones  enable row level security;
alter table risks       enable row level security;
alter table decisions   enable row level security;
alter table activity_log enable row level security;

-- Profiles: users can read all profiles; admins can update
create policy "Anyone authenticated can read profiles"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Workstreams: authenticated can read; admins/editors can modify
create policy "Authenticated can read workstreams"
  on workstreams for select to authenticated using (true);

create policy "Editors can modify workstreams"
  on workstreams for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Tasks: authenticated can read; admins/editors can modify
create policy "Authenticated can read tasks"
  on tasks for select to authenticated using (true);

create policy "Editors can modify tasks"
  on tasks for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Milestones: same pattern
create policy "Authenticated can read milestones"
  on milestones for select to authenticated using (true);

create policy "Editors can modify milestones"
  on milestones for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Risks: same pattern
create policy "Authenticated can read risks"
  on risks for select to authenticated using (true);

create policy "Editors can modify risks"
  on risks for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Decisions: same pattern
create policy "Authenticated can read decisions"
  on decisions for select to authenticated using (true);

create policy "Editors can modify decisions"
  on decisions for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Activity log: authenticated can read; editors can insert
create policy "Authenticated can read activity_log"
  on activity_log for select to authenticated using (true);

create policy "Editors can insert activity_log"
  on activity_log for insert to authenticated
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================
-- This trigger creates a profile row whenever a new user signs up.
-- The first user gets 'viewer' role by default. Manually set to 'admin'
-- in the SQL editor after your first signup:
--   update profiles set role = 'admin' where email = 'your@email.com';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'viewer'
  );
  return new;
end;
$$;

-- Drop existing trigger if re-running this script
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helper: get current user's role (for RLS policies)
-- ============================================================
-- security definer so it can read profiles regardless of RLS
create or replace function public.get_my_role()
returns text
language plpgsql
security definer set search_path = ''
stable
as $$
declare
  user_role text;
begin
  select role into user_role
  from public.profiles
  where id = auth.uid();
  return coalesce(user_role, 'viewer');
end;
$$;

-- ============================================================
-- task_assignments (links tasks to user profiles)
-- ============================================================
-- The tasks.owner text field is a human-readable label.
-- task_assignments is the authoritative user assignment layer.
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

alter table task_assignments enable row level security;

create policy "Authenticated can read task_assignments"
  on task_assignments for select to authenticated using (true);

create policy "Admins can manage task_assignments"
  on task_assignments for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- ============================================================
-- regulatory_items (FDA/regulatory strategy tracker)
-- ============================================================
create table if not exists regulatory_items (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  category            text not null,
  status              text not null default 'Not started',
  priority            text not null default 'Medium',
  owner               text,
  due_date            date,
  related_task_ids    jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  regulatory_risk     text default 'Unknown',
  evidence_needed     text,
  current_evidence    text,
  decision_needed     text,
  next_action         text,
  notes               text,
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger regulatory_items_updated_at
  before update on regulatory_items
  for each row execute function set_updated_at();

alter table regulatory_items enable row level security;

create policy "Authenticated can read regulatory_items"
  on regulatory_items for select to authenticated using (true);

create policy "Editors can manage regulatory_items"
  on regulatory_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- ============================================================
-- governance_items (IRB / HIPAA / Hopkins IT governance tracker)
-- ============================================================
create table if not exists governance_items (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  category             text not null,
  status               text not null default 'Not started',
  priority             text not null default 'Medium',
  owner                text,
  due_date             date,
  related_task_ids     jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  phi_involved         boolean not null default false,
  data_type            text,
  data_location        text,
  compute_location     text,
  irb_status           text default 'Not assessed',
  hipaa_risk           text default 'Unknown',
  hopkins_it_status    text default 'Not assessed',
  approval_needed      text,
  current_state        text,
  gap                  text,
  decision_needed      text,
  next_action          text,
  notes                text,
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger governance_items_updated_at
  before update on governance_items
  for each row execute function set_updated_at();

alter table governance_items enable row level security;

create policy "Authenticated can read governance_items"
  on governance_items for select to authenticated using (true);

create policy "Editors can manage governance_items"
  on governance_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- ============================================================
-- validation_items (validation science evidence tracker)
-- ============================================================
create table if not exists validation_items (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  validation_domain    text not null,
  status               text not null default 'Not started',
  priority             text not null default 'Medium',
  owner                text,
  due_date             date,
  related_task_ids     jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  metric_type          text,
  metric_name          text,
  target_threshold     text,
  current_result       text,
  sample_size          text,
  dataset_stage        text,
  evidence_stage       text,
  failure_mode         text,
  clinical_materiality text,
  gap                  text,
  decision_needed      text,
  next_action          text,
  notes                text,
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger validation_items_updated_at
  before update on validation_items
  for each row execute function set_updated_at();

alter table validation_items enable row level security;

create policy "Authenticated can read validation_items"
  on validation_items for select to authenticated using (true);

create policy "Editors can manage validation_items"
  on validation_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- ============================================================
-- Enable Supabase Realtime for tasks table
-- ============================================================
-- Run in Supabase Dashboard > Database > Replication, or:
-- alter publication supabase_realtime add table tasks;
