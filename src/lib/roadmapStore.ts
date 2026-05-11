"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";
import { MOCK_WORKSTREAMS, MOCK_TASKS, MOCK_DECISIONS, MOCK_RISKS, MOCK_MILESTONES } from "./mockData";
import type { Workstream, RoadmapTask, DecisionItem, RiskItem, Milestone } from "./roadmapTypes";

// ---------------------------------------------------------------------------
// In-memory store for mock/demo mode (no Supabase)
// Mock mode is only allowed in development. In production, if Supabase
// is not configured the store returns empty data instead of mock data.
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV === "development";
let localTasks: RoadmapTask[] = isDev ? [...MOCK_TASKS] : [];

function sb() { return getSupabaseBrowser(); }
function live() { return isSupabaseConfigured && sb() !== null; }

// ---------------------------------------------------------------------------
// Activity log helper (best-effort, never throws to caller)
// ---------------------------------------------------------------------------
async function logActivity(entityType: string, entityId: string, action: string, summary: string) {
  try {
    const client = sb();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    await client.from("activity_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      changed_by: user?.id ?? null,
      change_summary: summary,
    });
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Workstreams
// ---------------------------------------------------------------------------
export async function getWorkstreams(): Promise<Workstream[]> {
  if (!live()) return isDev ? MOCK_WORKSTREAMS : [];
  const { data, error } = await sb()!.from("workstreams").select("*").order("id");
  if (error) { console.error(error); return MOCK_WORKSTREAMS; }
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
    if (!isDev) throw new Error("Supabase not configured. Cannot create tasks in production without a database.");
    localTasks = [...localTasks, task];
    return task;
  }
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const row = { ...task, created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await client.from("tasks").insert(row).select().single();
  if (error) throw new Error(error.message.includes("policy")
    ? "Permission denied. You may need editor or admin role."
    : error.message);
  await logActivity("task", task.id, "create", `Created task: ${task.title}`);
  return data as RoadmapTask;
}

export async function updateTask(id: string, updates: Partial<RoadmapTask>): Promise<RoadmapTask> {
  if (!live()) {
    if (!isDev) throw new Error("Supabase not configured. Cannot update tasks in production without a database.");
    localTasks = localTasks.map(t => t.id === id ? { ...t, ...updates } : t);
    return localTasks.find(t => t.id === id)!;
  }
  const client = sb()!;
  const { data: { user } } = await client.auth.getUser();
  const patch = { ...updates, updated_by: user?.id ?? null };
  const { data, error } = await client.from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message.includes("policy")
    ? "Permission denied. You may need editor or admin role."
    : error.message);
  await logActivity("task", id, "update", `Updated task: ${updates.title ?? id}`);
  return data as RoadmapTask;
}

export async function deleteTask(id: string): Promise<void> {
  if (!live()) {
    if (!isDev) throw new Error("Supabase not configured. Cannot delete tasks in production without a database.");
    localTasks = localTasks.filter(t => t.id !== id);
    return;
  }
  const { error } = await sb()!.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message.includes("policy")
    ? "Permission denied. You may need editor or admin role."
    : error.message);
  await logActivity("task", id, "delete", `Deleted task ${id}`);
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

  return {
    unsubscribe: () => { client.removeChannel(channel); },
  };
}

// ---------------------------------------------------------------------------
// Milestones, Decisions, Risks (read-only for now)
// ---------------------------------------------------------------------------
export async function getMilestones(): Promise<Milestone[]> {
  if (!live()) return isDev ? MOCK_MILESTONES : [];
  const { data, error } = await sb()!.from("milestones").select("*").order("id");
  if (error) { console.error(error); return MOCK_MILESTONES; }
  return data as Milestone[];
}

export async function getDecisions(): Promise<DecisionItem[]> {
  if (!live()) return isDev ? MOCK_DECISIONS : [];
  const { data, error } = await sb()!.from("decisions").select("*").order("id");
  if (error) { console.error(error); return MOCK_DECISIONS; }
  return data as DecisionItem[];
}

export async function getRisks(): Promise<RiskItem[]> {
  if (!live()) return isDev ? MOCK_RISKS : [];
  const { data, error } = await sb()!.from("risks").select("*").order("id");
  if (error) { console.error(error); return MOCK_RISKS; }
  return data as RiskItem[];
}
