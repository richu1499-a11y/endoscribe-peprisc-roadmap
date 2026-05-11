import type { TaskWithAssignees, Workstream, Profile } from "./roadmapTypes";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function parseTaskDate(d: string | null): Date | null {
  if (!d) return null;
  const p = new Date(d + "T00:00:00");
  return isNaN(p.getTime()) ? null : p;
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Timeline bounds
// ---------------------------------------------------------------------------
export function getTimelineBounds(tasks: TaskWithAssignees[]): { start: Date; end: Date } {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const t of tasks) {
    const s = parseTaskDate(t.start_date);
    const e = parseTaskDate(t.target_date);
    if (s) earliest = Math.min(earliest, s.getTime());
    if (e) latest = Math.max(latest, e.getTime());
  }
  const now = new Date();
  if (earliest === Infinity) earliest = now.getTime();
  if (latest === -Infinity) latest = now.getTime() + 90 * 86_400_000;
  // Add padding
  return {
    start: new Date(earliest - 3 * 86_400_000),
    end: new Date(latest + 7 * 86_400_000),
  };
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export interface TimelineFilters {
  workstream?: string;
  assignee?: string;
  owner?: string;
  status?: string;
  priority?: string;
  fda?: string;
  hipaa?: string;
  evidenceStage?: string;
  onlyMine?: boolean;
  onlyUnassigned?: boolean;
  onlyCritical?: boolean;
  onlyBlocked?: boolean;
  dateWindow?: string; // "all" | "week" | "30" | "60" | "90"
  currentUserId?: string | null;
}

export function filterTimelineTasks(tasks: TaskWithAssignees[], f: TimelineFilters): TaskWithAssignees[] {
  let out = tasks;
  if (f.workstream) out = out.filter(t => t.workstream_id === f.workstream);
  if (f.assignee) out = out.filter(t => t.assignees.some(a => a.id === f.assignee));
  if (f.owner) out = out.filter(t => t.owner === f.owner);
  if (f.status) out = out.filter(t => t.status === f.status);
  if (f.priority) out = out.filter(t => t.priority === f.priority);
  if (f.fda) out = out.filter(t => t.regulatory_relevance === f.fda);
  if (f.hipaa) out = out.filter(t => t.hipaa_relevance === f.hipaa);
  if (f.evidenceStage) out = out.filter(t => t.evidence_stage === f.evidenceStage);
  if (f.onlyMine && f.currentUserId) out = out.filter(t => t.assignees.some(a => a.id === f.currentUserId));
  if (f.onlyUnassigned) out = out.filter(t => t.assignees.length === 0);
  if (f.onlyCritical) out = out.filter(t => t.priority === "Critical");
  if (f.onlyBlocked) out = out.filter(t => t.status === "Blocked");

  if (f.dateWindow && f.dateWindow !== "all") {
    const now = new Date();
    let cutoff: Date;
    if (f.dateWindow === "week") {
      cutoff = new Date(now.getTime() + 7 * 86_400_000);
    } else {
      cutoff = new Date(now.getTime() + parseInt(f.dateWindow) * 86_400_000);
    }
    out = out.filter(t => {
      const td = parseTaskDate(t.target_date);
      return td && td <= cutoff;
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------
export type GroupByKey = "workstream" | "assignee" | "owner" | "status" | "priority" | "evidence_stage";

export function groupTasksForTimeline(
  tasks: TaskWithAssignees[],
  groupBy: GroupByKey,
  workstreams: Workstream[],
): { label: string; tasks: TaskWithAssignees[] }[] {
  const map = new Map<string, TaskWithAssignees[]>();

  for (const t of tasks) {
    let key: string;
    switch (groupBy) {
      case "workstream": {
        const ws = workstreams.find(w => w.id === t.workstream_id);
        key = ws?.label ?? t.workstream_id ?? "Unknown";
        break;
      }
      case "assignee":
        key = t.assignees.length > 0
          ? t.assignees.map(a => a.full_name || a.email).join(", ")
          : "Unassigned";
        break;
      case "owner": key = t.owner || "Unassigned"; break;
      case "status": key = t.status; break;
      case "priority": key = t.priority; break;
      case "evidence_stage": key = t.evidence_stage; break;
    }
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  return [...map.entries()].map(([label, tasks]) => ({ label, tasks })).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------
export interface TimelineWarning {
  taskId: string;
  message: string;
  severity: "error" | "warn";
}

export function getTimelineWarnings(tasks: TaskWithAssignees[]): TimelineWarning[] {
  const warnings: TimelineWarning[] = [];
  const allIds = new Set(tasks.map(t => t.id));

  for (const t of tasks) {
    if (!t.start_date) warnings.push({ taskId: t.id, message: "Missing start_date", severity: "warn" });
    if (!t.target_date) warnings.push({ taskId: t.id, message: "Missing target_date", severity: "warn" });

    if (t.start_date && t.target_date && t.start_date > t.target_date)
      warnings.push({ taskId: t.id, message: "target_date before start_date", severity: "error" });

    for (const dep of t.dependencies ?? []) {
      if (!allIds.has(dep)) warnings.push({ taskId: t.id, message: `Dependency '${dep}' not found`, severity: "warn" });
    }

    if (t.status === "Blocked" && (!t.blockers || t.blockers.length === 0))
      warnings.push({ taskId: t.id, message: "Blocked but no blockers listed", severity: "warn" });

    if (t.priority === "Critical") {
      if (!t.owner || t.owner === "TBD") warnings.push({ taskId: t.id, message: "Critical task without owner", severity: "warn" });
      if (!t.next_action) warnings.push({ taskId: t.id, message: "Critical task without next_action", severity: "warn" });
      if (t.assignees.length === 0) warnings.push({ taskId: t.id, message: "Critical task unassigned", severity: "warn" });
    }

    if (t.regulatory_relevance === "High" && !t.decision_needed && !t.notes)
      warnings.push({ taskId: t.id, message: "High FDA relevance without decision_needed or notes", severity: "warn" });
    if (t.hipaa_relevance === "High" && !t.notes)
      warnings.push({ taskId: t.id, message: "High HIPAA relevance without notes", severity: "warn" });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Workstream summary
// ---------------------------------------------------------------------------
export function getWorkstreamTimelineSummary(tasks: TaskWithAssignees[], workstreams: Workstream[]) {
  return workstreams.map(ws => {
    const wt = tasks.filter(t => t.workstream_id === ws.id);
    const starts = wt.map(t => parseTaskDate(t.start_date)).filter(Boolean) as Date[];
    const ends = wt.map(t => parseTaskDate(t.target_date)).filter(Boolean) as Date[];
    return {
      id: ws.id,
      label: ws.label,
      taskCount: wt.length,
      assigned: wt.filter(t => t.assignees.length > 0).length,
      unassigned: wt.filter(t => t.assignees.length === 0).length,
      earliest: starts.length > 0 ? fmtDate(new Date(Math.min(...starts.map(d => d.getTime())))) : "--",
      latest: ends.length > 0 ? fmtDate(new Date(Math.max(...ends.map(d => d.getTime())))) : "--",
      critical: wt.filter(t => t.priority === "Critical").length,
      blocked: wt.filter(t => t.status === "Blocked").length,
      highFda: wt.filter(t => t.regulatory_relevance === "High").length,
      highHipaa: wt.filter(t => t.hipaa_relevance === "High").length,
    };
  }).filter(ws => ws.taskCount > 0);
}

// ---------------------------------------------------------------------------
// Assignee workload
// ---------------------------------------------------------------------------
export function getAssigneeWorkload(tasks: TaskWithAssignees[], profiles: Profile[]) {
  return profiles.map(p => {
    const mt = tasks.filter(t => t.assignees.some(a => a.id === p.id));
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    return {
      profile: p,
      total: mt.length,
      open: mt.filter(t => t.status !== "Complete" && t.status !== "Deferred").length,
      dueThisWeek: mt.filter(t => t.target_date && t.target_date <= weekEnd && t.target_date >= today).length,
      overdue: mt.filter(t => t.target_date && t.target_date < today && t.status !== "Complete").length,
      blocked: mt.filter(t => t.status === "Blocked").length,
      critical: mt.filter(t => t.priority === "Critical").length,
    };
  }).filter(w => w.total > 0);
}

// ---------------------------------------------------------------------------
// Bar position computation for Gantt
// ---------------------------------------------------------------------------
export function computeTaskBarPosition(
  task: TaskWithAssignees,
  tlStart: Date,
  tlEnd: Date,
): { leftPct: number; widthPct: number; hasDate: boolean } {
  const s = parseTaskDate(task.start_date);
  const e = parseTaskDate(task.target_date);
  if (!s && !e) return { leftPct: 0, widthPct: 0, hasDate: false };

  const totalDays = daysBetween(tlStart, tlEnd) || 1;
  const barStart = s ?? (e ? new Date(e.getTime() - 14 * 86_400_000) : tlStart);
  const barEnd = e ?? (s ? new Date(s.getTime() + 14 * 86_400_000) : tlEnd);

  const leftPct = Math.max(0, (daysBetween(tlStart, barStart) / totalDays) * 100);
  const widthPct = Math.max(0.5, (daysBetween(barStart, barEnd) / totalDays) * 100);

  return { leftPct, widthPct: Math.min(widthPct, 100 - leftPct), hasDate: true };
}
