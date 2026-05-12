"use client";

import { useEffect, useState, useCallback } from "react";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, createTask, updateTask, getWorkspaceGroups, createWorkspaceGroup, updateWorkspaceGroup, deleteWorkspaceGroup } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentAppRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, Profile, WorkspaceGroup, RoadmapTask } from "@/lib/roadmapTypes";
import TaskForm from "@/components/TaskForm";
import { Plus, X, Settings2, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "overdue" | "done">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [editingWs, setEditingWs] = useState<WorkspaceGroup | null | "new">(null);
  const [editingTask, setEditingTask] = useState<RoadmapTask | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setTasks(enriched);
    setProfiles(profs);
    setWorkspaces(ws.filter(w => w.is_visible));
    if (isSupabaseConfigured) {
      const [user, appRole] = await Promise.all([getCurrentUser(), getCurrentAppRole()]);
      setCurrentUserId(user?.id ?? null);
      setIsAdmin(appRole === "admin");
    }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  const [now] = useState(() => new Date().toISOString().slice(0, 10));
  const wsTasks = selectedWs ? tasks.filter(t => t.workspace === selectedWs) : [];
  let filtered = wsTasks;
  if (filter === "mine") filtered = wsTasks.filter(t => currentUserId && t.assignees.some(a => a.id === currentUserId));
  if (filter === "overdue") filtered = wsTasks.filter(t => t.target_date && t.target_date < now && t.status !== "Complete");
  if (filter === "done") filtered = wsTasks.filter(t => t.status === "Complete");

  async function handleQuickAdd(title: string, ws: string) {
    setError(null);
    try {
      const id = `TASK-${Date.now().toString(36).toUpperCase()}`;
      await createTask({ id, title, description: "", workstream_id: "", owner: "", contributors: [], status: "Not started", priority: "Medium", start_date: null, target_date: null, dependencies: [], deliverables: [], blockers: [], risks: [], decision_needed: "", regulatory_relevance: "None", hipaa_relevance: "None", evidence_stage: "Concept", gsd_goal: "", next_action: "", notes: "", workspace: ws } as RoadmapTask);
      setShowAdd(false);
      showFb("Task created");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleSaveWs(form: Partial<WorkspaceGroup>) {
    setError(null);
    try {
      if (editingWs === "new") {
        const slug = (form.title ?? "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await createWorkspaceGroup({ ...form, slug, order_index: (workspaces.length + 1) * 10 });
        showFb("Workspace created");
      } else if (editingWs) {
        await updateWorkspaceGroup(editingWs.id, form);
        showFb("Workspace updated");
      }
      setEditingWs(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDeleteWs(ws: WorkspaceGroup) {
    const wsTaskCount = tasks.filter(t => t.workspace === ws.slug).length;
    const msg = wsTaskCount > 0
      ? `"${ws.title}" has ${wsTaskCount} task(s). Tasks will keep their workspace tag but this workspace will be removed. Continue?`
      : `Delete workspace "${ws.title}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteWorkspaceGroup(ws.id);
      showFb("Workspace deleted");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleTaskSave(task: RoadmapTask) {
    setError(null);
    try {
      if (editingTask === "new") {
        const id = task.id || `TASK-${Date.now().toString(36).toUpperCase()}`;
        await createTask({ ...task, id, workspace: selectedWs ?? task.workspace } as RoadmapTask);
        showFb("Task created");
      } else {
        await updateTask(task.id, task);
        showFb("Task updated");
      }
      setEditingTask(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const filterCls = (f: string) => clsx("px-3 py-1 text-xs rounded-full transition-colors", filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200");

  // ========== Workspace cards view ==========
  if (!selectedWs) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Workspaces</h1>
            <p className="text-sm text-slate-500 mt-0.5">Organized project verticals.</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setShowManage(!showManage)} className={clsx("flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors", showManage ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50")}>
                <Settings2 className="h-4 w-4" /> Manage
              </button>
              {showManage && (
                <button onClick={() => setEditingWs("new")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> New Workspace
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map(ws => {
            const count = tasks.filter(t => t.workspace === ws.slug).length;
            const overdue = tasks.filter(t => t.workspace === ws.slug && t.target_date && t.target_date < now && t.status !== "Complete").length;
            const myCount = currentUserId ? tasks.filter(t => t.workspace === ws.slug && t.assignees.some(a => a.id === currentUserId)).length : 0;
            return (
              <div key={ws.slug} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <button onClick={() => setSelectedWs(ws.slug)} className="text-left flex-1">
                    <h3 className="text-sm font-semibold text-slate-800">{ws.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ws.description}</p>
                  </button>
                  {showManage && isAdmin && (
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => setEditingWs(ws)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      {!ws.is_system && <button onClick={() => handleDeleteWs(ws)} className="text-xs text-red-500 hover:underline">Delete</button>}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedWs(ws.slug)} className="w-full text-left">
                  <div className="mt-3 flex gap-3 text-xs">
                    <span className="text-slate-600">{count} task{count !== 1 ? "s" : ""}</span>
                    {myCount > 0 && <span className="text-indigo-600">{myCount} mine</span>}
                    {overdue > 0 && <span className="text-red-600">{overdue} overdue</span>}
                  </div>
                </button>
              </div>
            );
          })}

          {workspaces.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">No workspaces yet.</p>
              {isAdmin && <button onClick={() => setEditingWs("new")} className="mt-2 text-sm text-indigo-600 hover:underline">Create your first workspace</button>}
            </div>
          )}
        </div>

        {/* Workspace edit modal */}
        {editingWs && <WorkspaceFormModal ws={editingWs === "new" ? null : editingWs} onSave={handleSaveWs} onCancel={() => setEditingWs(null)} />}
      </div>
    );
  }

  // ========== Workspace detail view ==========
  const ws = workspaces.find(w => w.slug === selectedWs);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => { setSelectedWs(null); setFilter("all"); }} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mb-1">
            <ArrowLeft className="h-3 w-3" /> All Workspaces
          </button>
          <h1 className="text-xl font-bold text-slate-900">{ws?.title ?? selectedWs}</h1>
          {ws?.description && <p className="text-xs text-slate-500">{ws.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditingTask("new")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>}

      <div className="flex gap-2">
        <button className={filterCls("all")} onClick={() => setFilter("all")}>All ({wsTasks.length})</button>
        <button className={filterCls("mine")} onClick={() => setFilter("mine")}>Mine</button>
        <button className={filterCls("overdue")} onClick={() => setFilter("overdue")}>Overdue</button>
        <button className={filterCls("done")} onClick={() => setFilter("done")}>Done</button>
      </div>

      {/* Task cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(t => (
          <div key={t.id} onClick={() => setEditingTask(t)} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-slate-800 line-clamp-2">{t.title}</h4>
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); if (confirm("Archive?")) { updateTask(t.id, { is_archived: true } as Partial<RoadmapTask>).then(() => { showFb("Archived"); refresh(); }); } }} className="text-[10px] text-slate-400 hover:text-red-500 shrink-0">Archive</button>
              )}
            </div>
            {t.owner && <p className="text-[10px] text-slate-500 mt-1">Owner: {t.owner}</p>}
            <div className="flex items-center gap-2 mt-3">
              <select value={t.status} onClick={e => e.stopPropagation()} onChange={e => { updateTask(t.id, { status: e.target.value as RoadmapTask["status"] }); showFb("Updated"); refresh(); }} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 focus:ring-1 focus:ring-indigo-400 cursor-pointer">
                {["Not started","In progress","Blocked","Complete","Deferred"].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={t.priority} onClick={e => e.stopPropagation()} onChange={e => { updateTask(t.id, { priority: e.target.value as RoadmapTask["priority"] }); showFb("Updated"); refresh(); }} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 focus:ring-1 focus:ring-indigo-400 cursor-pointer">
                {["Critical","High","Medium","Low"].map(p => <option key={p}>{p}</option>)}
              </select>
              {t.target_date && <span className="text-[10px] text-slate-400">Due {t.target_date}</span>}
            </div>
            {t.assignees.length > 0 && <p className="text-[10px] text-slate-400 mt-2">{t.assignees.map(a => a.full_name || a.email).join(", ")}</p>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">No tasks in this workspace yet.</p>
          <button onClick={() => setEditingTask("new")} className="mt-2 text-sm text-indigo-600 hover:underline">Create one to get started</button>
        </div>
      )}

      {/* Quick add */}
      {showAdd && <QuickAddModal workspace={selectedWs} onSave={handleQuickAdd} onCancel={() => setShowAdd(false)} />}

      {/* Full task edit */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <TaskForm
              task={editingTask === "new" ? null : editingTask}
              profiles={profiles}
              workspaces={workspaces.map(w => ({ slug: w.slug, title: w.title }))}
              defaultWorkspace={selectedWs ?? undefined}
              onSave={handleTaskSave}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Workspace form modal ==========
function WorkspaceFormModal({ ws, onSave, onCancel }: { ws: WorkspaceGroup | null; onSave: (form: Partial<WorkspaceGroup>) => void; onCancel: () => void }) {
  const isNew = !ws;
  const [title, setTitle] = useState(ws?.title ?? "");
  const [description, setDescription] = useState(ws?.description ?? "");
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">{isNew ? "New Workspace" : "Edit Workspace"}</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) onSave({ title: title.trim(), description: description.trim() }); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="Workspace name" autoFocus required /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><textarea className={c + " h-16"} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this workspace for?" /></div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{isNew ? "Create" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== Quick add modal ==========
function QuickAddModal({ workspace, onSave, onCancel }: { workspace: string; onSave: (title: string, ws: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">New Task</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) onSave(title.trim(), workspace); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Task name</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus required /></div>
          <p className="text-xs text-slate-500">Workspace: <strong>{workspace}</strong></p>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
