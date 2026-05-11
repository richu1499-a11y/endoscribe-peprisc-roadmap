"use client";

import { useEffect, useState, useCallback } from "react";
import { getWorkstreams, getTasks, createTask, updateTask, deleteTask, subscribeToTasks } from "@/lib/roadmapStore";
import { uniqueValues } from "@/lib/roadmapUtils";
import type { RoadmapTask, Workstream } from "@/lib/roadmapTypes";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import TaskTable from "@/components/TaskTable";
import TaskForm from "@/components/TaskForm";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import ComplianceBanner from "@/components/ComplianceBanner";
import { Plus, Search, Radio } from "lucide-react";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

export default function TasksPage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [search, setSearch] = useState("");
  const [filterWs, setFilterWs] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterFda, setFilterFda] = useState("");
  const [filterHipaa, setFilterHipaa] = useState("");
  const [selected, setSelected] = useState<RoadmapTask | null>(null);
  const [editing, setEditing] = useState<RoadmapTask | null | "new">(null);
  const [userCanEdit, setUserCanEdit] = useState(!isSupabaseConfigured && isDev); // mock mode allows edits only in dev
  const realtimeActive = isSupabaseConfigured;
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setTasks(await getTasks());
  }, []);

  useEffect(() => {
    (async () => {
      setWorkstreams(await getWorkstreams());
      await refresh();
      if (isSupabaseConfigured) {
        const role = await getCurrentRole();
        setUserCanEdit(checkCanEdit(role));
      }
    })();
    const sub = subscribeToTasks((fresh) => setTasks(fresh));
    return () => sub.unsubscribe();
  }, [refresh]);

  // Filters
  let filtered = tasks;
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
  if (filterFda) filtered = filtered.filter(t => t.regulatory_relevance === filterFda);
  if (filterHipaa) filtered = filtered.filter(t => t.hipaa_relevance === filterHipaa);

  async function handleSave(task: RoadmapTask) {
    setError(null);
    try {
      if (editing === "new") {
        await createTask(task);
      } else {
        await updateTask(task.id, task);
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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured && realtimeActive && (
            <span className="flex items-center gap-1 text-xs text-green-600"><Radio className="h-3 w-3" /> Realtime sync active</span>
          )}
          {!isSupabaseConfigured && (
            <span className="text-xs text-amber-600">Mock mode</span>
          )}
          {userCanEdit ? (
            <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          ) : isSupabaseConfigured ? (
            <span className="text-xs text-slate-500">View only (viewer role)</span>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!isSupabaseConfigured && isDev && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Mock demo mode: edits are not persisted.{" "}
          <Link href="/setup" className="underline">Configure Supabase</Link> for live mode.
        </div>
      )}

      {!isSupabaseConfigured && !isDev && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>Configuration required.</strong> Supabase environment variables are missing.{" "}
          <Link href="/setup" className="underline">View setup diagnostics</Link>
        </div>
      )}

      <ComplianceBanner />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="rounded border border-slate-300 py-1.5 pl-7 pr-3 text-xs focus:border-indigo-400 focus:outline-none w-48"
            placeholder="Search ID, title, owner..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={selectCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workstreams</option>
          {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
        </select>
        <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueValues(tasks, "status").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {uniqueValues(tasks, "priority").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {uniqueValues(tasks, "owner").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterFda} onChange={e => setFilterFda(e.target.value)}>
          <option value="">All FDA</option>
          {uniqueValues(tasks, "regulatory_relevance").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterHipaa} onChange={e => setFilterHipaa(e.target.value)}>
          <option value="">All HIPAA</option>
          {uniqueValues(tasks, "hipaa_relevance").map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} of {tasks.length} tasks</p>

      <TaskTable tasks={filtered} workstreams={workstreams} onSelect={setSelected} onDelete={userCanEdit ? handleDelete : () => {}} />

      {selected && !editing && (
        <TaskDetailDrawer task={selected} workstreams={workstreams} onClose={() => setSelected(null)} onEdit={userCanEdit ? (t => { setEditing(t); setSelected(null); }) : (() => {})} />
      )}

      {editing && userCanEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <TaskForm
              task={editing === "new" ? null : editing}
              workstreams={workstreams}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
