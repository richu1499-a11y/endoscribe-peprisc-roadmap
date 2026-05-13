-- Migration 016: Professional Roadmap & Workspace Overhaul
-- Fully constraint-aware rewrite. Fixes all FK / NOT NULL issues.
-- Safe: uses IF NOT EXISTS, ON CONFLICT. Does not delete user data.

-- ============================================================
-- 0. Fix constraints and add missing columns
-- ============================================================

-- Drop the workstream_id FK (we use workspace slug instead, workstream_id is legacy)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_workstream_id_fkey;

-- Add epic column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS epic text;

-- ============================================================
-- 1. Restructure workspace_groups to 7 verticals
-- ============================================================
UPDATE workspace_groups SET is_visible = false WHERE slug IN ('endoscribe-core','peprisc','hardware-workflow','irb-fda-translation','research-study-trial');

INSERT INTO workspace_groups (slug, title, description, icon, order_index, is_visible, is_system) VALUES
('endoscribe-core-template-engine', 'EndoScribe Core & Template Engine', 'Ambient documentation, template architecture, clinician workflow, voice activation, and transcript safety.', 'FileText', 10, true, true),
('voice-asr-room-workflow', 'Voice, ASR & Room Workflow', 'Med ASR evaluation, microphone testing, multi-speaker diarization, and audio-capture workflow.', 'Mic', 20, true, true),
('peprisc-prediction-models', 'PEPRisc & Prediction Models', 'Real-time PEPRisc integration, prospective evaluation, model drift monitoring, and prediction pipeline.', 'Activity', 30, true, true),
('recommendation-engine', 'Recommendation Engine', 'Procedure-specific recommendation logic, society guidance alignment, and recommendation validation.', 'GitBranch', 40, true, true),
('analytics-quality', 'Analytics & Quality', 'Provider-level and facility-level analytics, KPIs, quality metrics, and leadership dashboards.', 'BarChart', 50, true, true),
('infrastructure-deployment-strategy', 'Infrastructure & Deployment Strategy', 'Systems architecture, deployment strategy, database/queue design, CI/CD, and federated learning.', 'Server', 60, true, true),
('validation-regulatory-translation', 'Validation, Regulatory & Translation', 'Prospective validation design, IRB amendments, FDA Pre-Sub preparation, and study protocols.', 'Shield', 70, true, true)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index, is_visible = true;

-- Migrate old task workspace references
UPDATE tasks SET workspace = 'endoscribe-core-template-engine' WHERE workspace = 'endoscribe-core';
UPDATE tasks SET workspace = 'peprisc-prediction-models' WHERE workspace = 'peprisc';
UPDATE tasks SET workspace = 'voice-asr-room-workflow' WHERE workspace = 'hardware-workflow';
UPDATE tasks SET workspace = 'validation-regulatory-translation' WHERE workspace IN ('irb-fda-translation', 'research-study-trial');

-- Archive old seeded tasks
UPDATE tasks SET is_archived = true WHERE is_seeded = true AND workspace IS NOT NULL;

-- ============================================================
-- 2. Seed professional roadmap tasks
-- Columns used: id(text PK), title(text NOT NULL), workspace(text), epic(text),
--   status(text NOT NULL default), priority(text NOT NULL default),
--   owner(text), target_date(date), is_archived(bool), is_seeded(bool),
--   dependencies(jsonb NOT NULL default '[]')
-- NOT included: workstream_id (FK dropped), description, contributors, etc (use defaults)
-- ============================================================

-- Workspace 1: EndoScribe Core & Template Engine
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('ECT-001','Refine EndoScribe template architecture','endoscribe-core-template-engine','Template architecture','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-002','Break template refinement into ERCP, EUS, and colonoscopy tracks','endoscribe-core-template-engine','Template architecture','Not started','Medium',NULL,NULL,false,true,'["ECT-001"]'),
('ECT-003','Expand template coverage including ileoscopy','endoscribe-core-template-engine','Template architecture','Not started','Medium',NULL,NULL,false,true,'["ECT-001"]'),
('ECT-004','Define handling for uncommon procedures without templates','endoscribe-core-template-engine','Template architecture','Not started','Medium',NULL,NULL,false,true,'["ECT-001"]'),
('ECT-005','Define multi-agentic adaptive template framework','endoscribe-core-template-engine','Multi-agentic framework','Not started','Medium',NULL,NULL,false,true,'["ECT-001"]'),
('ECT-006','Explore provider/site-specific template adaptation','endoscribe-core-template-engine','Multi-agentic framework','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-007','Document EndoScribe note-taking workflow','endoscribe-core-template-engine','Clinician workflow','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-008','Draft clinician dictation guidance','endoscribe-core-template-engine','Clinician workflow','Not started','Medium',NULL,NULL,false,true,'["ECT-007"]'),
('ECT-009','Create endoscope guidance user guide/protocol','endoscribe-core-template-engine','Clinician workflow','Not started','Medium','Richu',NULL,false,true,'["ECT-007"]'),
('ECT-010','Define clinician editing of AI-generated notes','endoscribe-core-template-engine','Clinician workflow','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-011','Define voice-activation options for start/pause','endoscribe-core-template-engine','Voice activation','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-012','Explore keyword-prioritization alternative','endoscribe-core-template-engine','Voice activation','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-013','Define relevant procedure-room speech identification','endoscribe-core-template-engine','Voice activation','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-014','Define patient-identifier masking requirements','endoscribe-core-template-engine','Transcript safety','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-015','Define transcript filtering before model use','endoscribe-core-template-engine','Transcript safety','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-016','Define safety when clinical content overlaps masked content','endoscribe-core-template-engine','Transcript safety','Not started','Medium',NULL,NULL,false,true,'[]'),
('ECT-017','Share cataloged recordings/transcripts with Sathvik','endoscribe-core-template-engine','Clinician workflow','Not started','High','Richu','2026-05-17',false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, priority=EXCLUDED.priority, owner=COALESCE(EXCLUDED.owner,tasks.owner), target_date=COALESCE(EXCLUDED.target_date,tasks.target_date), is_archived=false;

-- Workspace 2: Voice, ASR & Room Workflow
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('VAR-001','Continue Med ASR clinical accuracy evaluation','voice-asr-room-workflow','ASR evaluation','Not started','High','Sathvik','2026-05-20',false,true,'[]'),
('VAR-002','Compare Med ASR with other transcription models','voice-asr-room-workflow','ASR evaluation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VAR-003','Evaluate WER, CER, terminology, and clinical accuracy','voice-asr-room-workflow','ASR evaluation','Not started','Medium',NULL,NULL,false,true,'["VAR-001"]'),
('VAR-004','Decide preferred transcription model','voice-asr-room-workflow','ASR evaluation','Not started','Medium',NULL,NULL,false,true,'["VAR-003"]'),
('VAR-005','Design phone vs OR microphone experiment','voice-asr-room-workflow','Microphone testing','Not started','Medium',NULL,NULL,false,true,'[]'),
('VAR-006','Perform phone microphone testing','voice-asr-room-workflow','Microphone testing','Not started','High','Richu',NULL,false,true,'["VAR-005"]'),
('VAR-007','Perform OR/external microphone testing','voice-asr-room-workflow','Microphone testing','Not started','High','Richu',NULL,false,true,'["VAR-005"]'),
('VAR-008','Compare transcription quality and setup burden','voice-asr-room-workflow','Microphone testing','Not started','Medium',NULL,NULL,false,true,'["VAR-006","VAR-007"]'),
('VAR-009','Decide recommended audio-capture workflow','voice-asr-room-workflow','Microphone testing','Not started','Medium',NULL,NULL,false,true,'["VAR-008"]'),
('VAR-010','Define multi-speaker problem in endoscopy room','voice-asr-room-workflow','Multi-speaker','Not started','Medium',NULL,NULL,false,true,'[]'),
('VAR-011','Evaluate diarization vs content-based filtering','voice-asr-room-workflow','Multi-speaker','Not started','Medium',NULL,NULL,false,true,'["VAR-010"]'),
('VAR-012','Define intern project for multi-speaker problem','voice-asr-room-workflow','Multi-speaker','Not started','Medium','Swaroop / Intern',NULL,false,true,'["VAR-010"]'),
('VAR-013','Test noisy recordings with multiple speakers','voice-asr-room-workflow','Multi-speaker','Not started','Medium',NULL,NULL,false,true,'["VAR-010"]'),
('VAR-014','Schedule intern onboarding','voice-asr-room-workflow','Multi-speaker','Not started','Medium','Priya / Richu / Sathvik',NULL,false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, priority=EXCLUDED.priority, owner=COALESCE(EXCLUDED.owner,tasks.owner), target_date=COALESCE(EXCLUDED.target_date,tasks.target_date), is_archived=false;

-- Workspace 3: PEPRisc & Prediction Models
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('PPM-001','Document PEPRisc workflow','peprisc-prediction-models','PEPRisc workflow','Not started','High','Richu',NULL,false,true,'[]'),
('PPM-002','Define fully hands-free PEPRisc integration','peprisc-prediction-models','PEPRisc workflow','Not started','Medium',NULL,NULL,false,true,'["PPM-001"]'),
('PPM-003','Define real-time PEPRisc calculation pathway','peprisc-prediction-models','PEPRisc workflow','Not started','Medium',NULL,NULL,false,true,'["PPM-002"]'),
('PPM-004','Define continuous vs triggered calculation','peprisc-prediction-models','PEPRisc workflow','Not started','Medium',NULL,NULL,false,true,'["PPM-003"]'),
('PPM-005','Define PEPRisc output logging','peprisc-prediction-models','PEPRisc workflow','Not started','Medium',NULL,NULL,false,true,'["PPM-003"]'),
('PPM-006','Add PEPRisc prospective evaluation to IRB','peprisc-prediction-models','Prospective evaluation','Not started','Medium',NULL,NULL,false,true,'[]'),
('PPM-007','Define shadow-mode vs visible output','peprisc-prediction-models','Prospective evaluation','Not started','Medium',NULL,NULL,false,true,'["PPM-006"]'),
('PPM-008','Define PEPRisc ground-truth comparison','peprisc-prediction-models','Prospective evaluation','Not started','Medium',NULL,NULL,false,true,'["PPM-006"]'),
('PPM-009','Separate PEPRisc from EndoScribe validation','peprisc-prediction-models','Prospective evaluation','Not started','Medium',NULL,NULL,false,true,'[]'),
('PPM-010','Define prediction-model drift identification','peprisc-prediction-models','Model monitoring','Not started','Medium',NULL,NULL,false,true,'[]'),
('PPM-011','Define drift handling strategy','peprisc-prediction-models','Model monitoring','Not started','Medium',NULL,NULL,false,true,'["PPM-010"]'),
('PPM-012','Define staging vs production monitoring','peprisc-prediction-models','Model monitoring','Not started','Medium',NULL,NULL,false,true,'[]'),
('PPM-013','Define retraining/model-update pathway','peprisc-prediction-models','Model monitoring','Not started','Medium',NULL,NULL,false,true,'["PPM-010"]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, priority=EXCLUDED.priority, owner=COALESCE(EXCLUDED.owner,tasks.owner), target_date=COALESCE(EXCLUDED.target_date,tasks.target_date), is_archived=false;

-- Workspace 4: Recommendation Engine
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('REC-001','Reset/review recommendation listing','recommendation-engine','Engine reset','Not started','Medium',NULL,NULL,false,true,'[]'),
('REC-002','Refine ERCP recommendation logic','recommendation-engine','Engine reset','Not started','Medium',NULL,NULL,false,true,'["REC-001"]'),
('REC-003','Refine colonoscopy recommendation logic','recommendation-engine','Engine reset','Not started','Medium',NULL,NULL,false,true,'["REC-001"]'),
('REC-004','Expand recommendation logic to EUS','recommendation-engine','Engine reset','Not started','Medium',NULL,NULL,false,true,'["REC-001"]'),
('REC-005','Define society guidance currency','recommendation-engine','Engine reset','Not started','Medium',NULL,NULL,false,true,'[]'),
('REC-006','Define recommendation validation approach','recommendation-engine','Validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('REC-007','Separate recommendation validation from PEPRisc/EndoScribe','recommendation-engine','Validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('REC-008','Define ground truth for recommendations','recommendation-engine','Validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('REC-009','Define initial MVP recommendation set','recommendation-engine','Validation','Not started','Medium',NULL,NULL,false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, is_archived=false;

-- Workspace 5: Analytics & Quality
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('AQ-001','Define provider-level analytics requirements','analytics-quality','Provider analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-002','Define cannulation success-rate reporting','analytics-quality','Provider analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-003','Define difficult-cannulation analytics','analytics-quality','Provider analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-004','Define procedure-mix analytics','analytics-quality','Provider analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-005','Define provider-level complication metrics','analytics-quality','Provider analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-006','Define facility-level analytics requirements','analytics-quality','Facility analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-007','Define facility-level procedure mix','analytics-quality','Facility analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-008','Define facility-level success-rate reporting','analytics-quality','Facility analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-009','Define facility-level complication-rate reporting','analytics-quality','Facility analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-010','Define future benchmarking concepts','analytics-quality','Facility analytics','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-011','Define EndoScribe program KPIs','analytics-quality','KPI framework','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-012','Define transcription quality metrics','analytics-quality','KPI framework','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-013','Define note-quality metrics','analytics-quality','KPI framework','Not started','Medium',NULL,NULL,false,true,'[]'),
('AQ-014','Define leadership dashboard metrics','analytics-quality','KPI framework','Not started','Medium',NULL,NULL,false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, is_archived=false;

-- Workspace 6: Infrastructure & Deployment Strategy
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('IDS-001','Create systems architecture diagram','infrastructure-deployment-strategy','Architecture','Not started','High','Sathvik','2026-05-17',false,true,'[]'),
('IDS-002','Define data flow: procedure to report','infrastructure-deployment-strategy','Architecture','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-003','Define data object storage locations','infrastructure-deployment-strategy','Architecture','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-004','Define online vs offline processing','infrastructure-deployment-strategy','Architecture','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-005','Define prospective study workflow support','infrastructure-deployment-strategy','Architecture','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-006','Define short-term MVP deployment strategy','infrastructure-deployment-strategy','Deployment','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-007','Define long-term deployment strategy','infrastructure-deployment-strategy','Deployment','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-008','Evaluate Hopkins/DSAI cluster or GPU options','infrastructure-deployment-strategy','Deployment','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-009','Evaluate on-prem vs cloud deployment','infrastructure-deployment-strategy','Deployment','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-010','Define clinical-scale deployment requirements','infrastructure-deployment-strategy','Deployment','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-011','Define database strategy','infrastructure-deployment-strategy','Database/Queue','Not started','Medium',NULL,NULL,false,true,'["IDS-001"]'),
('IDS-012','Define analytical database options','infrastructure-deployment-strategy','Database/Queue','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-013','Define queue/async processing strategy','infrastructure-deployment-strategy','Database/Queue','Not started','Medium',NULL,NULL,false,true,'["IDS-011"]'),
('IDS-014','Define offline/online inference interaction','infrastructure-deployment-strategy','Database/Queue','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-015','Define latency-sensitive processing','infrastructure-deployment-strategy','Database/Queue','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-016','Define CI/CD requirements','infrastructure-deployment-strategy','CI/CD','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-017','Define MVP deployment pipeline','infrastructure-deployment-strategy','CI/CD','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-018','Define model deployment process','infrastructure-deployment-strategy','CI/CD','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-019','Define staging and production environments','infrastructure-deployment-strategy','CI/CD','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-020','Define monitoring and rollback','infrastructure-deployment-strategy','CI/CD','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-021','Explore federated learning architecture','infrastructure-deployment-strategy','Federated learning','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-022','Evaluate model weight sharing without data','infrastructure-deployment-strategy','Federated learning','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-023','Define multi-site model-update aggregation','infrastructure-deployment-strategy','Federated learning','Not started','Medium',NULL,NULL,false,true,'[]'),
('IDS-024','Define multi-center prospective validation support','infrastructure-deployment-strategy','Federated learning','Not started','Medium',NULL,NULL,false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, priority=EXCLUDED.priority, owner=COALESCE(EXCLUDED.owner,tasks.owner), target_date=COALESCE(EXCLUDED.target_date,tasks.target_date), is_archived=false;

-- Workspace 7: Validation, Regulatory & Translation
INSERT INTO tasks (id, title, workspace, epic, status, priority, owner, target_date, is_archived, is_seeded, dependencies) VALUES
('VRT-001','Define EndoScribe prospective validation study','validation-regulatory-translation','Prospective validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-002','Define PEPRisc prospective validation study','validation-regulatory-translation','Prospective validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-003','Define recommendation-engine validation study','validation-regulatory-translation','Prospective validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-004','Define shadow-mode/non-interventional design','validation-regulatory-translation','Prospective validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-005','Define pilot launch criteria','validation-regulatory-translation','Prospective validation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-006','Update IRB for ASGE goals, aims, protocol','validation-regulatory-translation','IRB amendment','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-007','Add prospective EndoScribe evaluation to IRB','validation-regulatory-translation','IRB amendment','Not started','Medium',NULL,NULL,false,true,'["VRT-006"]'),
('VRT-008','Add PEPRisc prospective evaluation to IRB','validation-regulatory-translation','IRB amendment','Not started','Medium',NULL,NULL,false,true,'["VRT-006"]'),
('VRT-009','Add data-flow and masking language to IRB','validation-regulatory-translation','IRB amendment','Not started','Medium',NULL,NULL,false,true,'["ECT-014"]'),
('VRT-010','Draft IRB amendment for prospective study','validation-regulatory-translation','IRB amendment','Not started','High','Richu',NULL,false,true,'["VRT-006","VRT-007","VRT-008","VRT-009"]'),
('VRT-011','Prepare FDA Pre-Sub meeting and question list','validation-regulatory-translation','FDA preparation','Not started','Medium',NULL,NULL,false,true,'[]'),
('VRT-012','Build full EndoScribe/PEPRisc roadmap','validation-regulatory-translation','Prospective validation','Not started','High','Richu / Priya / Sathvik','2026-05-17',false,true,'[]')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, workspace=EXCLUDED.workspace, epic=EXCLUDED.epic, priority=EXCLUDED.priority, owner=COALESCE(EXCLUDED.owner,tasks.owner), target_date=COALESCE(EXCLUDED.target_date,tasks.target_date), is_archived=false;

-- ============================================================
-- 3. Milestones
-- ============================================================
INSERT INTO milestones (id, title, description, status) VALUES
('MS-P01','Core template architecture locked','Template architecture, procedure coverage plan, voice activation design, and transcript safety requirements defined.','Not started'),
('MS-P02','ASR and room workflow validated','Med ASR evaluated, microphone testing complete, multi-speaker approach defined, recommended audio workflow decided.','Not started'),
('MS-P03','PEPRisc integration designed','Real-time PEPRisc pathway defined, prospective evaluation planned, model monitoring strategy documented.','Not started'),
('MS-P04','Infrastructure architecture complete','Systems architecture, deployment strategy, database/queue design, CI/CD pipeline, and federated learning pathway documented.','Not started'),
('MS-P05','IRB and regulatory readiness','IRB amendment drafted, prospective validation designed, FDA Pre-Sub preparation started.','Not started'),
('MS-P06','Recommendation and analytics framework','Recommendation engine logic refined, analytics requirements defined, KPI framework established.','Not started')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description;

SELECT 'Migration 016 complete: ' ||
  (SELECT count(*) FROM tasks WHERE id LIKE 'ECT-%' OR id LIKE 'VAR-%' OR id LIKE 'PPM-%' OR id LIKE 'REC-%' OR id LIKE 'AQ-%' OR id LIKE 'IDS-%' OR id LIKE 'VRT-%') ||
  ' tasks seeded, ' || (SELECT count(*) FROM milestones WHERE id LIKE 'MS-P%') || ' milestones, ' ||
  (SELECT count(*) FROM workspace_groups WHERE is_visible = true) || ' workspaces active' as result;
