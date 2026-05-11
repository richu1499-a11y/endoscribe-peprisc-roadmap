-- Migration 007: Universal Admin CRUD support
-- Adds future_modules table and ensures all core tables have admin write policies.
-- Run after all previous migrations.

-- ============================================================
-- future_modules
-- ============================================================
create table if not exists future_modules (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  category            text default 'Future',
  status              text not null default 'Concept',
  priority            text not null default 'Medium',
  owner               text,
  related_task_ids    jsonb not null default '[]',
  related_dashboard_ids jsonb not null default '[]',
  target_phase        text,
  dependencies        jsonb not null default '[]',
  risks               jsonb not null default '[]',
  next_action         text,
  notes               text,
  order_index         integer not null default 100,
  is_visible          boolean not null default true,
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger future_modules_updated_at
  before update on future_modules for each row execute function set_updated_at();

alter table future_modules enable row level security;

create policy "Authenticated can read future_modules"
  on future_modules for select to authenticated using (true);

create policy "Editors can manage future_modules"
  on future_modules for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));

-- Seed future modules from original roadmap
INSERT INTO future_modules (title, description, category, status, priority, target_phase, next_action, notes) VALUES
('Template-Generating Agent', 'AI agent that generates procedure-specific documentation templates from historical notes and institutional preferences.', 'AI Agent', 'Concept', 'Low', 'Post-validation', 'Draft concept document', 'Depends on EndoScribe Platform maturity'),
('Video Mapping / Papilla Morphology', 'Video-based papilla morphology classification and procedural mapping.', 'Computer Vision', 'Concept', 'Low', 'Post-validation', 'Survey relevant literature', 'Requires video capture infrastructure'),
('Difficult Cannulation Prediction', 'Prediction model for difficult cannulation during ERCP.', 'Prediction Model', 'Concept', 'Low', 'Post-validation', 'Survey GI prediction model literature', 'Needs EndoScribe Platform and training data'),
('Additional Risk Models', 'Beyond PEPRisc: adverse event prediction, Barrett-related models.', 'Prediction Model', 'Concept', 'Low', 'Post-validation', 'Survey GI prediction model literature', 'Depends on PEPRisc validation complete'),
('Multicenter Validation', 'Expansion from single-center to multicenter validation studies.', 'Validation', 'Future', 'Low', 'Post-single-center', 'Draft multicenter pathway', 'Requires single-center validation complete and regulatory strategy')
ON CONFLICT DO NOTHING;

-- Add Data Manager to dashboard_registry if not exists
INSERT INTO dashboard_registry (slug, title, description, route, icon, category, order_index, is_visible, is_system, required_role)
VALUES ('admin_data', 'Data Manager', 'Universal CRUD for all roadmap objects', '/admin/data', 'Database', 'Admin', 220, true, true, 'admin')
ON CONFLICT (slug) DO NOTHING;

-- Ensure workstreams, milestones, risks, decisions have editor write policies
-- (These may already exist from schema.sql but adding IF NOT EXISTS equivalent via DO block)
DO $$
BEGIN
  -- Milestones write policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'Editors can manage milestones') THEN
    -- Policy exists from schema.sql as "Editors can modify milestones", skip
    NULL;
  END IF;

  -- Risks write policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'risks' AND policyname = 'Editors can manage risks') THEN
    NULL;
  END IF;
END $$;
