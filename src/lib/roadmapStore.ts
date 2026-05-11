"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";
import { MOCK_WORKSTREAMS, MOCK_TASKS, MOCK_DECISIONS, MOCK_RISKS, MOCK_MILESTONES } from "./mockData";
import type { Workstream, RoadmapTask, DecisionItem, RiskItem, Milestone, Profile, TaskAssignment, TaskWithAssignees } from "./roadmapTypes";

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
