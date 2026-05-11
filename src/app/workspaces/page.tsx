"use client";

import { useEffect, useState, useCallback } from "react";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, createTask } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { TaskWithAssignees, Profile } from "@/lib/roadmapTypes";
import {} from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import { Plus, X } from "lucide-react";
import { clsx } from "clsx";

interface WorkspaceGroup { slug: string; title: string; description: string; icon: string }

const FALLBACK_WS: WorkspaceGroup[] = [
  { slug: "endoscribe-core", title: "EndoScribe Core", description: "Ambient AI scribe, procedure documentation, speech-to-structure.", icon: "FileText" },
  { slug: "peprisc", title: "PEPRisc", description: "Post-ERCP pancreatitis risk prediction and model integration.", icon: "BarChart" },
  { slug: "hardware-workflow", title: "Hardware / Workflow", description: "Audio capture, microphones, procedural-room workflow.", icon: "Settings" },
  { slug: "irb-fda-translation", title: "IRB, FDA & Translation", description: "IRB, HIPAA, FDA/CDS/SaMD, JHTV, and commercialization.", icon: "Shield" },
  { slug: "research-study-trial", title: "Research Study / Prospective Trial", description: "Study design, validation cohort, outcomes, publication.", icon: "FlaskConical" },
];

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>(FALLBACK_WS);
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "overdue" | "done">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments()]);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setTasks(enriched.filter(t => !t.is_archived));
    setProfiles(profs);
    if (isSupabaseConfigured) {
      const sb = getSupabaseBrowser();
      if (sb) {
        const { data } = await sb.from("workspace_groups").select("*").order("order_index");
        if (data && data.length > 0) setWorkspaces(data as WorkspaceGroup[]);
      }
      const [user, role] = await Promise.all([getCurrentUser(), getCurrentRole()]);
      setCurrentUserId(user?.id ?? null);
      setUserCanEdit(checkCanEdit(role));
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
      await createTask({ id, title, description: "", workstream_id: "", owner: "", contributors: [], status: "Not started", priority: "Medium", start_date: null, target_date: null, dependencies: [], deliverables: [], blockers: [], risks: [], decision_needed: "", regulatory_relevance: "None", hipaa_relevance: "None", evidence_stage: "Concept", gsd_goal: "", next_action: "", notes: "", workspace: ws } as never);
      setShowAdd(false);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const filterCls = (f: string) => clsx("px-3 py-1 text-xs rounded-full transition-colors", filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200");

  // Workspace cards view
  if (!selectedWs) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workspaces</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organized project verticals for the EndoScribe + PEPRisc roadmap.</p>
        </div>
        <ComplianceBanner />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map(ws => {
            const count = tasks.filter(t => t.workspace === ws.slug).length;
            const overdue = tasks.filter(t => t.workspace === ws.slug && t.target_date && t.target_date < now && t.status !== "Complete").length;
            return (
              <button key={ws.slug} onClick={() => setSelectedWs(ws.slug)} className="rounded-lg border border-slate-200 bg-white p-5 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
                <h3 className="text-sm font-semibold text-slate-800">{ws.title}</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ws.description}</p>
                <div className="mt-3 flex gap-3 text-xs">
                  <span className="text-slate-600">{count} task{count !== 1 ? "s" : ""}</span>
                  {overdue > 0 && <span className="text-red-600">{overdue} overdue</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Workspace detail view
  const ws = workspaces.find(w => w.slug === selectedWs);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => setSelectedWs(null)} className="text-xs text-indigo-600 hover:underline mb-1">All Workspaces</button>
          <h1 className="text-xl font-bold text-slate-900">{ws?.title ?? selectedWs}</h1>
          <p className="text-xs text-slate-500">{ws?.description}</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Task
          </button>
        )}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2">
        <button className={filterCls("all")} onClick={() => setFilter("all")}>All ({wsTasks.length})</button>
        <button className={filterCls("mine")} onClick={() => setFilter("mine")}>Mine</button>
        <button className={filterCls("overdue")} onClick={() => setFilter("overdue")}>Overdue</button>
        <button className={filterCls("done")} onClick={() => setFilter("done")}>Done</button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">No tasks yet.</p>
          {userCanEdit && <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-indigo-600 hover:underline">Create your first task</button>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2.5">Task</th><th className="px-4 py-2.5">Assignee</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Due</th><th className="px-4 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{t.assignees.map(a => a.full_name || a.email).join(", ") || "--"}</td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{t.target_date ?? "--"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick add modal */}
      {showAdd && (
        <QuickAddModal workspace={selectedWs} onSave={handleQuickAdd} onCancel={() => setShowAdd(false)} />
      )}
    </div>
  );
}

function QuickAddModal({ workspace, onSave, onCancel }: { workspace: string; onSave: (title: string, ws: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const c = "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">New Task</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) onSave(title.trim(), workspace); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Task name</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus required /></div>
          <p className="text-xs text-slate-500">Workspace: <strong>{workspace}</strong></p>
          <p className="text-[10px] text-slate-400">You can add description, assignee, dates, and priority after creating.</p>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
