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
