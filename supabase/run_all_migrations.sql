-- ============================================================
-- EndoScribe Workspace OS: Combined Safe Migration
-- Safe to run even if some or all migrations were already applied.
-- Paste this entire file into Supabase SQL Editor.
-- Click "Run and enable RLS" if prompted.
-- ============================================================

-- 001: task_assignments
create table if not exists task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  role text not null default 'assignee', notes text,
  unique(task_id, user_id)
);
alter table task_assignments enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_task_assignments" ON task_assignments FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_task_assignments" ON task_assignments FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 002: regulatory_items
create table if not exists regulatory_items (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  category text not null, status text not null default 'Not started', priority text not null default 'Medium',
  owner text, due_date date, related_task_ids jsonb not null default '[]', related_decision_ids jsonb not null default '[]',
  regulatory_risk text default 'Unknown', evidence_needed text, current_evidence text,
  decision_needed text, next_action text, notes text,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER regulatory_items_upd BEFORE UPDATE ON regulatory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table regulatory_items enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_reg" ON regulatory_items FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_reg" ON regulatory_items FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 003: governance_items
create table if not exists governance_items (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  category text not null, status text not null default 'Not started', priority text not null default 'Medium',
  owner text, due_date date, related_task_ids jsonb not null default '[]', related_decision_ids jsonb not null default '[]',
  phi_involved boolean not null default false, data_type text, data_location text, compute_location text,
  irb_status text default 'Not assessed', hipaa_risk text default 'Unknown', hopkins_it_status text default 'Not assessed',
  approval_needed text, current_state text, gap text, decision_needed text, next_action text, notes text,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER governance_items_upd BEFORE UPDATE ON governance_items FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table governance_items enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_gov" ON governance_items FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_gov" ON governance_items FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 004: validation_items
create table if not exists validation_items (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  validation_domain text not null, status text not null default 'Not started', priority text not null default 'Medium',
  owner text, due_date date, related_task_ids jsonb not null default '[]', related_decision_ids jsonb not null default '[]',
  metric_type text, metric_name text, target_threshold text, current_result text, sample_size text,
  dataset_stage text, evidence_stage text, failure_mode text, clinical_materiality text,
  gap text, decision_needed text, next_action text, notes text,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER validation_items_upd BEFORE UPDATE ON validation_items FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table validation_items enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_val" ON validation_items FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_val" ON validation_items FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 005: dashboard_registry
create table if not exists dashboard_registry (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  description text, route text not null, icon text, category text not null default 'Core',
  order_index integer not null default 100, is_visible boolean not null default true,
  is_system boolean not null default true,
  required_role text not null default 'viewer' check (required_role in ('viewer','editor','admin')),
  layout_config jsonb not null default '{}'::jsonb, widget_config jsonb not null default '[]'::jsonb,
  notes text, created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER dashboard_registry_upd BEFORE UPDATE ON dashboard_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table dashboard_registry enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_dash" ON dashboard_registry FOR SELECT TO authenticated USING (is_visible = true or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_dash" ON dashboard_registry FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 006: dashboard_widgets + dashboard_task_links
create table if not exists dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboard_registry(id) on delete cascade,
  widget_key text not null, title text not null, description text, widget_type text not null,
  source_type text not null default 'tasks', config jsonb not null default '{}'::jsonb,
  order_index integer not null default 100, width text not null default 'full', height text not null default 'auto',
  is_visible boolean not null default true, required_role text not null default 'viewer',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER dashboard_widgets_upd BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table dashboard_widgets enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_widgets" ON dashboard_widgets FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_widgets" ON dashboard_widgets FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists dashboard_task_links (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboard_registry(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  section text not null default 'General', order_index integer not null default 100,
  pinned boolean not null default false, notes text, added_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(dashboard_id, task_id)
);
DO $$ BEGIN CREATE TRIGGER dashboard_task_links_upd BEFORE UPDATE ON dashboard_task_links FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table dashboard_task_links enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_dtl" ON dashboard_task_links FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_dtl" ON dashboard_task_links FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 007: future_modules
create table if not exists future_modules (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  category text default 'Future', status text not null default 'Concept', priority text not null default 'Medium',
  owner text, related_task_ids jsonb not null default '[]', related_dashboard_ids jsonb not null default '[]',
  target_phase text, dependencies jsonb not null default '[]', risks jsonb not null default '[]',
  next_action text, notes text, order_index integer not null default 100, is_visible boolean not null default true,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER future_modules_upd BEFORE UPDATE ON future_modules FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table future_modules enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_fm" ON future_modules FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_fm" ON future_modules FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 008: admin_entity_registry + admin_page_settings
create table if not exists admin_entity_registry (
  id uuid primary key default gen_random_uuid(), slug text unique not null, label text not null,
  plural_label text, description text, entity_type text not null, table_name text not null, icon text,
  category text not null default 'Core', order_index integer not null default 100,
  is_visible boolean not null default true, is_system boolean not null default true,
  required_role text not null default 'admin' check (required_role in ('viewer','editor','admin')),
  allow_create boolean not null default true, allow_edit boolean not null default true,
  allow_delete boolean not null default true, allow_reorder boolean not null default false,
  allow_archive boolean not null default false, show_count boolean not null default true,
  empty_state_title text, empty_state_description text, config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER aer_upd BEFORE UPDATE ON admin_entity_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table admin_entity_registry enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_aer" ON admin_entity_registry FOR SELECT TO authenticated USING (is_visible = true or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_aer" ON admin_entity_registry FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists admin_page_settings (
  id uuid primary key default gen_random_uuid(), page_key text unique not null, title text not null,
  subtitle text, description text, config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER aps_upd BEFORE UPDATE ON admin_page_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table admin_page_settings enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_aps" ON admin_page_settings FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_aps" ON admin_page_settings FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 009: admin_audit_log + archive columns
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
  actor_email text, action text not null, entity_type text not null, entity_id text, entity_label text,
  previous_value jsonb, new_value jsonb, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table admin_audit_log enable row level security;
DO $$ BEGIN CREATE POLICY "admin_read_audit" ON admin_audit_log FOR SELECT TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_insert_audit" ON admin_audit_log FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE workstreams ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE milestones ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE decisions ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE future_modules ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE dashboard_registry ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE regulatory_items ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE governance_items ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE validation_items ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE TO authenticated USING (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 011: workspace_groups + meetings + task workspace field
create table if not exists workspace_groups (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  description text, icon text, order_index integer not null default 100,
  is_visible boolean not null default true, is_system boolean not null default true,
  required_role text not null default 'viewer',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER wg_upd BEFORE UPDATE ON workspace_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table workspace_groups enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_wg" ON workspace_groups FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_manage_wg" ON workspace_groups FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO workspace_groups (slug, title, description, icon, order_index) VALUES
('endoscribe-core', 'EndoScribe Core', 'Ambient AI scribe, procedure documentation, speech-to-structure.', 'FileText', 10),
('peprisc', 'PEPRisc', 'Post-ERCP pancreatitis risk prediction and model integration.', 'BarChart', 20),
('hardware-workflow', 'Hardware / Workflow', 'Audio capture, microphones, procedural-room workflow.', 'Settings', 30),
('irb-fda-translation', 'IRB, FDA & Translation', 'IRB, FDA/CDS/SaMD, JHTV, and commercialization.', 'Shield', 40),
('research-study-trial', 'Research Study / Prospective Trial', 'Study design, validation cohort, outcomes, publication.', 'FlaskConical', 50)
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace text;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_seeded boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(), title text not null, description text, agenda text,
  start_time timestamptz, end_time timestamptz, timezone text not null default 'America/New_York',
  location text, meeting_link text, status text not null default 'planned',
  related_workspace_slug text, related_task_ids jsonb not null default '[]',
  organizer_id uuid references public.profiles(id),
  attendee_profile_ids jsonb not null default '[]', attendee_emails jsonb not null default '[]',
  calendar_provider text, external_calendar_event_id text, calendar_sync_status text not null default 'not_synced',
  ics_uid text, ics_sequence integer not null default 0, ics_last_generated_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER meetings_upd BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table meetings enable row level security;
DO $$ BEGIN CREATE POLICY "auth_read_meetings" ON meetings FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_meetings" ON meetings FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 012+014: Profile lifecycle + user invites
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_role text not null default 'user';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_protected_admin boolean not null default false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean not null default true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_by uuid references public.profiles(id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

UPDATE profiles SET app_role = 'admin' WHERE role = 'admin' AND app_role != 'admin';

create table if not exists user_invites (
  id uuid primary key default gen_random_uuid(), email text not null,
  app_role text not null default 'user', status text not null default 'pending',
  invited_by uuid references public.profiles(id), accepted_by uuid references public.profiles(id),
  invited_at timestamptz not null default now(), accepted_at timestamptz, expires_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
DO $$ BEGIN CREATE TRIGGER ui_upd BEFORE UPDATE ON user_invites FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
alter table user_invites enable row level security;
DO $$ BEGIN CREATE POLICY "admin_manage_ui" ON user_invites FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
SELECT 'All migrations applied successfully!' as result;
