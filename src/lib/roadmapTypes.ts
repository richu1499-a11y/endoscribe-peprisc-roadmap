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
  workspace?: string;
  is_seeded?: boolean;
  is_archived?: boolean;
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
  app_role?: "admin" | "user";
  is_protected_admin?: boolean;
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

// ---------------------------------------------------------------------------
// Validation Science
// ---------------------------------------------------------------------------
export const VALIDATION_DOMAINS = [
  "Audio Capture", "ASR / Transcription", "Speaker Diarization",
  "Variable Extraction", "PEPRisc Output", "Workflow Feasibility",
  "Failure Mode / Safety", "Prospective Shadow Validation",
  "Dataset Quality", "Human Review / Ground Truth",
  "Calibration / Discrimination", "Clinical Materiality",
] as const;

export const VALIDATION_ITEM_STATUSES = [
  "Not started", "In progress", "Data needed", "Analysis planned",
  "Analysis complete", "Needs review", "Complete", "Deferred", "Blocked",
] as const;

export const VALIDATION_METRIC_TYPES = [
  "Accuracy", "Agreement", "Error rate", "Latency", "Feasibility",
  "Calibration", "Discrimination", "Safety", "Qualitative", "Other",
] as const;

export const VALIDATION_DATASET_STAGES = [
  "Existing recordings", "Curated 10-case set", "Development dataset",
  "Internal validation", "Prospective shadow cohort",
  "Multicenter validation", "Future dataset",
] as const;

export interface ValidationItem {
  id: string;
  title: string;
  description: string;
  validation_domain: string;
  status: string;
  priority: string;
  owner: string;
  due_date: string | null;
  related_task_ids: string[];
  related_decision_ids: string[];
  metric_type: string;
  metric_name: string;
  target_threshold: string;
  current_result: string;
  sample_size: string;
  dataset_stage: string;
  evidence_stage: string;
  failure_mode: string;
  clinical_materiality: string;
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

// ---------------------------------------------------------------------------
// Dashboard Registry
// ---------------------------------------------------------------------------
export const DASHBOARD_CATEGORIES = [
  "Core", "Execution", "Strategy", "Governance", "Evidence", "Admin", "System", "Custom",
] as const;

export const DASHBOARD_REQUIRED_ROLES = ["viewer", "editor", "admin"] as const;

export const DASHBOARD_ICON_OPTIONS = [
  "LayoutDashboard", "Target", "Map", "GanttChart", "Network", "Shield",
  "Lock", "FlaskConical", "ListChecks", "Users", "LayoutGrid", "Wrench",
  "Settings", "FileText", "BarChart", "Globe", "Layers", "Clipboard",
] as const;

// ---------------------------------------------------------------------------
// Future Modules
// ---------------------------------------------------------------------------
export const FUTURE_MODULE_STATUSES = ["Concept", "Planning", "In progress", "Deferred", "Future", "Complete"] as const;
export const FUTURE_MODULE_CATEGORIES = ["AI Agent", "Computer Vision", "Prediction Model", "Validation", "Infrastructure", "Integration", "Other"] as const;

export interface FutureModule {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  owner: string;
  related_task_ids: string[];
  related_dashboard_ids: string[];
  target_phase: string;
  dependencies: string[];
  risks: string[];
  next_action: string;
  notes: string;
  order_index: number;
  is_visible: boolean;
}

// ---------------------------------------------------------------------------
// Milestone / Risk / Decision statuses
// ---------------------------------------------------------------------------
export const MILESTONE_STATUSES = ["Not started", "In progress", "Complete", "Deferred"] as const;
export const RISK_STATUSES = ["Open", "Mitigated", "Accepted", "Closed"] as const;
export const RISK_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const DECISION_STATUSES = ["Pending", "In discussion", "Decided", "Deferred"] as const;

// ---------------------------------------------------------------------------
// Admin Entity Registry + Page Settings
// ---------------------------------------------------------------------------
export const ADMIN_ENTITY_CATEGORIES = ["Core", "Planning", "Governance", "Evidence", "Custom"] as const;

export interface AdminEntityRegistryItem {
  id: string;
  slug: string;
  label: string;
  plural_label: string;
  description: string;
  entity_type: string;
  table_name: string;
  icon: string;
  category: string;
  order_index: number;
  is_visible: boolean;
  is_system: boolean;
  required_role: string;
  allow_create: boolean;
  allow_edit: boolean;
  allow_delete: boolean;
  allow_reorder: boolean;
  allow_archive: boolean;
  show_count: boolean;
  empty_state_title: string;
  empty_state_description: string;
  config: Record<string, unknown>;
}

export interface AdminPageSetting {
  id: string;
  page_key: string;
  title: string;
  subtitle: string;
  description: string;
  config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export const AUDIT_ACTIONS = [
  "created", "updated", "deleted", "archived", "unarchived",
  "role_changed", "visibility_changed", "reordered",
  "widget_config_updated", "linked", "unlinked",
] as const;

export const AUDIT_ENTITY_TYPES = [
  "task", "workstream", "milestone", "risk", "decision", "future_module",
  "regulatory_item", "governance_item", "validation_item",
  "dashboard", "dashboard_widget", "dashboard_task_link",
  "profile", "admin_entity_registry", "admin_page_settings",
] as const;

export const ROLE_OPTIONS = ["viewer", "editor", "admin"] as const;

export interface AdminAuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const DASHBOARD_WIDGET_TYPES = [
  "metric_cards", "task_table", "my_week", "assigned_tasks", "gantt",
  "network", "regulatory_items", "governance_items", "validation_items",
  "risk_register", "decision_log", "workload_summary", "health_warnings",
  "static_text", "linked_tasks", "custom_section",
] as const;

export const DASHBOARD_WIDGET_SOURCE_TYPES = [
  "tasks", "assignments", "workstreams", "timeline", "network",
  "regulatory_items", "governance_items", "validation_items",
  "risks", "decisions", "static",
] as const;

export const DASHBOARD_WIDGET_WIDTHS = ["full", "half", "third", "two_thirds"] as const;

export const DASHBOARD_TASK_SECTIONS = [
  "General", "This Week", "High Priority", "Regulatory", "Validation",
  "IRB/HIPAA", "Intern Tasks", "PI Review", "Backlog",
] as const;

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_key: string;
  title: string;
  description: string;
  widget_type: string;
  source_type: string;
  config: Record<string, unknown>;
  order_index: number;
  width: string;
  height: string;
  is_visible: boolean;
  required_role: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardTaskLink {
  id: string;
  dashboard_id: string;
  task_id: string;
  section: string;
  order_index: number;
  pinned: boolean;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardRegistryItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  category: string;
  order_index: number;
  is_visible: boolean;
  is_system: boolean;
  required_role: "viewer" | "editor" | "admin";
  layout_config: Record<string, unknown>;
  widget_config: unknown[];
  notes: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
