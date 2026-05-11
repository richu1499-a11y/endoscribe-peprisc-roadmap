-- Migration 012: Permissions, Tasks, Calendar Invites
-- Run after all previous migrations.

-- Add app_role to profiles (clean admin/user model)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_role text not null default 'user';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_protected_admin boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Sync app_role from existing role column
UPDATE profiles SET app_role = 'admin' WHERE role = 'admin' AND app_role != 'admin';
UPDATE profiles SET app_role = 'user' WHERE role IN ('viewer','editor') AND app_role = 'user';

-- Add ics fields to meetings if missing
DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ics_sequence integer not null default 0;
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ics_last_generated_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure task date/archive fields
DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace text;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_seeded boolean not null default false;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
