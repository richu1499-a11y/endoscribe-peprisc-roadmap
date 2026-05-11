-- Migration 006: Dashboard Widgets + Task Workspaces
-- Run this in the Supabase SQL Editor AFTER migration 005.

-- ============================================================
-- dashboard_widgets: configurable sections per dashboard
-- ============================================================
create table if not exists dashboard_widgets (
  id             uuid primary key default gen_random_uuid(),
  dashboard_id   uuid not null references public.dashboard_registry(id) on delete cascade,
  widget_key     text not null,
  title          text not null,
  description    text,
  widget_type    text not null,
  source_type    text not null default 'tasks',
  config         jsonb not null default '{}'::jsonb,
  order_index    integer not null default 100,
  width          text not null default 'full',
  height         text not null default 'auto',
  is_visible     boolean not null default true,
  required_role  text not null default 'viewer',
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger dashboard_widgets_updated_at
  before update on dashboard_widgets for each row execute function set_updated_at();

alter table dashboard_widgets enable row level security;

create policy "Authenticated can read dashboard_widgets"
  on dashboard_widgets for select to authenticated using (true);

create policy "Admins can manage dashboard_widgets"
  on dashboard_widgets for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- dashboard_task_links: link canonical tasks to dashboards
-- ============================================================
create table if not exists dashboard_task_links (
  id             uuid primary key default gen_random_uuid(),
  dashboard_id   uuid not null references public.dashboard_registry(id) on delete cascade,
  task_id        text not null references public.tasks(id) on delete cascade,
  section        text not null default 'General',
  order_index    integer not null default 100,
  pinned         boolean not null default false,
  notes          text,
  added_by       uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(dashboard_id, task_id)
);

create trigger dashboard_task_links_updated_at
  before update on dashboard_task_links for each row execute function set_updated_at();

alter table dashboard_task_links enable row level security;

create policy "Authenticated can read dashboard_task_links"
  on dashboard_task_links for select to authenticated using (true);

create policy "Admins can manage dashboard_task_links"
  on dashboard_task_links for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- Seed default widgets for existing dashboards
-- ============================================================
-- Helper: insert widget by dashboard slug
DO $$
DECLARE
  did uuid;
BEGIN
  -- Overview
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'overview';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'metrics',          'Project Metrics',    'metric_cards',    'tasks',       10),
      (did, 'my_week',          'My Week',            'my_week',         'assignments', 20),
      (did, 'workstreams',      'Workstreams',        'workload_summary','workstreams', 30),
      (did, 'critical_actions', 'Critical Actions',   'task_table',      'tasks',       40);
  END IF;

  -- GSD
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'gsd';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'my_actions',  'My Next Actions',  'assigned_tasks', 'assignments', 10),
      (did, 'decisions',   'Decisions Needed', 'decision_log',   'decisions',   20),
      (did, 'blockers',    'Blockers',         'task_table',     'tasks',       30),
      (did, 'owners',      'Owner Summary',    'workload_summary','tasks',      40);
  END IF;

  -- Timeline
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'timeline';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'gantt',       'Gantt Chart',           'gantt',            'timeline', 10),
      (did, 'near_term',   'Near-Term Execution',   'task_table',       'tasks',    20),
      (did, 'workload',    'Assignee Workload',     'workload_summary', 'tasks',    30);
  END IF;

  -- Regulatory
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'regulatory';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'posture',     'Regulatory Posture',    'metric_cards',       'regulatory_items', 10),
      (did, 'items',       'Regulatory Items',      'regulatory_items',   'regulatory_items', 20),
      (did, 'fda_tasks',   'Linked FDA Tasks',      'linked_tasks',       'tasks',            30),
      (did, 'warnings',    'Health Warnings',       'health_warnings',    'regulatory_items', 40);
  END IF;

  -- Governance
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'governance';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'posture',     'Governance Posture',    'metric_cards',       'governance_items', 10),
      (did, 'items',       'Governance Items',      'governance_items',   'governance_items', 20),
      (did, 'phi_flow',    'PHI Data Flow',         'static_text',        'static',           30),
      (did, 'hipaa_tasks', 'Linked HIPAA Tasks',    'linked_tasks',       'tasks',            40);
  END IF;

  -- Validation
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'validation';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'posture',     'Validation Posture',    'metric_cards',       'validation_items', 10),
      (did, 'ladder',      'Evidence Ladder',       'static_text',        'static',           20),
      (did, 'items',       'Validation Items',      'validation_items',   'validation_items', 30),
      (did, 'val_tasks',   'Linked Tasks',          'linked_tasks',       'tasks',            40);
  END IF;

  -- Tasks
  SELECT id INTO did FROM dashboard_registry WHERE slug = 'tasks';
  IF did IS NOT NULL THEN
    INSERT INTO dashboard_widgets (dashboard_id, widget_key, title, widget_type, source_type, order_index) VALUES
      (did, 'my_tasks',    'My Tasks',      'assigned_tasks', 'assignments', 10),
      (did, 'all_tasks',   'All Tasks',     'task_table',     'tasks',       20);
  END IF;
END $$;
