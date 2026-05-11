-- Migration 003: IRB / HIPAA / Hopkins IT Governance Dashboard
-- Stores institutional governance items for EndoScribe + PEPRisc.
-- This table does NOT contain PHI. It tracks governance planning metadata only.
-- Run this in the Supabase SQL Editor.

create table if not exists governance_items (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  category             text not null,
  status               text not null default 'Not started',
  priority             text not null default 'Medium',
  owner                text,
  due_date             date,
  related_task_ids     jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  phi_involved         boolean not null default false,
  data_type            text,
  data_location        text,
  compute_location     text,
  irb_status           text default 'Not assessed',
  hipaa_risk           text default 'Unknown',
  hopkins_it_status    text default 'Not assessed',
  approval_needed      text,
  current_state        text,
  gap                  text,
  decision_needed      text,
  next_action          text,
  notes                text,
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger governance_items_updated_at
  before update on governance_items
  for each row execute function set_updated_at();

alter table governance_items enable row level security;

create policy "Authenticated can read governance_items"
  on governance_items for select to authenticated using (true);

create policy "Editors can manage governance_items"
  on governance_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Seed governance items
INSERT INTO governance_items (title, category, status, priority, phi_involved, hipaa_risk, irb_status, hopkins_it_status, approval_needed, current_state, gap, decision_needed, next_action, notes, related_task_ids) VALUES
('Determine whether IRB amendment is required for EndoScribe + PEPRisc shadow validation', 'IRB Amendment', 'Not started', 'Critical', true, 'High', 'Not assessed', 'Not assessed', 'IRB office determination', 'Current protocol may not cover AI transcription and risk scoring', 'Amendment coverage for audio capture, AI transcription, variable extraction, PEPRisc', 'Does current IRB cover planned activities?', 'Review current IRB protocol', 'Amendment process may delay timeline', '["IRB-001", "IRB-002"]'),
('Draft IRB amendment language for audio, AI transcription, extraction, and PEPRisc', 'IRB Amendment', 'Not started', 'High', true, 'High', 'Amendment likely needed', 'Not assessed', 'IRB approval of amendment', 'Amendment not yet drafted', 'Draft language needed', NULL, 'Draft amendment after IRB-001 assessment', '', '["IRB-002"]'),
('Review whether consent language must mention AI transcription and risk-score generation', 'Consent Language', 'Not started', 'High', true, 'High', 'Not assessed', 'Not assessed', 'IRB/PI determination', 'Current consent may not mention AI', 'Consent may need AI-specific language', 'Does consent need AI transcription and risk-score language?', 'Review current consent form', '', '["IRB-006"]'),
('Define approved workflow for patient audio recording during ERCP', 'Audio Recording', 'Not started', 'High', true, 'High', 'Not assessed', 'Not assessed', 'IRB + clinical workflow approval', 'No formal audio capture workflow exists', 'Need IRB-approved recording protocol', NULL, 'Design workflow after IRB approval', 'Do not proceed without IRB approval', '["AUDIO-004", "IRB-002"]'),
('Define where raw audio may be stored', 'Storage / Access Control', 'Not started', 'High', true, 'High', 'Not assessed', 'Needs review', 'Hopkins IT + IRB confirmation', 'Storage location not confirmed', 'Need Hopkins-approved location for patient audio', NULL, 'Contact Hopkins IT for approved storage', '', '["IRB-004"]'),
('Define where transcripts may be stored', 'Storage / Access Control', 'Not started', 'High', true, 'High', 'Not assessed', 'Needs review', 'Hopkins IT + IRB confirmation', 'Storage location not confirmed', 'Transcripts contain PHI and need approved storage', NULL, 'Identify Hopkins-approved transcript storage', '', '["IRB-004"]'),
('Define where derived PEPRisc variables and model outputs may be stored', 'PHI Data Flow', 'Not started', 'High', true, 'High', 'Not assessed', 'Needs review', 'Hopkins IT + IRB', 'Not yet defined', 'Derived data may contain PHI; storage needs approval', NULL, 'Map PHI touchpoints in PEPRisc pipeline', '', '["PLATFORM-002", "IRB-004", "PEP-003"]'),
('Determine approved compute for ASR and PEPRisc inference', 'Secure Compute', 'Not started', 'High', true, 'High', 'Not assessed', 'Needs review', 'Hopkins IT approval + possible BAA', 'Not yet decided', 'Need HIPAA-compliant compute for PHI processing', 'Where should ASR and PEPRisc run?', 'Research Hopkins-approved compute options', 'Options: local GPU, JHU Discovery, Hopkins server, secure cloud', '["INFRA-001", "INFRA-002", "ASR-003"]'),
('Confirm all personnel with data access are listed on IRB', 'Personnel Access', 'Not started', 'High', true, 'Moderate', 'Not assessed', 'Not assessed', 'IRB personnel list update', 'Team list may be incomplete', 'All data-access personnel must be on IRB', NULL, 'Review IRB personnel list', '', '["IRB-003"]'),
('Prohibit PHI entry into public AI tools or unapproved external endpoints', 'External Tool Restriction', 'Not started', 'Critical', true, 'High', 'Not assessed', 'Not assessed', 'Team acknowledgment + policy documentation', 'No formal policy documented', 'PHI boundary rule not formally documented', NULL, 'Draft PHI boundary rule document', 'No PHI should leave Hopkins-approved environments', '["IRB-005", "ASR-003"]'),
('Define de-identification rules for metadata exports and reports', 'Data De-identification', 'Not started', 'Medium', true, 'Moderate', 'Not assessed', 'Not assessed', 'IRB/HIPAA de-ID standard', 'Not yet defined', 'Re-identification risk must be assessed', NULL, 'Define de-identification requirements', '', '["DATA-005"]'),
('Define audit-trail requirements for access and model outputs', 'Audit Trail', 'Not started', 'High', true, 'Moderate', 'Not assessed', 'Needs review', 'Hopkins IT + regulatory', 'Not yet specified', 'Need audit logging for HIPAA and regulatory compliance', NULL, 'Draft audit-trail specification', '', '["PLATFORM-005", "INFRA-004"]'),
('Define Hopkins IT review pathway for compute options', 'Hopkins IT Review', 'Not started', 'High', false, 'Moderate', 'Not assessed', 'Not assessed', 'Hopkins IT assessment', 'Not yet engaged', 'Need IT review of local GPU, Discovery, and managed server options', NULL, 'Research available options and engage Hopkins IT', '', '["INFRA-001", "INFRA-002", "INFRA-003"]'),
('Define prospective shadow workflow from governance perspective', 'Prospective Shadow Workflow', 'Not started', 'Critical', true, 'High', 'Not assessed', 'Not assessed', 'IRB + PI + Hopkins IT', 'Shadow workflow not yet designed from governance perspective', 'Need IRB-approved, HIPAA-compliant shadow protocol', 'PI approval of governance-compliant shadow design', 'Draft shadow workflow after IRB assessment', '', '["CLIN-001", "CLIN-002", "IRB-001", "IRB-002"]');
