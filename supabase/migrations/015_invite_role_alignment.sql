-- Migration 015: Invite acceptance + role alignment
-- Run after migration 014.

-- Keep the legacy RLS role and product app_role in sync.
UPDATE profiles SET role = 'admin' WHERE app_role = 'admin' AND role <> 'admin';
UPDATE profiles SET app_role = 'admin' WHERE role = 'admin' AND app_role <> 'admin';
UPDATE profiles SET app_role = 'user' WHERE role <> 'admin' AND coalesce(app_role, 'user') <> 'user';

-- Prevent self-service role escalation through profile updates.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Invited users need to be able to discover their own pending invite.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_invites'
      AND policyname = 'Users can read own pending invite'
  ) THEN
    CREATE POLICY "Users can read own pending invite"
      ON user_invites FOR SELECT TO authenticated
      USING (
        status = 'pending'
        AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      );
  END IF;
END $$;

-- Editors can assign and reassign tasks. Admins are already covered by role sync.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_assignments'
      AND policyname = 'Editors can manage task_assignments'
  ) THEN
    CREATE POLICY "Editors can manage task_assignments"
      ON task_assignments FOR ALL TO authenticated
      USING (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.role in ('admin', 'editor')
            and coalesce(profiles.is_active, true) = true
        )
      )
      WITH CHECK (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.role in ('admin', 'editor')
            and coalesce(profiles.is_active, true) = true
        )
      );
  END IF;
END $$;

-- Accept the current user's pending invite without exposing invite mutation to the browser.
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
  VALUES (
    auth.uid(),
    current_email,
    'invite_accepted',
    'user_invite',
    invite_row.id::text,
    invite_row.email,
    jsonb_build_object('app_role', normalized_app_role, 'role', normalized_db_role)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_user_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_user_invite(text) TO authenticated;

-- Make tasks and workspace verticals available in the universal admin data manager.
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
