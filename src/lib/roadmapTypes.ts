// Core types for the EndoScribe + PEPRisc Roadmap OS

export const TASK_STATUSES = ["Not started", "In progress", "Blocked", "Complete", "Deferred"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REGULATORY_LEVELS = ["None", "Low", "Moderate", "High"] as const;
export type RegulatoryRelevance = (typeof REGULATORY_LEVELS)[number];
export type HIPAARelevance = (typeof REGULATORY_LEVELS)[number];

export const EVIDENCE_STAGES = [
  "Concept", "Development", "Internal validation",
  "Prospective validation", "Regulatory planning",
  "Translation", "Future module",
] as const;
export type EvidenceStage = (typeof EVIDENCE_STAGES)[number];

export interface Workstream {
  id: string;
  label: string;
  purpose: string;
  owner: string;
  status: string;
}

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  workstream_id: string;
  owner: string;
  contributors: string[];
  status: TaskStatus;
  priority: Priority;
  start_date: string | null;
  target_date: string | null;
  dependencies: string[];
  deliverables: string[];
  blockers: string[];
  risks: string[];
  decision_needed: string;
  regulatory_relevance: RegulatoryRelevance;
  hipaa_relevance: HIPAARelevance;
  evidence_stage: EvidenceStage;
  gsd_goal: string;
  next_action: string;
  notes: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role: string;
  notes: string | null;
}

export interface TaskWithAssignees extends RoadmapTask {
  assignees: Profile[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string | null;
  status: string;
  workstream_id: string | null;
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  mitigation: string;
  owner: string;
  status: string;
  related_task_ids: string[];
}

export interface DecisionItem {
  id: string;
  title: string;
  description: string;
  decision_needed: string;
  owner: string;
  status: string;
  due_date: string | null;
  related_task_ids: string[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "editor" | "viewer";
}

// ---------------------------------------------------------------------------
// Regulatory
// ---------------------------------------------------------------------------
export const REGULATORY_CATEGORIES = [
  "Intended Use", "CDS Criteria", "SaMD / Device Function",
  "Platform vs Module", "Human-in-the-Loop", "Risk Analysis",
  "Validation Evidence", "FDA Pre-Submission",
  "AI Lifecycle / Change Control", "Industry / Partner Pathway",
] as const;
export type RegulatoryCategory = (typeof REGULATORY_CATEGORIES)[number];

export const REGULATORY_ITEM_STATUSES = [
  "Not started", "In progress", "Needs decision", "Under review", "Complete", "Deferred",
] as const;
export type RegulatoryItemStatus = (typeof REGULATORY_ITEM_STATUSES)[number];

export const REGULATORY_RISK_LEVELS = ["Low", "Moderate", "High", "Unknown"] as const;
export type RegulatoryRiskLevel = (typeof REGULATORY_RISK_LEVELS)[number];

// ---------------------------------------------------------------------------
// Governance (IRB / HIPAA / Hopkins IT)
// ---------------------------------------------------------------------------
export const GOVERNANCE_CATEGORIES = [
  "IRB Amendment", "Consent Language", "Audio Recording",
  "AI Transcription", "PHI Data Flow", "Storage / Access Control",
  "Secure Compute", "Personnel Access", "Hopkins IT Review",
  "External Tool Restriction", "Data De-identification",
  "Audit Trail", "Prospective Shadow Workflow",
] as const;
export type GovernanceCategory = (typeof GOVERNANCE_CATEGORIES)[number];

export const GOVERNANCE_ITEM_STATUSES = [
  "Not started", "In progress", "Needs decision", "Under review",
  "Approved", "Complete", "Deferred", "Blocked",
] as const;

export const HIPAA_RISK_LEVELS = ["Low", "Moderate", "High", "Unknown"] as const;
export const IRB_STATUS_VALUES = [
  "Not assessed", "Amendment likely needed", "Amendment drafted",
  "Submitted", "Approved", "Not required", "Unknown",
] as const;
export const HOPKINS_IT_STATUS_VALUES = [
  "Not assessed", "Needs review", "Under review",
  "Approved", "Not approved", "Unknown",
] as const;

export interface GovernanceItem {
  id: string;
  title: string;
  description: string;
  category: GovernanceCategory | string;
  status: string;
  priority: string;
  owner: string;
  due_date: string | null;
  related_task_ids: string[];
  related_decision_ids: string[];
  phi_involved: boolean;
  data_type: string;
  data_location: string;
  compute_location: string;
  irb_status: string;
  hipaa_risk: string;
  hopkins_it_status: string;
  approval_needed: string;
  current_state: string;
  gap: string;
  decision_needed: string;
  next_action: string;
  notes: string;
}

export interface RegulatoryItem {
  id: string;
  title: string;
  description: string;
  category: RegulatoryCategory | string;
  status: RegulatoryItemStatus | string;
  priority: string;
  owner: string;
  due_date: string | null;
  related_task_ids: string[];
  related_decision_ids: string[];
  regulatory_risk: RegulatoryRiskLevel | string;
  evidence_needed: string;
  current_evidence: string;
  decision_needed: string;
  next_action: string;
  notes: string;
}
