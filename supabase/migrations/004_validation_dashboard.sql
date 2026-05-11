-- Migration 004: Validation Science Dashboard
-- Tracks evidence-generation items for EndoScribe + PEPRisc.
-- Does NOT contain PHI or patient-level validation data.
-- Run this in the Supabase SQL Editor.

create table if not exists validation_items (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  validation_domain    text not null,
  status               text not null default 'Not started',
  priority             text not null default 'Medium',
  owner                text,
  due_date             date,
  related_task_ids     jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  metric_type          text,
  metric_name          text,
  target_threshold     text,
  current_result       text,
  sample_size          text,
  dataset_stage        text,
  evidence_stage       text,
  failure_mode         text,
  clinical_materiality text,
  gap                  text,
  decision_needed      text,
  next_action          text,
  notes                text,
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger validation_items_updated_at
  before update on validation_items
  for each row execute function set_updated_at();

alter table validation_items enable row level security;

create policy "Authenticated can read validation_items"
  on validation_items for select to authenticated using (true);

create policy "Editors can manage validation_items"
  on validation_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Seed validation items
INSERT INTO validation_items (title, validation_domain, status, priority, metric_type, metric_name, target_threshold, current_result, dataset_stage, evidence_stage, gap, next_action, notes, related_task_ids) VALUES
('Compare phone microphone vs OR-level microphone', 'Audio Capture', 'Not started', 'High', 'Accuracy', 'WER/CER difference by mic type', 'TBD', '', 'Development dataset', 'Internal validation', 'No microphone comparison data yet', 'Design comparison experiment', 'Test under simulated OR noise conditions', '["AUDIO-001", "AUDIO-002", "AUDIO-003"]'),
('Evaluate ASR word error rate on ERCP recordings', 'ASR / Transcription', 'Not started', 'High', 'Error rate', 'WER', 'TBD (literature: 5-15% medical ASR)', '', 'Curated 10-case set', 'Internal validation', 'No WER data on ERCP audio yet', 'Set up Whisper evaluation environment', '', '["ASR-001", "ASR-002", "DATA-002"]'),
('Evaluate ASR character error rate', 'ASR / Transcription', 'Not started', 'High', 'Error rate', 'CER', 'TBD', '', 'Curated 10-case set', 'Internal validation', 'No CER data yet', 'Include CER in ASR evaluation script', '', '["ASR-002"]'),
('Evaluate GI/ERCP medical terminology error rate', 'ASR / Transcription', 'Not started', 'High', 'Error rate', 'Terminology error rate', 'TBD', '', 'Curated 10-case set', 'Internal validation', 'ERCP-specific terminology accuracy unknown', 'Build ERCP term list for evaluation', 'Key terms: cannulation, sphincterotomy, pancreatography, papilla', '["ASR-002", "ASR-004"]'),
('Evaluate ASR latency for real-time feasibility', 'ASR / Transcription', 'Not started', 'Medium', 'Latency', 'Seconds to transcript', '< 30 seconds for near-real-time', '', 'Development dataset', 'Development', 'Latency not benchmarked', 'Benchmark Whisper inference time', '', '["ASR-002", "INFRA-002"]'),
('Evaluate primary endoscopist speaker detection', 'Speaker Diarization', 'Not started', 'High', 'Accuracy', 'Speaker attribution accuracy', 'TBD (> 90% target)', '', 'Curated 10-case set', 'Internal validation', 'No diarization prototype yet', 'Evaluate diarization libraries', '', '["DIAR-001", "DIAR-002", "DIAR-003"]'),
('Evaluate cross-talk exclusion accuracy', 'Speaker Diarization', 'Not started', 'Medium', 'Error rate', 'False attribution rate', 'TBD', '', 'Curated 10-case set', 'Internal validation', 'Cross-talk handling not tested', 'Define attribution accuracy metrics', '', '["DIAR-001", "DIAR-003"]'),
('Validate extraction of binary PEPRisc variables', 'Variable Extraction', 'Not started', 'High', 'Accuracy', 'Sensitivity, specificity, PPV, NPV, F1', 'F1 > 0.85 target', '', 'Curated 10-case set', 'Internal validation', 'No extraction pipeline built yet', 'Map PEPRisc variables to dictation phrases', '', '["VALID-003", "PEP-002", "PEP-004"]'),
('Validate extraction of continuous PEPRisc variables', 'Variable Extraction', 'Not started', 'High', 'Agreement', 'MAE, ICC', 'ICC > 0.80 target', '', 'Curated 10-case set', 'Internal validation', 'Continuous variable extraction not built', 'Design extraction approach for numeric variables', '', '["VALID-003", "PEP-004"]'),
('Compare EndoScribe-derived PEPRisc risk with manual abstraction', 'PEPRisc Output', 'Not started', 'Critical', 'Agreement', 'Bland-Altman agreement', 'Mean difference < 5% absolute risk', '', 'Curated 10-case set', 'Internal validation', 'No EndoScribe-derived PEPRisc scores exist yet', 'Define comparison methodology', 'This is a key validation endpoint', '["PEP-004", "VALID-004"]'),
('Evaluate PEPRisc calibration and discrimination', 'Calibration / Discrimination', 'Not started', 'High', 'Calibration', 'Calibration slope, AUC', 'AUC and calibration TBD pending outcome data', '', 'Prospective shadow cohort', 'Prospective validation', 'Outcome data not yet available', 'Plan outcome data collection after shadow launch', 'DeLong comparison if comparing model versions', '["VALID-004", "PEP-005"]'),
('Define workflow completion rate', 'Workflow Feasibility', 'Not started', 'High', 'Feasibility', 'Case completion rate', '> 80% target', '', 'Prospective shadow cohort', 'Prospective validation', 'No shadow workflow data yet', 'Define completion criteria', '', '["VALID-005", "CLIN-001"]'),
('Define time-to-output feasibility', 'Workflow Feasibility', 'Not started', 'Medium', 'Latency', 'Minutes from dictation to risk output', '< 5 minutes target', '', 'Prospective shadow cohort', 'Prospective validation', 'End-to-end latency not measured', 'Design latency measurement protocol', '', '["VALID-005", "PEP-003"]'),
('Build failure-mode taxonomy', 'Failure Mode / Safety', 'Not started', 'High', 'Safety', 'Taxonomy completeness', 'All major failure modes cataloged', '', 'Development dataset', 'Development', 'No failure-mode taxonomy exists', 'Review AI clinical error literature', '', '["VALID-006"]'),
('Define clinically material error review process', 'Clinical Materiality', 'Not started', 'High', 'Safety', 'Expert review classification', 'Reviewer agreement kappa > 0.70', '', 'Development dataset', 'Internal validation', 'No clinical materiality framework defined', 'Design expert review protocol', '', '["VALID-006", "FDA-005"]'),
('Define prospective shadow validation dataset and ground-truth process', 'Prospective Shadow Validation', 'Not started', 'Critical', 'Other', 'Cohort size, ground-truth completeness', '> 50 cases for initial shadow', '', 'Prospective shadow cohort', 'Prospective validation', 'Shadow protocol not finalized', 'Complete IRB and workflow design first', 'Requires IRB approval before patient data collection', '["CLIN-001", "DATA-003", "VALID-001", "VALID-002", "VALID-003", "VALID-004"]');
