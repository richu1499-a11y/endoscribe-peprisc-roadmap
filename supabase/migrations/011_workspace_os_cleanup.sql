-- Migration 011: Workspace OS Cleanup
-- Consolidates app into workspace-based navigation.
-- Run after all previous migrations.

-- ============================================================
-- workspace_groups
-- ============================================================
create table if not exists workspace_groups (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  description    text,
  icon           text,
  order_index    integer not null default 100,
  is_visible     boolean not null default true,
  is_system      boolean not null default true,
  required_role  text not null default 'viewer',
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger workspace_groups_updated_at
  before update on workspace_groups for each row execute function set_updated_at();

alter table workspace_groups enable row level security;

create policy "Authenticated can read workspace_groups"
  on workspace_groups for select to authenticated using (true);

create policy "Admins can manage workspace_groups"
  on workspace_groups for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Seed workspaces
INSERT INTO workspace_groups (slug, title, description, icon, order_index) VALUES
('endoscribe-core',      'EndoScribe Core',              'Ambient AI scribe, procedure documentation, speech-to-structure, and physician review workflow.',     'FileText',  10),
('peprisc',              'PEPRisc',                       'Post-ERCP pancreatitis risk prediction, variable mapping, risk output, and model integration.',      'BarChart',  20),
('hardware-workflow',    'Hardware / Workflow',            'Audio capture, microphone testing, procedural-room workflow, and practical deployment.',              'Settings',  30),
('irb-fda-translation',  'IRB, FDA & Translation',        'IRB, HIPAA, FDA/CDS/SaMD, JHTV, Olympus, and commercialization planning.',                          'Shield',    40),
('research-study-trial',  'Research Study / Prospective Trial', 'Prospective study design, trial workflow, validation cohort, outcomes, and publication pathway.', 'FlaskConical', 50)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Add workspace field to tasks
-- ============================================================
DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace text;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_seeded boolean not null default false;
END $$;

-- Mark all existing tasks as seeded and archive them
UPDATE tasks SET is_seeded = true, is_archived = true WHERE is_seeded = false;

-- ============================================================
-- meetings table
-- ============================================================
create table if not exists meetings (
  id                          uuid primary key default gen_random_uuid(),
  title                       text not null,
  description                 text,
  agenda                      text,
  start_time                  timestamptz,
  end_time                    timestamptz,
  timezone                    text not null default 'America/New_York',
  location                    text,
  meeting_link                text,
  status                      text not null default 'planned',
  related_workspace_slug      text,
  related_task_ids            jsonb not null default '[]',
  organizer_id                uuid references public.profiles(id),
  attendee_profile_ids        jsonb not null default '[]',
  attendee_emails             jsonb not null default '[]',
  calendar_provider           text,
  external_calendar_event_id  text,
  calendar_sync_status        text not null default 'not_synced',
  ics_uid                     text,
  created_by                  uuid references public.profiles(id),
  updated_by                  uuid references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger meetings_updated_at
  before update on meetings for each row execute function set_updated_at();

alter table meetings enable row level security;

create policy "Authenticated can read meetings"
  on meetings for select to authenticated using (true);

create policy "Editors can manage meetings"
  on meetings for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));

-- ============================================================
-- Add protected admin field
-- ============================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_protected_admin boolean not null default false;
END $$;
