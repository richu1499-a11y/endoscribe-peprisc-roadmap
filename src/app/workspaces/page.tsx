"use client";

import { useEffect, useState, useCallback } from "react";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups, createWorkspaceGroup, updateWorkspaceGroup, deleteWorkspaceGroup } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import { clsx } from "clsx";
import { Plus, Settings2, X, Trash2, Pencil } from "lucide-react";

const WS_COLORS: Record<string, string> = {
  "endoscribe-core-template-engine": "#0d9488",
  "voice-asr-room-workflow": "#f59e0b",
  "peprisc-prediction-models": "#8b5cf6",
  "recommendation-engine": "#ec4899",
  "analytics-quality": "#14b8a6",
  "infrastructure-deployment-strategy": "#06b6d4",
  "validation-regulatory-translation": "#ef4444",
};

const WS_SCOPE: Record<string, string[]> = {
  "endoscribe-core-template-engine": ["ERCP, EUS, and colonoscopy template refinement", "Template coverage expansion", "Multi-agentic / adaptive template framework", "Clinician dictation and note workflow", "Patient-identifier masking and transcript safety"],
  "voice-asr-room-workflow": ["Med ASR evaluation and model comparison", "Phone vs operating-room microphone testing", "Multi-speaker / diarization handling", "Relevant-speech capture", "ASR hosting and latency considerations"],
  "peprisc-prediction-models": ["Hands-free PEPRisc calculation", "Real-time or trigger-based workflow", "PEPRisc ground-truth comparison", "Prediction-model drift monitoring", "Future prediction models beyond PEPRisc"],
  "recommendation-engine": ["Refine existing recommendation logics", "Recommendation engine expansion", "Guideline-update strategy", "Recommendation validation", "MVP recommendation set"],
  "analytics-quality": ["EndoScribe KPIs and quality metrics", "Provider-level analytics framework", "Facility-level analytics framework", "Dashboard/reporting requirements", "Future benchmarking concepts"],
  "infrastructure-deployment-strategy": ["Systems architecture and data-flow diagram", "MVP and long-term deployment strategy", "Hopkins/DSAI compute and GPU strategy", "Database and queue architecture", "CI/CD pipeline and federated learning"],
  "validation-regulatory-translation": ["EndoScribe and PEPRisc prospective validation", "IRB amendment and ASGE protocol alignment", "Non-interventional / shadow-mode study design", "FDA Pre-Sub preparation", "Regulatory question list"],
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [editingWs, setEditingWs] = useState<WorkspaceGroup | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    setTasks(await getTasksWithAssignees(rawTasks, assigns, profs));
    setWorkspaces(ws.filter(w => w.is_visible));
    if (isSupabaseConfigured) {
      const role = await getCurrentRole();
      setUserCanEdit(checkCanEdit(role));
    }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  const [now] = useState(() => new Date().toISOString().slice(0, 10));
  const activeTasks = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");

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
      ? `"${ws.title}" has ${wsTaskCount} task(s). Tasks will keep their workspace tag but this workspace card will be removed. Continue?`
      : `Delete workspace "${ws.title}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteWorkspaceGroup(ws.id);
      showFb("Workspace deleted");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workspaces</h1>
          <p className="text-base text-slate-500 mt-2">{workspaces.length} strategic verticals &middot; {activeTasks.length} active tasks</p>
        </div>
        {userCanEdit && (
          <div className="flex gap-2">
            <button onClick={() => setManageMode(!manageMode)} className={clsx("flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors", manageMode ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50")}>
              <Settings2 className="h-4 w-4" /> {manageMode ? "Done" : "Manage"}
            </button>
            {manageMode && (
              <button onClick={() => setEditingWs("new")} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                <Plus className="h-4 w-4" /> New Workspace
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{feedback}</div>}

      <div className="grid gap-6 sm:grid-cols-2">
        {workspaces.map(ws => {
          const wt = activeTasks.filter(t => t.workspace === ws.slug);
          const high = wt.filter(t => t.priority === "Critical" || t.priority === "High").length;
          const dueSoon = wt.filter(t => t.target_date && t.target_date >= now && t.target_date <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)).length;
          const color = WS_COLORS[ws.slug] ?? "#64748b";
          const scope = WS_SCOPE[ws.slug] ?? [];

          return (
            <div key={ws.slug} className="rounded-2xl border border-slate-200 bg-white p-7 hover:shadow-lg transition-all relative">
              {/* Manage buttons */}
              {manageMode && userCanEdit && (
                <div className="absolute top-4 right-4 flex gap-1.5">
                  <button onClick={() => setEditingWs(ws)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-teal-600" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteWs(ws)} className="rounded-lg p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="h-3 w-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{ws.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{ws.description}</p>
                </div>
              </div>

              {scope.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  {scope.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-300 mt-0.5 shrink-0">&#x2022;</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-5 text-sm">
                <div><span className="text-2xl font-bold text-slate-900">{wt.length}</span><span className="text-slate-500 ml-1.5">active</span></div>
                {high > 0 && <div><span className="text-2xl font-bold text-amber-600">{high}</span><span className="text-slate-500 ml-1.5">high priority</span></div>}
                {dueSoon > 0 && <div><span className="text-2xl font-bold text-teal-600">{dueSoon}</span><span className="text-slate-500 ml-1.5">due soon</span></div>}
              </div>
            </div>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <p className="text-lg text-slate-500">No workspaces configured.</p>
          {userCanEdit && <button onClick={() => setEditingWs("new")} className="mt-3 text-sm text-teal-600 hover:underline font-medium">Create your first workspace</button>}
        </div>
      )}

      {editingWs && <WsFormModal ws={editingWs === "new" ? null : editingWs} onSave={handleSaveWs} onCancel={() => setEditingWs(null)} />}
    </div>
  );
}

function WsFormModal({ ws, onSave, onCancel }: { ws: WorkspaceGroup | null; onSave: (f: Partial<WorkspaceGroup>) => void; onCancel: () => void }) {
  const isNew = !ws;
  const [title, setTitle] = useState(ws?.title ?? "");
  const [description, setDescription] = useState(ws?.description ?? "");
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">{isNew ? "New Workspace" : "Edit Workspace"}</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) onSave({ title: title.trim(), description: description.trim() }); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="Workspace name" autoFocus required /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><textarea className={c + " h-20"} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this workspace for?" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">{isNew ? "Create" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
