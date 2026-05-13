-- ============================================================
-- EndoScribe Workspace OS: Combined Safe Migration
-- Safe to run even if some or all migrations were already applied.
-- Paste this entire file into Supabase SQL Editor.
-- Click "Run and enable RLS" if prompted.
-- ============================================================

-- Helper function: auto-update updated_at on row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Fix: Alter tasks.id from uuid to text if needed (required for text-based task IDs like ECT-001)
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'id';
  IF col_type = 'uuid' THEN
    -- Drop any existing FK constraints referencing tasks(id) first
    PERFORM 1; -- placeholder
    -- Try to alter the column type
    BEGIN
      ALTER TABLE public.tasks ALTER COLUMN id TYPE text USING id::text;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter tasks.id to text: %', SQLERRM;
    END;
  END IF;
END $$;

-- 001: task_assignments (task_id without FK to avoid type mismatch issues)
create table if not exists task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
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

-- 006: dashboard_widgets + dashboard_task_links (task_id without FK to avoid type mismatch)
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
  task_id text not null,
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
UPDATE profiles SET role = 'admin' WHERE app_role = 'admin' AND role <> 'admin';
UPDATE profiles SET app_role = 'user' WHERE role <> 'admin' AND coalesce(app_role, 'user') <> 'user';
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

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

DO $$ BEGIN CREATE POLICY "own_pending_invite" ON user_invites FOR SELECT TO authenticated USING (status = 'pending' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "editor_manage_task_assignments" ON task_assignments FOR ALL TO authenticated USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor') and coalesce(profiles.is_active, true) = true)) WITH CHECK (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor') and coalesce(profiles.is_active, true) = true)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.accept_user_invite(p_full_name text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row user_invites%rowtype;
  current_email text;
  normalized_app_role text;
  normalized_db_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF current_email = '' THEN
    RETURN false;
  END IF;

  SELECT *
    INTO invite_row
    FROM user_invites
   WHERE lower(email) = current_email
     AND status = 'pending'
     AND (expires_at IS NULL OR expires_at > now())
   ORDER BY invited_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  normalized_app_role := CASE WHEN invite_row.app_role = 'admin' THEN 'admin' ELSE 'user' END;
  normalized_db_role := CASE WHEN normalized_app_role = 'admin' THEN 'admin' ELSE 'editor' END;

  INSERT INTO profiles (id, email, full_name, role, app_role, is_active)
  VALUES (auth.uid(), current_email, coalesce(nullif(p_full_name, ''), current_email), normalized_db_role, normalized_app_role, true)
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
        role = excluded.role,
        app_role = excluded.app_role,
        is_active = true,
        deactivated_at = null;

  UPDATE user_invites
     SET status = 'accepted',
         accepted_by = auth.uid(),
         accepted_at = now()
   WHERE id = invite_row.id;

  INSERT INTO admin_audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, new_value)
  VALUES (auth.uid(), current_email, 'invite_accepted', 'user_invite', invite_row.id::text, invite_row.email, jsonb_build_object('app_role', normalized_app_role, 'role', normalized_db_role));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_user_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_user_invite(text) TO authenticated;

INSERT INTO admin_entity_registry (
  slug, label, plural_label, description, entity_type, table_name, icon, category,
  order_index, is_visible, is_system, required_role,
  allow_create, allow_edit, allow_delete, allow_reorder, allow_archive, show_count
) VALUES
('tasks', 'Task', 'Tasks', 'Editable execution tasks', 'tasks', 'tasks', 'ListChecks', 'Core', 5, true, true, 'admin', true, true, true, false, true, true),
('workspace-groups', 'Workspace', 'Workspaces', 'Workspace verticals', 'workspace_groups', 'workspace_groups', 'Briefcase', 'Core', 8, true, true, 'admin', true, true, true, true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  label = excluded.label,
  plural_label = excluded.plural_label,
  description = excluded.description,
  entity_type = excluded.entity_type,
  table_name = excluded.table_name,
  icon = excluded.icon,
  category = excluded.category,
  order_index = excluded.order_index,
  is_visible = true,
  allow_create = true,
  allow_edit = true,
  allow_delete = true,
  show_count = true;

-- ============================================================
SELECT 'All migrations applied successfully!' as result;
