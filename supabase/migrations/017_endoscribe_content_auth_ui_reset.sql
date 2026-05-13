-- Migration 017: EndoScribe Content + Auth + UI Reset
-- Idempotent: safe to re-run

-- ============================================================
-- 1. Add seed_source column to tasks
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS seed_source text;

-- ============================================================
-- 2. Archive all existing seeded tasks (v1 roadmap IDs)
-- ============================================================
UPDATE tasks
SET is_archived = true,
    seed_source = 'endoscribe-roadmap-v1-2026'
WHERE id LIKE 'ECT-%'
   OR id LIKE 'VAR-%'
   OR id LIKE 'PPM-%'
   OR id LIKE 'REC-%'
   OR id LIKE 'AQ-%'
   OR id LIKE 'IDS-%'
   OR id LIKE 'VRT-%';

-- ============================================================
-- 3. Seed 10 active tasks (final roadmap)
-- ============================================================
INSERT INTO tasks (id, title, workspace, status, priority, owner, target_date, is_archived, is_seeded, dependencies, seed_source)
VALUES
  ('TASK-F01', 'Create systems architecture diagram', 'infrastructure-deployment-strategy', 'Not started', 'High', 'Sathvik', '2026-05-17', false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F02', 'Build full EndoScribe roadmap', 'validation-regulatory-translation', 'Not started', 'High', 'Richu / Priya / Sathvik', '2026-05-17', false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F03', 'Share cataloged recordings/transcripts with Sathvik', 'endoscribe-core-template-engine', 'Not started', 'High', 'Richu', '2026-05-17', false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F04', 'Continue Med ASR clinical accuracy evaluation', 'voice-asr-room-workflow', 'Not started', 'High', 'Sathvik', '2026-05-20', false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F05', 'Design phone versus operating-room microphone experiment', 'voice-asr-room-workflow', 'Not started', 'High', 'Richu', NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F06', 'Draft IRB amendment for prospective study', 'validation-regulatory-translation', 'Not started', 'High', 'Richu', NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F07', 'Create endoscope guidance user guide/protocol', 'endoscribe-core-template-engine', 'Not started', 'Medium', 'Richu', NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F08', 'Define PEPRisc hands-free calculation pathway', 'peprisc-prediction-models', 'Not started', 'High', 'Richu', NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F09', 'Reset and refine existing recommendation logics', 'recommendation-engine', 'Not started', 'Medium', NULL, NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026'),
  ('TASK-F10', 'Decide on EndoScribe KPIs and quality metrics', 'analytics-quality', 'Not started', 'High', NULL, NULL, false, true, '[]'::jsonb, 'endoscribe-final-roadmap-2026')
ON CONFLICT (id) DO UPDATE SET
  title        = EXCLUDED.title,
  workspace    = EXCLUDED.workspace,
  status       = EXCLUDED.status,
  priority     = EXCLUDED.priority,
  owner        = EXCLUDED.owner,
  target_date  = EXCLUDED.target_date,
  is_archived  = EXCLUDED.is_archived,
  is_seeded    = EXCLUDED.is_seeded,
  dependencies = EXCLUDED.dependencies,
  seed_source  = EXCLUDED.seed_source,
  updated_at   = now();

-- ============================================================
-- 4. Update workspace_groups descriptions
-- ============================================================
UPDATE workspace_groups SET description = 'Core documentation engine, procedure templates, structured note generation, note interaction, and transcript-safety workflow.'
WHERE slug = 'endoscribe-core-template-engine';

UPDATE workspace_groups SET description = 'Speech capture, transcription reliability, microphone testing, and multi-speaker handling in the endoscopy room.'
WHERE slug = 'voice-asr-room-workflow';

UPDATE workspace_groups SET description = 'Real-time PEPRisc and future prediction-model workflows within EndoScribe.'
WHERE slug = 'peprisc-prediction-models';

UPDATE workspace_groups SET description = 'Procedure-specific recommendation logic and guideline-aligned follow-up recommendations.'
WHERE slug = 'recommendation-engine';

UPDATE workspace_groups SET description = 'Define quality metrics, KPIs, and future analytics outputs from structured EndoScribe data.'
WHERE slug = 'analytics-quality';

UPDATE workspace_groups SET description = 'Define how EndoScribe is hosted, secured, scaled, and deployed across research and future clinical environments.'
WHERE slug = 'infrastructure-deployment-strategy';

UPDATE workspace_groups SET description = 'Coordinate prospective validation, IRB amendment, ASGE goals, FDA Pre-Sub preparation, and regulatory strategy.'
WHERE slug = 'validation-regulatory-translation';

-- ============================================================
-- 5. Create allowed_users table for pre-approved access
-- ============================================================
CREATE TABLE IF NOT EXISTS allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  added_by uuid REFERENCES profiles(id),
  added_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  last_seen_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_manage_allowed" ON allowed_users
    FOR ALL TO authenticated
    USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "auth_read_own_allowed" ON allowed_users
    FOR SELECT TO authenticated
    USING (email = (select email from auth.users where id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Result summary
-- ============================================================
SELECT 'Migration 017 complete: ' ||
  (SELECT count(*) FROM tasks WHERE seed_source = 'endoscribe-final-roadmap-2026' AND is_archived = false) || ' active tasks, ' ||
  (SELECT count(*) FROM tasks WHERE is_archived = true) || ' archived' as result;
