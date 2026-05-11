import {
  RoadmapTask,
  TASK_STATUSES,
  PRIORITIES,
  REGULATORY_LEVELS,
  EVIDENCE_STAGES,
} from "./roadmapTypes";

const FORBIDDEN_FIELDS = new Set([
  "patient_name", "mrn", "dob", "date_of_birth", "ssn",
  "accession_number", "medical_record_number", "patient_id",
  "phi", "social_security",
]);

export interface ValidationIssue {
  taskId: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateTask(task: RoadmapTask): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = task.id || "???";

  if (!task.id) issues.push({ taskId: id, field: "id", message: "Missing task ID", severity: "error" });
  if (!task.title) issues.push({ taskId: id, field: "title", message: "Missing title", severity: "error" });
  if (!task.workstream_id) issues.push({ taskId: id, field: "workstream_id", message: "Missing workstream", severity: "error" });
  if (!task.owner) issues.push({ taskId: id, field: "owner", message: "Missing owner", severity: "warning" });

  if (task.status && !(TASK_STATUSES as readonly string[]).includes(task.status))
    issues.push({ taskId: id, field: "status", message: `Invalid status: ${task.status}`, severity: "error" });
  if (task.priority && !(PRIORITIES as readonly string[]).includes(task.priority))
    issues.push({ taskId: id, field: "priority", message: `Invalid priority: ${task.priority}`, severity: "error" });
  if (task.regulatory_relevance && !(REGULATORY_LEVELS as readonly string[]).includes(task.regulatory_relevance))
    issues.push({ taskId: id, field: "regulatory_relevance", message: `Invalid regulatory relevance`, severity: "error" });
  if (task.hipaa_relevance && !(REGULATORY_LEVELS as readonly string[]).includes(task.hipaa_relevance))
    issues.push({ taskId: id, field: "hipaa_relevance", message: `Invalid HIPAA relevance`, severity: "error" });
  if (task.evidence_stage && !(EVIDENCE_STAGES as readonly string[]).includes(task.evidence_stage))
    issues.push({ taskId: id, field: "evidence_stage", message: `Invalid evidence stage`, severity: "error" });

  return issues;
}

export function findMissingFields(tasks: RoadmapTask[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const t of tasks) {
    if (!t.start_date) issues.push({ taskId: t.id, field: "start_date", message: "Missing start_date", severity: "warning" });
    if (!t.target_date) issues.push({ taskId: t.id, field: "target_date", message: "Missing target_date", severity: "warning" });
    if (!t.next_action) issues.push({ taskId: t.id, field: "next_action", message: "Missing next_action", severity: "warning" });
    if (t.priority === "Critical" && !t.owner) issues.push({ taskId: t.id, field: "owner", message: "Critical task without owner", severity: "error" });
    if (t.status === "Blocked" && (!t.blockers || t.blockers.length === 0))
      issues.push({ taskId: t.id, field: "blockers", message: "Blocked but no blockers listed", severity: "warning" });
  }
  return issues;
}

export function findDependencyWarnings(tasks: RoadmapTask[]): ValidationIssue[] {
  const allIds = new Set(tasks.map(t => t.id));
  const issues: ValidationIssue[] = [];
  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (!allIds.has(dep)) {
        issues.push({ taskId: t.id, field: "dependencies", message: `Dependency '${dep}' not found`, severity: "warning" });
      }
    }
  }
  return issues;
}

export function detectPhiLikeFields(task: Record<string, unknown>): string[] {
  return Object.keys(task).filter(k => FORBIDDEN_FIELDS.has(k.toLowerCase()));
}

export function summarizeRoadmapHealth(tasks: RoadmapTask[]) {
  const total = tasks.length;
  const byStatus: Record<string, number> = {};
  let blocked = 0, critical = 0, highFda = 0, highHipaa = 0, missingDates = 0;

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    if (t.status === "Blocked") blocked++;
    if (t.priority === "Critical") critical++;
    if (t.regulatory_relevance === "High") highFda++;
    if (t.hipaa_relevance === "High") highHipaa++;
    if (!t.start_date || !t.target_date) missingDates++;
  }

  return { total, byStatus, blocked, critical, highFda, highHipaa, missingDates };
}
