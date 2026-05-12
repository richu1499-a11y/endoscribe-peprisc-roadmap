-- Migration 014: Product UI + User Lifecycle
-- Run after all previous migrations.

-- Profile lifecycle fields
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_role text not null default 'user';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_protected_admin boolean not null default false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean not null default true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_by uuid references public.profiles(id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Sync app_role from existing role
UPDATE profiles SET app_role = 'admin' WHERE role = 'admin' AND app_role != 'admin';

-- User invites table
create table if not exists user_invites (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  app_role      text not null default 'user',
  status        text not null default 'pending',
  invited_by    uuid references public.profiles(id),
  accepted_by   uuid references public.profiles(id),
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  expires_at    timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger user_invites_updated_at
  before update on user_invites for each row execute function set_updated_at();

alter table user_invites enable row level security;

create policy "Admins can manage user_invites"
  on user_invites for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Ensure admin_audit_log exists
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

DO $$ BEGIN
  ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
