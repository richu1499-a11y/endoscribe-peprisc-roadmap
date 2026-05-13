"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getTasks, createTask, updateTask, subscribeToTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, replaceTaskAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import type { RoadmapTask, Profile, TaskAssignment, TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentUser, getCurrentRole, canEdit as checkCanEdit, isAdmin as checkIsAdmin } from "@/lib/auth";
import TaskForm from "@/components/TaskForm";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { Plus, Search } from "lucide-react";
import { clsx } from "clsx";

type TabKey = "all" | "mine" | "high" | "due-soon" | "archived";

export default function TasksPage() {
  const [allTasks, setAllTasks] = useState<TaskWithAssignees[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");

  const [search, setSearch] = useState("");
  const [filterWorkspace, setFilterWorkspace] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [selected, setSelected] = useState<RoadmapTask | TaskWithAssignees | null>(null);
  const [editing, setEditing] = useState<RoadmapTask | null | "new">(null);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    setProfiles(profs);
    setAssignments(assigns);
    setWorkspaces(ws.filter(w => w.is_visible));
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setAllTasks(enriched);
    // Load archived separately for the archived tab
    const { getTasks: getTasksFn } = await import("@/lib/roadmapStore");
    const archived = await getTasksFn(true);
    const archivedOnly = archived.filter(t => t.is_archived);
    const enrichedArchived = await getTasksWithAssignees(archivedOnly, assigns, profs);
    setArchivedTasks(enrichedArchived);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      if (isSupabaseConfigured) {
        const [role, user] = await Promise.all([getCurrentRole(), getCurrentUser()]);
        setUserCanEdit(checkCanEdit(role));
        setUserIsAdmin(checkIsAdmin(role));
        setCurrentUserId(user?.id ?? null);
      }
    })();
    const sub = subscribeToTasks(async () => { await refresh(); });
    return () => sub.unsubscribe();
  }, [refresh]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const twoWeeks = useMemo(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), []);

  // Derived sets
  const myAssignedIds = new Set(assignments.filter(a => a.user_id === currentUserId).map(a => a.task_id));
  const myTasks = allTasks.filter(t => myAssignedIds.has(t.id) || (currentUserId && t.owner && t.owner.toLowerCase().includes("richu")));
  const highPriority = allTasks.filter(t => t.priority === "Critical" || t.priority === "High");
  const dueSoon = allTasks.filter(t => t.target_date && t.target_date >= today && t.target_date <= twoWeeks);

  // Base for current tab
  const baseTasks = tab === "mine" ? myTasks : tab === "high" ? highPriority : tab === "due-soon" ? dueSoon : tab === "archived" ? archivedTasks : allTasks;

  // Apply filters
  let filtered = baseTasks;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.owner ?? "").toLowerCase().includes(q)); }
  if (filterWorkspace) filtered = filtered.filter(t => t.workspace === filterWorkspace);
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);

  function showFb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  async function handleSave(task: RoadmapTask, assigneeIds?: string[]) {
    setError(null);
    try {
      if (editing === "new") {
        const id = task.id || `TASK-${Date.now().toString(36).toUpperCase()}`;
        await createTask({ ...task, id } as RoadmapTask);
        showFb("Task created");
      } else {
        await updateTask(task.id, task);
        showFb("Task updated");
      }
      if (assigneeIds !== undefined) await replaceTaskAssignees(task.id || "", assigneeIds);
      setEditing(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this task?")) return;
    try {
      await updateTask(id, { is_archived: true } as Partial<RoadmapTask>);
      setSelected(null);
      showFb("Task archived");
      await refresh();
    } catch {}
  }

  async function handleHardDelete(id: string) {
    if (!confirm("Permanently delete this task? This cannot be undone.")) return;
    try {
      const { deleteTask } = await import("@/lib/roadmapStore");
      await deleteTask(id);
      setSelected(null);
      showFb("Task deleted");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); }
  }

  const selectCls = "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm bg-white focus:border-teal-400 focus:outline-none";
  const tabCls = (key: TabKey) => clsx("px-4 py-2.5 text-sm font-medium rounded-lg transition-colors", tab === key ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50");

  const editingTask = editing && editing !== "new" ? editing : null;
  const editingAssigneeIds = editingTask ? assignments.filter(a => a.task_id === editingTask.id).map(a => a.user_id) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">{allTasks.length} active tasks across {workspaces.length} workspaces</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{feedback}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button className={tabCls("all")} onClick={() => setTab("all")}>All Tasks ({allTasks.length})</button>
        {currentUserId && <button className={tabCls("mine")} onClick={() => setTab("mine")}>My Tasks ({myTasks.length})</button>}
        <button className={tabCls("high")} onClick={() => setTab("high")}>High Priority ({highPriority.length})</button>
        <button className={tabCls("due-soon")} onClick={() => setTab("due-soon")}>Due Soon ({dueSoon.length})</button>
        {userCanEdit && <button className={tabCls("archived")} onClick={() => setTab("archived")}>Archived ({archivedTasks.length})</button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          <input className="rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-teal-400 focus:outline-none w-48" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={filterWorkspace} onChange={e => setFilterWorkspace(e.target.value)}>
          <option value="">All Workspaces</option>
          {workspaces.map(w => <option key={w.slug} value={w.slug}>{w.title}</option>)}
        </select>
        <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Not started</option>
          <option>In progress</option>
          <option>Blocked</option>
          <option>Complete</option>
          <option>Deferred</option>
        </select>
        <select className={selectCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map(t => {
          const owner = t.owner || (t.assignees.length > 0 ? (t.assignees[0].full_name || t.assignees[0].email) : "");
          const borderColor = t.priority === "Critical" ? "border-l-red-500" : t.priority === "High" ? "border-l-amber-500" : t.status === "Blocked" ? "border-l-red-400" : "border-l-slate-200";
          const wsTitle = workspaces.find(w => w.slug === t.workspace)?.title ?? t.workspace ?? "";
          return (
            <div key={t.id} onClick={() => setSelected(t)} className={clsx("rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 hover:shadow-md transition-all cursor-pointer", borderColor)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{t.title}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-slate-500">
                    {wsTitle && <span className="text-teal-600 font-medium">{wsTitle}</span>}
                    {owner && <span>{owner}</span>}
                    {t.target_date && <span>Due {t.target_date}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <p className="text-lg text-slate-500">{tab === "archived" ? "No archived tasks." : "No tasks match your filters."}</p>
          {tab !== "archived" && userCanEdit && (
            <button onClick={() => setEditing("new")} className="mt-3 text-sm text-teal-600 hover:underline font-medium">Create a task</button>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {selected && !editing && (
        <TaskDetailDrawer
          task={selected}
          onClose={() => setSelected(null)}
          onEdit={userCanEdit ? (t => { setEditing(t); setSelected(null); }) : (() => {})}
          onDelete={userCanEdit ? handleArchive : undefined}
          onHardDelete={userCanEdit ? handleHardDelete : undefined}
          isAdmin={userIsAdmin}
        />
      )}

      {/* Task form modal */}
      {editing && userCanEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <TaskForm
              task={editing === "new" ? null : editing}
              profiles={profiles}
              workspaces={workspaces.map(w => ({ slug: w.slug, title: w.title }))}
              currentAssigneeIds={editingAssigneeIds}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
