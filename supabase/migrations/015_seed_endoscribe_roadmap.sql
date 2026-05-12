-- Migration 015: Seed EndoScribe Approved Roadmap
-- Idempotent: uses ON CONFLICT DO UPDATE for tasks, ON CONFLICT DO NOTHING for milestones.
-- Does NOT delete existing user-created tasks.

-- Ensure workspace/seed columns exist
DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace text;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_seeded boolean not null default false;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived boolean not null default false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure workspace_groups exist
INSERT INTO workspace_groups (slug, title, description, icon, order_index) VALUES
('endoscribe-core','EndoScribe Core','Ambient AI scribe, procedure documentation, speech-to-structure, and physician review workflow.','FileText',10),
('peprisc','PEPRisc','Post-ERCP pancreatitis risk prediction, variable mapping, risk output, and model integration.','BarChart',20),
('hardware-workflow','Hardware / Workflow','Audio capture, microphone testing, procedural-room workflow, and practical deployment.','Settings',30),
('irb-fda-translation','IRB, FDA & Translation','IRB, FDA/CDS/SaMD, JHTV, Olympus, and commercialization planning.','Shield',40),
('research-study-trial','Research Study / Prospective Trial','Prospective study design, trial workflow, validation cohort, outcomes, and publication pathway.','FlaskConical',50)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed roadmap tasks (ON CONFLICT updates title/workspace/priority/owner/target_date)
-- ============================================================
INSERT INTO tasks (id, title, workspace, status, priority, owner, target_date, is_seeded, is_archived, description, workstream_id, dependencies) VALUES
-- EndoScribe Core
('ES-001','Refine EndoScribe template architecture','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-002','Refine structured templates for current priority procedures','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-003','Expand template coverage to additional procedures, including ileoscopy','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-004','Define high-level multi-agentic template-generation framework','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-005','Document EndoScribe note-taking workflow','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-006','Draft clinician dictation guidance','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('ES-007','Create endoscope guidance user guide/protocol','endoscribe-core','Not started','Medium','Richu',NULL,false,false,'',NULL,'[]'),
('ES-008','Share cataloged recordings/transcripts with Sathvik','endoscribe-core','Not started','High','Richu','2026-05-17',false,false,'',NULL,'[]'),
('ES-009','Inventory recordings for ASR/model evaluation','endoscribe-core','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
-- PEPRisc
('PR-001','Document PEPRisc workflow','peprisc','Not started','High','Richu',NULL,false,false,'',NULL,'[]'),
('PR-002','Define fully hands-free PEPRisc integration','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('PR-003','Define real-time PEPRisc calculation pathway','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('PR-004','Define PEPRisc output visibility during validation','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('PR-005','Define PEPRisc logging/audit workflow','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('PR-006','Include PEPRisc prospective evaluation in IRB amendment','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('PR-007','Define PEPRisc ground-truth comparison approach','peprisc','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
-- Hardware / Workflow
('HW-001','Continue Med ASR clinical accuracy evaluation','hardware-workflow','Not started','High','Sathvik','2026-05-20',false,false,'',NULL,'[]'),
('HW-002','Compare Med ASR with other transcription models','hardware-workflow','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('HW-003','Evaluate ASR hosting and latency','hardware-workflow','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('HW-004','Design phone versus OR microphone experiment','hardware-workflow','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('HW-005','Run phone microphone test','hardware-workflow','Not started','High','Richu',NULL,false,false,'',NULL,'[]'),
('HW-006','Run operating-room microphone test','hardware-workflow','Not started','High','Richu',NULL,false,false,'',NULL,'[]'),
('HW-007','Evaluate multi-speaker/diarization need','hardware-workflow','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('HW-008','Define intern project for multi-speaker problem','hardware-workflow','Not started','Medium','Swaroop / Intern',NULL,false,false,'',NULL,'[]'),
('HW-009','Decide recommended audio-capture workflow','hardware-workflow','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
-- IRB, FDA & Translation
('IRB-R01','Create systems architecture diagram','irb-fda-translation','Not started','High','Sathvik','2026-05-17',false,false,'',NULL,'[]'),
('IRB-R02','Update IRB for ASGE goals, aims, and protocol','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('IRB-R03','Draft IRB amendment for prospective EndoScribe/PEPRisc evaluation','irb-fda-translation','Not started','High','Richu',NULL,false,false,'',NULL,'[]'),
('IRB-R04','Define audio/transcript/data-flow language for IRB','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('IRB-R05','Evaluate FDA/CDS four-condition framework','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('IRB-R06','Confirm EndoScribe platform framing','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('IRB-R07','Define PEPRisc module framing within EndoScribe','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('IRB-R08','Prepare Olympus engineering roadmap summary','irb-fda-translation','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
-- Research Study / Prospective Trial
('RS-001','Build full EndoScribe/PEPRisc roadmap','research-study-trial','Not started','High','Richu / Priya / Sathvik','2026-05-17',false,false,'',NULL,'[]'),
('RS-002','Define prospective validation study aims','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-003','Define non-interventional/shadow-mode design','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-004','Define prospective study workflow','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-005','Define ground-truth review workflow','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-006','Define BSPH collaboration scope with Brian Caffo team','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-007','Define clinical accuracy evaluation framework','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-008','Create prospective pilot launch checklist','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]'),
('RS-009','Define go/no-go criteria for prospective pilot','research-study-trial','Not started','Medium','',NULL,false,false,'',NULL,'[]')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, workspace = EXCLUDED.workspace, priority = EXCLUDED.priority,
  owner = CASE WHEN EXCLUDED.owner != '' THEN EXCLUDED.owner ELSE tasks.owner END,
  target_date = CASE WHEN EXCLUDED.target_date IS NOT NULL THEN EXCLUDED.target_date ELSE tasks.target_date END,
  is_archived = false;

-- ============================================================
-- Set dependencies using the jsonb dependencies field (existing Network Map reads this)
-- ============================================================
UPDATE tasks SET dependencies = '["ES-001"]'::jsonb WHERE id IN ('ES-002','ES-003','ES-004');
UPDATE tasks SET dependencies = '["ES-005"]'::jsonb WHERE id IN ('ES-006','ES-007');
UPDATE tasks SET dependencies = '["ES-008"]'::jsonb WHERE id = 'HW-001';
UPDATE tasks SET dependencies = '["ES-009"]'::jsonb WHERE id = 'HW-002';
UPDATE tasks SET dependencies = '["HW-001"]'::jsonb WHERE id = 'HW-003';
UPDATE tasks SET dependencies = '["HW-004"]'::jsonb WHERE id IN ('HW-005','HW-006');
UPDATE tasks SET dependencies = '["HW-005","HW-006"]'::jsonb WHERE id = 'HW-009';
UPDATE tasks SET dependencies = '["HW-007"]'::jsonb WHERE id = 'HW-008';
UPDATE tasks SET dependencies = '["IRB-R01"]'::jsonb WHERE id = 'IRB-R04';
UPDATE tasks SET dependencies = '["IRB-R04","IRB-R02"]'::jsonb WHERE id = 'IRB-R03';
UPDATE tasks SET dependencies = '["PR-001"]'::jsonb WHERE id = 'PR-002';
UPDATE tasks SET dependencies = '["PR-002"]'::jsonb WHERE id = 'PR-003';
UPDATE tasks SET dependencies = '["PR-003"]'::jsonb WHERE id = 'PR-005';
UPDATE tasks SET dependencies = '["PR-006"]'::jsonb WHERE id = 'PR-007';
UPDATE tasks SET dependencies = '["RS-002"]'::jsonb WHERE id = 'RS-003';
UPDATE tasks SET dependencies = '["RS-003"]'::jsonb WHERE id = 'RS-004';
UPDATE tasks SET dependencies = '["RS-004"]'::jsonb WHERE id = 'RS-005';
UPDATE tasks SET dependencies = '["RS-005","RS-006"]'::jsonb WHERE id = 'RS-007';
UPDATE tasks SET dependencies = '["RS-008"]'::jsonb WHERE id = 'RS-009';
UPDATE tasks SET dependencies = '["IRB-R06"]'::jsonb WHERE id IN ('IRB-R05','IRB-R07');
UPDATE tasks SET dependencies = '["IRB-R01","IRB-R06","RS-001"]'::jsonb WHERE id = 'IRB-R08';

-- ============================================================
-- Seed milestones
-- ============================================================
INSERT INTO milestones (id, title, description, status) VALUES
('MS-R01','Roadmap and prerequisites locked','Approved roadmap, systems architecture, template architecture, PEPRisc workflow, initial ownership.','Not started'),
('MS-R02','Template and note-generation refinement','Refined templates, expansion plan, dictation guide, multi-agentic framework.','Not started'),
('MS-R03','ASR, microphone, and workflow feasibility','Med ASR evaluation, mic experiment, diarization recommendation, hosting/latency.','Not started'),
('MS-R04','IRB and regulatory framing','IRB amendment, ASGE protocol, FDA/CDS assessment, data workflow documentation.','Not started'),
('MS-R05','Prospective validation infrastructure','Validation workflow, PEPRisc evaluation infra, BSPH collaboration, pilot checklist.','Not started'),
('MS-R06','Translation and partner-readiness package','Olympus/JHTV roadmap summary, architecture summary, study-readiness, engineering needs.','Not started')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

SELECT 'Roadmap seeded: ' || (SELECT count(*) FROM tasks WHERE id LIKE 'ES-%' OR id LIKE 'PR-%' OR id LIKE 'HW-%' OR id LIKE 'IRB-R%' OR id LIKE 'RS-%') || ' tasks, ' || (SELECT count(*) FROM milestones WHERE id LIKE 'MS-R%') || ' milestones' as result;
