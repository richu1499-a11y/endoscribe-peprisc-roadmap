-- Migration 005: Dashboard Registry
-- Admin-manageable navigation/dashboard metadata.
-- Run this in the Supabase SQL Editor.

create table if not exists dashboard_registry (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  description    text,
  route          text not null,
  icon           text,
  category       text not null default 'Core',
  order_index    integer not null default 100,
  is_visible     boolean not null default true,
  is_system      boolean not null default true,
  required_role  text not null default 'viewer' check (required_role in ('viewer','editor','admin')),
  layout_config  jsonb not null default '{}'::jsonb,
  widget_config  jsonb not null default '[]'::jsonb,
  notes          text,
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger dashboard_registry_updated_at
  before update on dashboard_registry
  for each row execute function set_updated_at();

alter table dashboard_registry enable row level security;

-- All authenticated users can read visible dashboards
create policy "Authenticated can read visible dashboards"
  on dashboard_registry for select to authenticated
  using (is_visible = true or exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- Only admins can modify the registry
create policy "Admins can manage dashboard_registry"
  on dashboard_registry for all to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- Seed current dashboards
INSERT INTO dashboard_registry (slug, title, description, route, icon, category, order_index, is_visible, is_system, required_role) VALUES
('overview',        'Overview',          'Executive dashboard with metrics and My Week',        '/',               'LayoutDashboard', 'Core',       10,  true,  true,  'viewer'),
('gsd',             'GSD',               'Goals, strategy, deliverables, execution tracker',    '/gsd',            'Target',          'Execution',  20,  true,  true,  'viewer'),
('roadmap',         'Roadmap',           'Milestones and workstream-grouped timeline',          '/roadmap',        'Map',             'Strategy',   30,  true,  true,  'viewer'),
('timeline',        'Timeline',          'Interactive Gantt chart with filters and grouping',   '/timeline',       'GanttChart',      'Execution',  40,  true,  true,  'viewer'),
('network',         'Network Map',       'Interactive 2D/3D dependency network',                '/network',        'Network',         'Strategy',   50,  true,  true,  'viewer'),
('regulatory',      'FDA / Regulatory',  'Regulatory strategy, CDS/SaMD, intended use',        '/regulatory',     'Shield',          'Governance', 60,  true,  true,  'viewer'),
('governance',      'IRB / HIPAA',       'IRB amendment, HIPAA, Hopkins IT governance',         '/governance',     'Lock',            'Governance', 70,  true,  true,  'viewer'),
('validation',      'Validation',        'Evidence generation, metrics, failure modes',         '/validation',     'FlaskConical',    'Evidence',   80,  true,  true,  'viewer'),
('tasks',           'Tasks',             'Full task CRUD with assignments and filters',         '/tasks',          'ListChecks',      'Execution',  90,  true,  true,  'viewer'),
('admin_users',     'Admin / Users',     'User profiles, roles, and assignment stats',          '/admin/users',    'Users',           'Admin',      200, true,  true,  'admin'),
('admin_dashboards','Dashboard Manager', 'Admin control for dashboard navigation',             '/admin/dashboards','LayoutGrid',      'Admin',      210, true,  true,  'admin'),
('setup',           'Setup',             'Deployment diagnostics and health checks',            '/setup',          'Wrench',          'System',     300, true,  true,  'admin'),
('settings',        'Settings',          'Connection status and safety rules',                  '/settings',       'Settings',        'System',     310, true,  true,  'viewer')
ON CONFLICT (slug) DO NOTHING;
