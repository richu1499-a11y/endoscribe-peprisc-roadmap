"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";
import { MOCK_WORKSTREAMS, MOCK_TASKS, MOCK_DECISIONS, MOCK_RISKS, MOCK_MILESTONES } from "./mockData";
import type { Workstream, RoadmapTask, DecisionItem, RiskItem, Milestone, Profile, TaskAssignment, TaskWithAssignees, RegulatoryItem, GovernanceItem, ValidationItem, DashboardRegistryItem, DashboardWidget, DashboardTaskLink } from "./roadmapTypes";

const isDev = process.env.NODE_ENV === "development";
let localTasks: RoadmapTask[] = isDev ? [...MOCK_TASKS] : [];

function sb() { return getSupabaseBrowser(); }
function live() { return isSupabaseConfigured && sb() !== null; }

async function logActivity(entityType: string, entityId: string, action: string, summary: string) {
  try {
    const client = sb();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    await client.from("activity_log").insert({
      entity_type: entityType, entity_id: entityId, action,
      changed_by: user?.id ?? null, change_summary: summary,
    });
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function getProfiles(): Promise<Profile[]> {
  if (!live()) return [];
  const { data, error } = await sb()!.from("profiles").select("*").order("email");
  if (error) { console.error(error); return []; }
  return data as Profile[];
}

// ---------------------------------------------------------------------------
// Workstreams
// ---------------------------------------------------------------------------
export async function getWorkstreams(): Promise<Workstream[]> {
  if (!live()) return isDev ? MOCK_WORKSTREAMS : [];
  const { data, error } = await sb()!.from("workstreams").select("*").order("id");
  if (error) { console.error(error); return isDev ? MOCK_WORKSTREAMS : []; }
  return data as Workstream[];
}

// ---------------------------------------------------------------------------
// Tasks — CRUD
// ---------------------------------------------------------------------------
export async function getTasks(): Promise<RoadmapTask[]> {
  if (!live()) return localTasks;
  const { data, error } = await sb()!.from("tasks").select("*").order("id");
  if (error) { console.error(error); return localTasks; }
  return data as RoadmapTask[];
}

export async function createTask(task: RoadmapTask): Promise<RoadmapTask> {
  if (!live()) {
    if (!isDev) throw new Error("Supabase not configured.");
    localTasks = [...localTasks, task];
    return task;
  }
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...task, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("tasks").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied. You may need editor or admin role." : error.message);
  await logActivity("task", task.id, "create", `Created task: ${task.title}`);
  return data as RoadmapTask;
}

export async function updateTask(id: string, updates: Partial<RoadmapTask>): Promise<RoadmapTask> {
  if (!live()) {
    if (!isDev) throw new Error("Supabase not configured.");
    localTasks = localTasks.map(t => t.id === id ? { ...t, ...updates } : t);
    return localTasks.find(t => t.id === id)!;
  }
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied. You may need editor or admin role." : error.message);
  await logActivity("task", id, "update", `Updated task: ${updates.title ?? id}`);
  return data as RoadmapTask;
}

export async function deleteTask(id: string): Promise<void> {
  if (!live()) {
    if (!isDev) throw new Error("Supabase not configured.");
    localTasks = localTasks.filter(t => t.id !== id);
    return;
  }
  const { error } = await sb()!.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied. You may need editor or admin role." : error.message);
  await logActivity("task", id, "delete", `Deleted task ${id}`);
}

// ---------------------------------------------------------------------------
// Task Assignments
// ---------------------------------------------------------------------------
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  if (!live()) return [];
  const { data, error } = await sb()!.from("task_assignments").select("*");
  if (error) {
    // Table may not exist yet if migration not applied
    if (error.code === "42P01" || error.message.includes("does not exist")) return [];
    console.error(error);
    return [];
  }
  return data as TaskAssignment[];
}

export async function getAssignmentsForUser(userId: string): Promise<TaskAssignment[]> {
  if (!live()) return [];
  const { data, error } = await sb()!.from("task_assignments").select("*").eq("user_id", userId);
  if (error) return [];
  return data as TaskAssignment[];
}

export async function replaceTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
  if (!live()) return;
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  // Delete existing
  await client.from("task_assignments").delete().eq("task_id", taskId);
  // Insert new
  if (userIds.length > 0) {
    const rows = userIds.map(uid => ({
      task_id: taskId, user_id: uid, assigned_by: user?.id ?? null, role: "assignee",
    }));
    const { error } = await client.from("task_assignments").insert(rows);
    if (error) throw new Error(error.message.includes("policy") ? "Permission denied. Admin role required to assign tasks." : error.message);
  }
  await logActivity("task", taskId, "assign", `Assigned to ${userIds.length} user(s)`);
}

export async function getTasksWithAssignees(tasks: RoadmapTask[], assignments: TaskAssignment[], profiles: Profile[]): Promise<TaskWithAssignees[]> {
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  return tasks.map(t => {
    const taskAssigns = assignments.filter(a => a.task_id === t.id);
    const assignees = taskAssigns.map(a => profileMap.get(a.user_id)).filter(Boolean) as Profile[];
    return { ...t, assignees };
  });
}

// ---------------------------------------------------------------------------
// Realtime subscription
// ---------------------------------------------------------------------------
export function subscribeToTasks(callback: (tasks: RoadmapTask[]) => void) {
  if (!live()) return { unsubscribe: () => {} };
  const client = sb()!;
  const channel = client
    .channel("tasks-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, async () => {
      const fresh = await getTasks();
      callback(fresh);
    })
    .subscribe();
  return { unsubscribe: () => { client.removeChannel(channel); } };
}

// ---------------------------------------------------------------------------
// Milestones, Decisions, Risks
// ---------------------------------------------------------------------------
export async function getMilestones(): Promise<Milestone[]> {
  if (!live()) return isDev ? MOCK_MILESTONES : [];
  const { data, error } = await sb()!.from("milestones").select("*").order("id");
  if (error) { console.error(error); return isDev ? MOCK_MILESTONES : []; }
  return data as Milestone[];
}

export async function getDecisions(): Promise<DecisionItem[]> {
  if (!live()) return isDev ? MOCK_DECISIONS : [];
  const { data, error } = await sb()!.from("decisions").select("*").order("id");
  if (error) { console.error(error); return isDev ? MOCK_DECISIONS : []; }
  return data as DecisionItem[];
}

export async function getRisks(): Promise<RiskItem[]> {
  if (!live()) return isDev ? MOCK_RISKS : [];
  const { data, error } = await sb()!.from("risks").select("*").order("id");
  if (error) { console.error(error); return isDev ? MOCK_RISKS : []; }
  return data as RiskItem[];
}

// ---------------------------------------------------------------------------
// Regulatory Items
// ---------------------------------------------------------------------------
const MOCK_REGULATORY: RegulatoryItem[] = isDev ? [
  { id: "reg-1", title: "Define intended use for EndoScribe documentation", description: "", category: "Intended Use", status: "Not started", priority: "High", owner: "", due_date: null, related_task_ids: ["FDA-001"], related_decision_ids: [], regulatory_risk: "Low", evidence_needed: "Clinical workflow description", current_evidence: "", decision_needed: "PI sign-off", next_action: "Draft intended-use statement", notes: "" },
  { id: "reg-2", title: "Assess FDA non-device CDS criteria", description: "", category: "CDS Criteria", status: "Not started", priority: "High", owner: "", due_date: null, related_task_ids: ["FDA-003"], related_decision_ids: [], regulatory_risk: "Moderate", evidence_needed: "Four-prong analysis", current_evidence: "", decision_needed: "CDS qualification determination", next_action: "Review FDA CDS guidance", notes: "" },
  { id: "reg-3", title: "Determine clinician-facing PEPRisc classification", description: "", category: "SaMD / Device Function", status: "Not started", priority: "Critical", owner: "", due_date: null, related_task_ids: ["FDA-003", "CLIN-002"], related_decision_ids: [], regulatory_risk: "High", evidence_needed: "Regulatory precedent analysis", current_evidence: "", decision_needed: "Output audience decision", next_action: "Review FDA CDS four-prong test", notes: "" },
] : [];

export async function getRegulatoryItems(): Promise<RegulatoryItem[]> {
  if (!live()) return MOCK_REGULATORY;
  const { data, error } = await sb()!.from("regulatory_items").select("*").order("created_at");
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return MOCK_REGULATORY;
    console.error(error);
    return MOCK_REGULATORY;
  }
  return data as RegulatoryItem[];
}

export async function createRegulatoryItem(item: Partial<RegulatoryItem>): Promise<RegulatoryItem> {
  if (!live()) throw new Error(isDev ? "Mock mode: regulatory items not persisted." : "Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...item, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("regulatory_items").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied. Editor or admin role required." : error.message);
  await logActivity("regulatory_item", data.id, "create", `Created: ${item.title}`);
  return data as RegulatoryItem;
}

export async function updateRegulatoryItem(id: string, updates: Partial<RegulatoryItem>): Promise<RegulatoryItem> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("regulatory_items").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("regulatory_item", id, "update", `Updated: ${updates.title ?? id}`);
  return data as RegulatoryItem;
}

export async function deleteRegulatoryItem(id: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("regulatory_items").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("regulatory_item", id, "delete", `Deleted regulatory item ${id}`);
}

// ---------------------------------------------------------------------------
// Governance Items (IRB / HIPAA / Hopkins IT)
// ---------------------------------------------------------------------------
const MOCK_GOVERNANCE: GovernanceItem[] = isDev ? [
  { id: "gov-1", title: "Determine whether IRB amendment is required", description: "", category: "IRB Amendment", status: "Not started", priority: "Critical", owner: "", due_date: null, related_task_ids: ["IRB-001"], related_decision_ids: [], phi_involved: true, data_type: "", data_location: "", compute_location: "", irb_status: "Not assessed", hipaa_risk: "High", hopkins_it_status: "Not assessed", approval_needed: "IRB office", current_state: "Not assessed", gap: "Amendment coverage needed", decision_needed: "Does current IRB cover planned activities?", next_action: "Review current IRB protocol", notes: "" },
  { id: "gov-2", title: "Define approved storage for patient audio", description: "", category: "Storage / Access Control", status: "Not started", priority: "High", owner: "", due_date: null, related_task_ids: ["IRB-004"], related_decision_ids: [], phi_involved: true, data_type: "Audio", data_location: "TBD", compute_location: "", irb_status: "Not assessed", hipaa_risk: "High", hopkins_it_status: "Needs review", approval_needed: "Hopkins IT", current_state: "Not confirmed", gap: "Need Hopkins-approved storage", decision_needed: "", next_action: "Contact Hopkins IT", notes: "" },
  { id: "gov-3", title: "Prohibit PHI in public AI tools", description: "", category: "External Tool Restriction", status: "Not started", priority: "Critical", owner: "", due_date: null, related_task_ids: ["IRB-005"], related_decision_ids: [], phi_involved: true, data_type: "", data_location: "", compute_location: "", irb_status: "Not assessed", hipaa_risk: "High", hopkins_it_status: "Not assessed", approval_needed: "Team policy", current_state: "No formal policy", gap: "PHI boundary rule not documented", decision_needed: "", next_action: "Draft PHI boundary rule", notes: "" },
] : [];

export async function getGovernanceItems(): Promise<GovernanceItem[]> {
  if (!live()) return MOCK_GOVERNANCE;
  const { data, error } = await sb()!.from("governance_items").select("*").order("created_at");
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return MOCK_GOVERNANCE;
    console.error(error);
    return MOCK_GOVERNANCE;
  }
  return data as GovernanceItem[];
}

export async function createGovernanceItem(item: Partial<GovernanceItem>): Promise<GovernanceItem> {
  if (!live()) throw new Error(isDev ? "Mock mode: governance items not persisted." : "Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...item, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("governance_items").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("governance_item", data.id, "create", `Created: ${item.title}`);
  return data as GovernanceItem;
}

export async function updateGovernanceItem(id: string, updates: Partial<GovernanceItem>): Promise<GovernanceItem> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("governance_items").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("governance_item", id, "update", `Updated: ${updates.title ?? id}`);
  return data as GovernanceItem;
}

export async function deleteGovernanceItem(id: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("governance_items").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("governance_item", id, "delete", `Deleted governance item ${id}`);
}

// ---------------------------------------------------------------------------
// Validation Items
// ---------------------------------------------------------------------------
const MOCK_VALIDATION: ValidationItem[] = isDev ? [
  { id: "val-1", title: "Evaluate ASR word error rate on ERCP recordings", description: "", validation_domain: "ASR / Transcription", status: "Not started", priority: "High", owner: "", due_date: null, related_task_ids: ["ASR-001", "ASR-002"], related_decision_ids: [], metric_type: "Error rate", metric_name: "WER", target_threshold: "TBD", current_result: "", sample_size: "", dataset_stage: "Curated 10-case set", evidence_stage: "Internal validation", failure_mode: "", clinical_materiality: "", gap: "No WER data yet", decision_needed: "", next_action: "Set up evaluation", notes: "" },
  { id: "val-2", title: "Compare EndoScribe PEPRisc with manual abstraction", description: "", validation_domain: "PEPRisc Output", status: "Not started", priority: "Critical", owner: "", due_date: null, related_task_ids: ["PEP-004", "VALID-004"], related_decision_ids: [], metric_type: "Agreement", metric_name: "Bland-Altman agreement", target_threshold: "< 5% difference", current_result: "", sample_size: "", dataset_stage: "Curated 10-case set", evidence_stage: "Internal validation", failure_mode: "", clinical_materiality: "", gap: "No PEPRisc scores yet", decision_needed: "", next_action: "Define comparison methodology", notes: "" },
  { id: "val-3", title: "Build failure-mode taxonomy", description: "", validation_domain: "Failure Mode / Safety", status: "Not started", priority: "High", owner: "", due_date: null, related_task_ids: ["VALID-006"], related_decision_ids: [], metric_type: "Safety", metric_name: "Taxonomy completeness", target_threshold: "All major modes cataloged", current_result: "", sample_size: "", dataset_stage: "Development dataset", evidence_stage: "Development", failure_mode: "", clinical_materiality: "", gap: "No taxonomy exists", decision_needed: "", next_action: "Review AI error literature", notes: "" },
] : [];

export async function getValidationItems(): Promise<ValidationItem[]> {
  if (!live()) return MOCK_VALIDATION;
  const { data, error } = await sb()!.from("validation_items").select("*").order("created_at");
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return MOCK_VALIDATION;
    console.error(error);
    return MOCK_VALIDATION;
  }
  return data as ValidationItem[];
}

export async function createValidationItem(item: Partial<ValidationItem>): Promise<ValidationItem> {
  if (!live()) throw new Error(isDev ? "Mock mode: not persisted." : "Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...item, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("validation_items").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("validation_item", data.id, "create", `Created: ${item.title}`);
  return data as ValidationItem;
}

export async function updateValidationItem(id: string, updates: Partial<ValidationItem>): Promise<ValidationItem> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("validation_items").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("validation_item", id, "update", `Updated: ${updates.title ?? id}`);
  return data as ValidationItem;
}

export async function deleteValidationItem(id: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("validation_items").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Permission denied." : error.message);
  await logActivity("validation_item", id, "delete", `Deleted validation item ${id}`);
}

// ---------------------------------------------------------------------------
// Dashboard Registry
// ---------------------------------------------------------------------------
const MOCK_DASHBOARDS: DashboardRegistryItem[] = [
  { id: "m1", slug: "overview", title: "Overview", description: "", route: "/", icon: "LayoutDashboard", category: "Core", order_index: 10, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m2", slug: "gsd", title: "GSD", description: "", route: "/gsd", icon: "Target", category: "Execution", order_index: 20, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m3", slug: "roadmap", title: "Roadmap", description: "", route: "/roadmap", icon: "Map", category: "Strategy", order_index: 30, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m4", slug: "timeline", title: "Timeline", description: "", route: "/timeline", icon: "GanttChart", category: "Execution", order_index: 40, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m5", slug: "network", title: "Network Map", description: "", route: "/network", icon: "Network", category: "Strategy", order_index: 50, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m6", slug: "regulatory", title: "FDA / Regulatory", description: "", route: "/regulatory", icon: "Shield", category: "Governance", order_index: 60, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m7", slug: "governance", title: "IRB / HIPAA", description: "", route: "/governance", icon: "Lock", category: "Governance", order_index: 70, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m8", slug: "validation", title: "Validation", description: "", route: "/validation", icon: "FlaskConical", category: "Evidence", order_index: 80, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m9", slug: "tasks", title: "Tasks", description: "", route: "/tasks", icon: "ListChecks", category: "Execution", order_index: 90, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m10", slug: "setup", title: "Setup", description: "", route: "/setup", icon: "Wrench", category: "System", order_index: 300, is_visible: true, is_system: true, required_role: "admin", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
  { id: "m11", slug: "settings", title: "Settings", description: "", route: "/settings", icon: "Settings", category: "System", order_index: 310, is_visible: true, is_system: true, required_role: "viewer", layout_config: {}, widget_config: [], notes: "", created_by: null, updated_by: null, created_at: "", updated_at: "" },
];

export async function getDashboardRegistry(): Promise<DashboardRegistryItem[]> {
  if (!live()) return isDev ? MOCK_DASHBOARDS : [];
  const { data, error } = await sb()!.from("dashboard_registry").select("*").order("order_index");
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return MOCK_DASHBOARDS;
    console.error(error);
    return MOCK_DASHBOARDS;
  }
  return (data as DashboardRegistryItem[]).sort((a, b) => a.order_index - b.order_index);
}

const ROLE_RANK: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };

export function getVisibleDashboardsForRole(dashboards: DashboardRegistryItem[], role: string | null): DashboardRegistryItem[] {
  const userRank = ROLE_RANK[role ?? "viewer"] ?? 0;
  return dashboards
    .filter(d => d.is_visible && ROLE_RANK[d.required_role] <= userRank)
    .sort((a, b) => a.order_index - b.order_index);
}

export async function updateDashboardRegistryItem(id: string, updates: Partial<DashboardRegistryItem>): Promise<DashboardRegistryItem> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("dashboard_registry").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
  return data as DashboardRegistryItem;
}

export async function createDashboardRegistryItem(item: Partial<DashboardRegistryItem>): Promise<DashboardRegistryItem> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...item, is_system: false, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("dashboard_registry").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
  return data as DashboardRegistryItem;
}

export async function deleteDashboardRegistryItem(id: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("dashboard_registry").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
}

// ---------------------------------------------------------------------------
// Dashboard Widgets
// ---------------------------------------------------------------------------
export async function getDashboardWidgets(dashboardId?: string): Promise<DashboardWidget[]> {
  if (!live()) return [];
  let q = sb()!.from("dashboard_widgets").select("*").order("order_index");
  if (dashboardId) q = q.eq("dashboard_id", dashboardId);
  const { data, error } = await q;
  if (error) { if (error.code === "42P01") return []; console.error(error); return []; }
  return data as DashboardWidget[];
}

export async function createDashboardWidget(widget: Partial<DashboardWidget>): Promise<DashboardWidget> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...widget, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("dashboard_widgets").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
  return data as DashboardWidget;
}

export async function updateDashboardWidget(id: string, updates: Partial<DashboardWidget>): Promise<DashboardWidget> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client.from("dashboard_widgets").update({ ...updates, updated_by: user?.id ?? null }).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
  return data as DashboardWidget;
}

export async function deleteDashboardWidget(id: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("dashboard_widgets").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
}

// ---------------------------------------------------------------------------
// Dashboard Task Links
// ---------------------------------------------------------------------------
export async function getDashboardTaskLinks(dashboardId?: string): Promise<DashboardTaskLink[]> {
  if (!live()) return [];
  let q = sb()!.from("dashboard_task_links").select("*").order("order_index");
  if (dashboardId) q = q.eq("dashboard_id", dashboardId);
  const { data, error } = await q;
  if (error) { if (error.code === "42P01") return []; console.error(error); return []; }
  return data as DashboardTaskLink[];
}

export async function linkTaskToDashboard(dashboardId: string, taskId: string, section?: string, notes?: string): Promise<DashboardTaskLink> {
  if (!live()) throw new Error("Supabase not configured.");
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { dashboard_id: dashboardId, task_id: taskId, section: section ?? "General", added_by: user?.id ?? null, notes: notes ?? null };
  const { data, error } = await client.from("dashboard_task_links").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
  return data as DashboardTaskLink;
}

export async function unlinkTaskFromDashboard(dashboardId: string, taskId: string): Promise<void> {
  if (!live()) throw new Error("Supabase not configured.");
  const { error } = await sb()!.from("dashboard_task_links").delete().eq("dashboard_id", dashboardId).eq("task_id", taskId);
  if (error) throw new Error(error.message.includes("policy") ? "Admin role required." : error.message);
}

export async function moveTaskBetweenDashboards(taskId: string, fromDashboardId: string, toDashboardId: string, section?: string): Promise<void> {
  await unlinkTaskFromDashboard(fromDashboardId, taskId);
  await linkTaskToDashboard(toDashboardId, taskId, section);
}
