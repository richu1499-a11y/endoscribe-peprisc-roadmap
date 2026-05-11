"use client";

import { useEffect, useState, useCallback } from "react";
import { getWorkstreams, getTasks, createTask, updateTask, deleteTask, subscribeToTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, replaceTaskAssignees } from "@/lib/roadmapStore";
import { uniqueValues } from "@/lib/roadmapUtils";
import type { RoadmapTask, Workstream, Profile, TaskAssignment, TaskWithAssignees } from "@/lib/roadmapTypes";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentUser, getCurrentRole, canEdit as checkCanEdit, isAdmin as checkIsAdmin } from "@/lib/auth";
import TaskTable from "@/components/TaskTable";
import TaskForm from "@/components/TaskForm";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import ComplianceBanner from "@/components/ComplianceBanner";
import { Plus, Search, Radio } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const isDev = process.env.NODE_ENV === "development";

type TabKey = "my-tasks" | "my-week" | "all";

function isInCurrentWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

function isActiveNow(t: RoadmapTask): boolean {
  if (!t.start_date || !t.target_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return t.start_date <= today && t.target_date >= today;
}

export default function TasksPage() {
  const [allTasks, setAllTasks] = useState<TaskWithAssignees[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");

  const [search, setSearch] = useState("");
  const [filterWs, setFilterWs] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterFda, setFilterFda] = useState("");
  const [filterHipaa, setFilterHipaa] = useState("");

  const [selected, setSelected] = useState<RoadmapTask | TaskWithAssignees | null>(null);
  const [editing, setEditing] = useState<RoadmapTask | null | "new">(null);
  const [userCanEdit, setUserCanEdit] = useState(!isSupabaseConfigured && isDev);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments()]);
    setProfiles(profs);
    setAssignments(assigns);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setAllTasks(enriched);
  }, []);

  useEffect(() => {
    (async () => {
      setWorkstreams(await getWorkstreams());
      await refresh();
      if (isSupabaseConfigured) {
        const [role, user] = await Promise.all([getCurrentRole(), getCurrentUser()]);
        setUserCanEdit(checkCanEdit(role));
        setUserIsAdmin(checkIsAdmin(role));
        setCurrentUserId(user?.id ?? null);
        if (user) setTab("my-tasks");
      }
    })();
    const sub = subscribeToTasks(async () => { await refresh(); });
    return () => sub.unsubscribe();
  }, [refresh]);

  // Derived task sets
  const myAssignedIds = new Set(assignments.filter(a => a.user_id === currentUserId).map(a => a.task_id));
  const myTasks = allTasks.filter(t => myAssignedIds.has(t.id));
  const myWeekTasks = myTasks.filter(t =>
    isInCurrentWeek(t.target_date) || isActiveNow(t) || (t.status === "In progress")
  );

  // Which source list for current tab
  const baseTasks = tab === "my-tasks" ? myTasks : tab === "my-week" ? myWeekTasks : allTasks;

  // Apply filters
  let filtered = baseTasks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q)
    );
  }
  if (filterWs) filtered = filtered.filter(t => t.workstream_id === filterWs);
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);
  if (filterOwner) filtered = filtered.filter(t => t.owner === filterOwner);
  if (filterAssignee) filtered = filtered.filter(t => t.assignees.some(p => p.id === filterAssignee));
  if (filterFda) filtered = filtered.filter(t => t.regulatory_relevance === filterFda);
  if (filterHipaa) filtered = filtered.filter(t => t.hipaa_relevance === filterHipaa);

  async function handleSave(task: RoadmapTask, assigneeIds?: string[]) {
    setError(null);
    try {
      if (editing === "new") {
        await createTask(task);
      } else {
        await updateTask(task.id, task);
      }
      if (assigneeIds !== undefined && userIsAdmin) {
        await replaceTaskAssignees(task.id, assigneeIds);
      }
      setEditing(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete(id: string) {
    if (!userCanEdit) return;
    if (!confirm(`Delete task ${id}?`)) return;
    setError(null);
    try {
      await deleteTask(id);
      setSelected(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const selectCls = "rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-700 bg-white focus:border-indigo-400 focus:outline-none";
  const tabCls = (key: TabKey) => clsx(
    "px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors",
    tab === key ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
  );

  const editingTask = editing && editing !== "new" ? editing : null;
  const editingAssigneeIds = editingTask ? assignments.filter(a => a.task_id === editingTask.id).map(a => a.user_id) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured && <span className="flex items-center gap-1 text-xs text-green-600"><Radio className="h-3 w-3" /> Live</span>}
          {!isSupabaseConfigured && <span className="text-xs text-amber-600">Mock mode</span>}
          {userCanEdit && (
            <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!isSupabaseConfigured && isDev && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Mock demo mode. <Link href="/setup" className="underline">Configure Supabase</Link>
        </div>
      )}

      {/* Tabs */}
      {currentUserId && (
        <div className="flex gap-1 border-b border-slate-200">
          <button className={tabCls("my-tasks")} onClick={() => setTab("my-tasks")}>My Tasks ({myTasks.length})</button>
          <button className={tabCls("my-week")} onClick={() => setTab("my-week")}>My Week ({myWeekTasks.length})</button>
          <button className={tabCls("all")} onClick={() => setTab("all")}>All Tasks ({allTasks.length})</button>
        </div>
      )}

      <ComplianceBanner />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          <input className="rounded border border-slate-300 py-1.5 pl-7 pr-3 text-xs focus:border-indigo-400 focus:outline-none w-44" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workstreams</option>
          {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
        </select>
        <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueValues(allTasks, "status").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {uniqueValues(allTasks, "priority").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {uniqueValues(allTasks, "owner").map(v => <option key={v}>{v}</option>)}
        </select>
        {profiles.length > 0 && (
          <select className={selectCls} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Assignees</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
        )}
        <select className={selectCls} value={filterFda} onChange={e => setFilterFda(e.target.value)}>
          <option value="">All FDA</option>
          {uniqueValues(allTasks, "regulatory_relevance").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterHipaa} onChange={e => setFilterHipaa(e.target.value)}>
          <option value="">All HIPAA</option>
          {uniqueValues(allTasks, "hipaa_relevance").map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} of {baseTasks.length} tasks</p>

      <TaskTable tasks={filtered} workstreams={workstreams} onSelect={setSelected} onDelete={userCanEdit ? handleDelete : () => {}} />

      {selected && !editing && (
        <TaskDetailDrawer task={selected} workstreams={workstreams} onClose={() => setSelected(null)} onEdit={userCanEdit ? (t => { setEditing(t); setSelected(null); }) : (() => {})} />
      )}

      {editing && userCanEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <TaskForm
              task={editing === "new" ? null : editing}
              profiles={profiles}
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
