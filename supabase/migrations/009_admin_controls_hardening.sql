-- Migration 009: Admin Controls Hardening
-- Adds audit log, archive columns, and profile update policy.
-- Run after all previous migrations.

-- ============================================================
-- admin_audit_log: immutable audit trail
-- ============================================================
create table if not exists admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references public.profiles(id),
  actor_email     text,
  action          text not null,
  entity_type     text not null,
  entity_id       text,
  entity_label    text,
  previous_value  jsonb,
  new_value       jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

-- Admins can read all; authenticated can insert (for logging)
create policy "Admins can read admin_audit_log"
  on admin_audit_log for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Authenticated can insert admin_audit_log"
  on admin_audit_log for insert to authenticated with check (true);

-- ============================================================
-- Add is_archived to major tables (safe ALTER ADD IF NOT EXISTS)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE workstreams        ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE milestones         ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE risks              ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE decisions          ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE future_modules     ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE dashboard_registry ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE dashboard_widgets  ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE regulatory_items   ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE governance_items   ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE validation_items   ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
  ALTER TABLE tasks              ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Profile role update policy (allow admins to update any profile role)
-- ============================================================
-- Drop existing "Users can update own profile" if it only allows self-update
-- and add admin-can-update-all policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can update any profile') THEN
    CREATE POLICY "Admins can update any profile"
      ON profiles FOR UPDATE TO authenticated
      USING (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
  END IF;
END $$;

-- ============================================================
-- Add audit log dashboard to registry if exists
-- ============================================================
INSERT INTO dashboard_registry (slug, title, description, route, icon, category, order_index, is_visible, is_system, required_role)
VALUES ('admin_audit', 'Audit Log', 'Admin action audit trail', '/admin/audit', 'FileText', 'Admin', 230, true, true, 'admin')
ON CONFLICT (slug) DO NOTHING;
