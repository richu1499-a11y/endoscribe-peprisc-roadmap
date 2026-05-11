-- Migration 008: Admin UI Configuration Registry
-- Makes Data Manager tabs, labels, and permissions configurable.
-- Run after all previous migrations.

-- ============================================================
-- admin_entity_registry: configurable tabs for /admin/data
-- ============================================================
create table if not exists admin_entity_registry (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  label                 text not null,
  plural_label          text,
  description           text,
  entity_type           text not null,
  table_name            text not null,
  icon                  text,
  category              text not null default 'Core',
  order_index           integer not null default 100,
  is_visible            boolean not null default true,
  is_system             boolean not null default true,
  required_role         text not null default 'admin' check (required_role in ('viewer','editor','admin')),
  allow_create          boolean not null default true,
  allow_edit            boolean not null default true,
  allow_delete          boolean not null default true,
  allow_reorder         boolean not null default false,
  allow_archive         boolean not null default false,
  show_count            boolean not null default true,
  empty_state_title     text,
  empty_state_description text,
  config                jsonb not null default '{}'::jsonb,
  created_by            uuid references public.profiles(id),
  updated_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger admin_entity_registry_updated_at
  before update on admin_entity_registry for each row execute function set_updated_at();

alter table admin_entity_registry enable row level security;

create policy "Admins can read all admin_entity_registry"
  on admin_entity_registry for select to authenticated
  using (is_visible = true or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Admins can manage admin_entity_registry"
  on admin_entity_registry for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- admin_page_settings: configurable page title/subtitle
-- ============================================================
create table if not exists admin_page_settings (
  id         uuid primary key default gen_random_uuid(),
  page_key   text unique not null,
  title      text not null,
  subtitle   text,
  description text,
  config     jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_page_settings_updated_at
  before update on admin_page_settings for each row execute function set_updated_at();

alter table admin_page_settings enable row level security;

create policy "Authenticated can read admin_page_settings"
  on admin_page_settings for select to authenticated using (true);

create policy "Admins can manage admin_page_settings"
  on admin_page_settings for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Seed page settings
INSERT INTO admin_page_settings (page_key, title, subtitle, description) VALUES
('admin_data', 'Universal Data Manager', 'Admin CRUD for workstreams, milestones, risks, decisions, future modules, regulatory, governance, and validation items', 'Configurable admin panel for all roadmap entities.')
ON CONFLICT (page_key) DO NOTHING;

-- Seed entity registry
INSERT INTO admin_entity_registry (slug, label, plural_label, description, entity_type, table_name, icon, category, order_index, is_visible, is_system, allow_create, allow_edit, allow_delete, allow_reorder, allow_archive, show_count) VALUES
('workstreams',       'Workstream',      'Workstreams',       'Strategic workstreams and execution lanes',     'workstreams',       'workstreams',       'Layers',        'Core',       10, true, true, true, true, true, true, true, true),
('milestones',        'Milestone',       'Milestones',        'Roadmap milestones and target dates',           'milestones',        'milestones',        'Target',        'Core',       20, true, true, true, true, true, false, false, true),
('risks',             'Risk',            'Risks',             'Risk register and mitigations',                  'risks',             'risks',             'AlertTriangle', 'Core',       30, true, true, true, true, true, false, false, true),
('decisions',         'Decision',        'Decisions',         'Open and resolved strategic decisions',          'decisions',         'decisions',         'FileText',      'Core',       40, true, true, true, true, true, false, false, true),
('future_modules',    'Future Module',   'Future Modules',    'Planned future capabilities and modules',        'future_modules',    'future_modules',    'Globe',         'Planning',   50, true, true, true, true, true, true, false, true),
('regulatory_items',  'Regulatory Item', 'Regulatory Items',  'FDA/regulatory planning items',                  'regulatory_items',  'regulatory_items',  'Shield',        'Governance', 60, true, true, true, true, true, false, false, true),
('governance_items',  'Governance Item', 'Governance Items',  'IRB/HIPAA/Hopkins IT governance items',          'governance_items',  'governance_items',  'Lock',          'Governance', 70, true, true, true, true, true, false, false, true),
('validation_items',  'Validation Item', 'Validation Items',  'Validation science and evidence-building items', 'validation_items',  'validation_items',  'FlaskConical',  'Evidence',   80, true, true, true, true, true, false, false, true)
ON CONFLICT (slug) DO NOTHING;
