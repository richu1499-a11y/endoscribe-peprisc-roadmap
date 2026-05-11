-- Migration 002: Regulatory Dashboard
-- Stores FDA/regulatory strategy items for the EndoScribe + PEPRisc project.
-- This table does NOT contain PHI. It tracks regulatory planning metadata only.
-- Run this in the Supabase SQL Editor.

create table if not exists regulatory_items (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  category            text not null,
  status              text not null default 'Not started',
  priority            text not null default 'Medium',
  owner               text,
  due_date            date,
  related_task_ids    jsonb not null default '[]',
  related_decision_ids jsonb not null default '[]',
  regulatory_risk     text default 'Unknown',
  evidence_needed     text,
  current_evidence    text,
  decision_needed     text,
  next_action         text,
  notes               text,
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger regulatory_items_updated_at
  before update on regulatory_items
  for each row execute function set_updated_at();

alter table regulatory_items enable row level security;

create policy "Authenticated can read regulatory_items"
  on regulatory_items for select to authenticated using (true);

create policy "Editors can manage regulatory_items"
  on regulatory_items for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor'))
  );

-- Seed regulatory items
INSERT INTO regulatory_items (title, description, category, status, priority, regulatory_risk, evidence_needed, decision_needed, next_action, related_task_ids, notes) VALUES
('Define intended use for EndoScribe documentation function', 'Intended-use statement for transcription and structured note generation with human review.', 'Intended Use', 'Not started', 'High', 'Low', 'Clinical workflow description, output examples, human review protocol', 'PI sign-off on intended-use statement', 'Draft intended-use statement', '["FDA-001"]', 'Documentation-only function with human review likely falls outside FDA device regulation.'),
('Define intended use for PEPRisc shadow-mode research function', 'Intended-use statement for PEPRisc operating in non-interventional shadow mode during ERCP.', 'Intended Use', 'Not started', 'High', 'Low', 'Shadow protocol, non-interventional design, research-only output handling', 'PI sign-off; confirm research-only framing', 'Draft shadow-mode intended-use statement', '["FDA-002", "PEP-003"]', 'Research-only shadow mode does not drive clinical decisions.'),
('Determine whether clinician-facing PEPRisc output changes regulatory classification', 'If PEPRisc output is shown to clinicians and influences procedural decisions, the regulatory classification may shift from non-device CDS to SaMD.', 'SaMD / Device Function', 'Not started', 'Critical', 'High', 'Regulatory precedent analysis, FDA CDS guidance review, legal review', 'PI decision on output audience; regulatory counsel if needed', 'Review FDA CDS guidance four-prong test', '["FDA-003", "CLIN-002"]', 'This is the key regulatory inflection point.'),
('Assess FDA non-device CDS criteria', 'Evaluate whether EndoScribe and PEPRisc meet the 21st Century Cures Act four-prong test for non-device CDS.', 'CDS Criteria', 'Not started', 'High', 'Moderate', 'Four-prong analysis document, intended-use statements, output format documentation', 'Does EndoScribe/PEPRisc qualify as non-device CDS?', 'Review FDA CDS guidance documents', '["FDA-003", "FDA-004"]', ''),
('Separate platform functions from clinical prediction modules', 'Distinguish EndoScribe platform functions (transcription, documentation) from clinical prediction modules (PEPRisc) for regulatory classification.', 'Platform vs Module', 'Not started', 'High', 'Moderate', 'Architecture diagram, function-by-function classification, regulatory risk tier table', NULL, 'Draft classification framework', '["FDA-004", "PLATFORM-001"]', 'Platform separation is important for future scalability.'),
('Define human-in-the-loop review and clinician oversight', 'Document how clinician review is integrated into EndoScribe output and PEPRisc risk estimates.', 'Human-in-the-Loop', 'Not started', 'High', 'Moderate', 'Workflow documentation, review protocol, override mechanisms', NULL, 'Draft human review protocol', '["CLIN-001"]', 'Human review is a key factor in CDS vs SaMD determination.'),
('Build risk analysis for incorrect, missing, or delayed PEPRisc output', 'Analyze clinical consequences of PEPRisc errors: false positives, false negatives, missing predictions, latency.', 'Risk Analysis', 'Not started', 'High', 'High', 'Failure-mode taxonomy, clinically material error analysis, safety assessment', NULL, 'Review literature on AI clinical error taxonomies', '["VALID-006", "PEP-004"]', ''),
('Define validation evidence package for shadow-mode PEPRisc', 'Specify what evidence is needed to support the shadow-mode validation study.', 'Validation Evidence', 'Not started', 'High', 'Moderate', 'ASR accuracy, variable extraction metrics, PEPRisc agreement, workflow feasibility', NULL, 'Define validation metrics specification', '["VALID-001", "VALID-003", "VALID-004", "PEP-004"]', ''),
('Draft FDA pre-submission question list', 'Prepare questions for a potential future FDA pre-submission meeting.', 'FDA Pre-Submission', 'Not started', 'Medium', 'Moderate', 'Intended-use statements, CDS analysis, platform/module classification, risk analysis', NULL, 'Draft question list after CDS assessment complete', '["FDA-006"]', ''),
('Track AI lifecycle and predetermined change-control considerations', 'Document AI lifecycle considerations for models that may be updated over time, including predetermined change-control plans.', 'AI Lifecycle / Change Control', 'Not started', 'Medium', 'Moderate', 'Model versioning plan, change triggers, revalidation protocol', NULL, 'Review FDA AI/ML lifecycle guidance', '["FDA-007", "PEP-005"]', ''),
('Define partner pathway if integrated with Olympus/JHTV', 'Map the regulatory implications of partnership or licensing with Olympus or through JHTV.', 'Industry / Partner Pathway', 'Not started', 'Low', 'Unknown', 'Partner regulatory responsibilities, device manufacturer vs software developer roles', NULL, 'Research typical partnership regulatory structures', '["TRANS-001", "TRANS-003"]', ''),
('Decide when PEPRisc moves from research-only to clinician-facing CDS', 'Determine the criteria and evidence threshold for transitioning PEPRisc from shadow/research mode to clinician-facing clinical decision support.', 'SaMD / Device Function', 'Not started', 'Critical', 'High', 'Validation results, regulatory analysis, PI approval, IRB amendment if needed', 'When is the evidence sufficient to support clinician-facing use?', 'Complete shadow validation first', '["PEP-004", "IRB-002", "FDA-003"]', 'This decision has cascading regulatory, IRB, and workflow implications.');
