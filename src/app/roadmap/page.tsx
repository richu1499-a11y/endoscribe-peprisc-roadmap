"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups, getMilestones } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup, Milestone } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Target, X, Filter } from "lucide-react";
import Link from "next/link";

const WS_COLORS: Record<string, string> = {
  "endoscribe-core-template-engine": "#3b82f6",
  "peprisc-model-integration": "#8b5cf6",
  "validation-and-research": "#10b981",
  "hardware-audio-workflow": "#f59e0b",
  "irb-regulatory-compliance": "#ef4444",
  "platform-and-infrastructure": "#06b6d4",
  "project-management-ops": "#64748b",
  // Legacy fallbacks
  "endoscribe-core": "#3b82f6", "peprisc": "#8b5cf6", "hardware-workflow": "#f59e0b",
  "irb-fda-translation": "#ef4444", "research-study-trial": "#10b981",
};

const PRIORITY_BORDER: Record<string, string> = {
  Critical: "border-l-red-500", High: "border-l-amber-500", Medium: "border-l-blue-400", Low: "border-l-slate-300",
};

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  const refresh = useCallback(async () => {
    const [raw, profs, assigns, ws, ms] = await Promise.all([
      getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups(), getMilestones(),
    ]);
    setTasks(await getTasksWithAssignees(raw, assigns, profs));
    setWorkspaces(ws);
    setMilestones(ms);
    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id ?? null);
    }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  // Start with all workspaces expanded
  useEffect(() => {
    if (workspaces.length > 0 && expandedWs.size === 0) {
      setExpandedWs(new Set(workspaces.map(w => w.slug)));
    }
  }, [workspaces, expandedWs.size]);

  const filtered = useMemo(() => {
    let t = tasks;
    if (!showComplete) t = t.filter(x => x.status !== "Complete");
    if (filterStatus) t = t.filter(x => x.status === filterStatus);
    if (filterPriority) t = t.filter(x => x.priority === filterPriority);
    return t;
  }, [tasks, showComplete, filterStatus, filterPriority]);

  // Group by workspace → epic
  const byWorkspace = useMemo(() => {
    const map = new Map<string, Map<string, TaskWithAssignees[]>>();
    for (const t of filtered) {
      const ws = t.workspace ?? "unassigned";
      if (!map.has(ws)) map.set(ws, new Map());
      const epicMap = map.get(ws)!;
      const epic = t.epic || "General";
      if (!epicMap.has(epic)) epicMap.set(epic, []);
      epicMap.get(epic)!.push(t);
    }
    return map;
  }, [filtered]);

  // Stats
  const totalActive = filtered.filter(t => t.status !== "Complete" && t.status !== "Deferred").length;
  const inProgress = filtered.filter(t => t.status === "In progress").length;
  const blocked = filtered.filter(t => t.status === "Blocked").length;
  const complete = tasks.filter(t => t.status === "Complete").length;
  const totalTasks = tasks.length;

  function toggleWs(slug: string) {
    setExpandedWs(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  function toggleEpic(key: string) {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function wsProgress(slug: string): { done: number; total: number; pct: number } {
    const wsTasks = tasks.filter(t => t.workspace === slug);
    const done = wsTasks.filter(t => t.status === "Complete").length;
    const total = wsTasks.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  const selCls = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Program Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalActive} active across {workspaces.length} workspaces | {complete}/{totalTasks} complete
          </p>
        </div>
        <Link href="/network" className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
          Network View
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active" value={totalActive} color="bg-blue-500" />
        <StatCard label="In Progress" value={inProgress} color="bg-emerald-500" />
        <StatCard label="Blocked" value={blocked} color={blocked > 0 ? "bg-red-500" : "bg-slate-400"} />
        <StatCard label="Complete" value={complete} sub={`of ${totalTasks}`} color="bg-green-600" />
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" /> Milestones
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map(ms => (
              <div key={ms.id} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-slate-400">{ms.id}</span>
                  <StatusBadge status={ms.status} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{ms.title}</h3>
                {ms.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ms.description}</p>}
                {ms.target_date && <p className="text-xs font-medium text-indigo-600 mt-2">Target: {ms.target_date}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <select className={selCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Not started</option>
          <option>In progress</option>
          <option>Blocked</option>
          <option>Deferred</option>
        </select>
        <select className={selCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={showComplete} onChange={() => setShowComplete(!showComplete)} className="rounded" /> Completed
        </label>
      </div>

      {/* Program Board - Workspace Verticals */}
      <div className="space-y-4">
        {workspaces.map(ws => {
          const epicMap = byWorkspace.get(ws.slug);
          const wsColor = WS_COLORS[ws.slug] ?? "#64748b";
          const prog = wsProgress(ws.slug);
          const isExpanded = expandedWs.has(ws.slug);
          const taskCount = epicMap ? [...epicMap.values()].reduce((s, arr) => s + arr.length, 0) : 0;

          return (
            <section key={ws.slug} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Workspace header */}
              <button
                onClick={() => toggleWs(ws.slug)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: wsColor }} />
                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-slate-900">{ws.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{ws.description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-medium text-slate-600">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
                  {/* Progress bar */}
                  <div className="w-24 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, backgroundColor: wsColor }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{prog.pct}%</span>
                  </div>
                </div>
              </button>

              {/* Epics within workspace */}
              {isExpanded && epicMap && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {[...epicMap.entries()].map(([epicName, epicTasks]) => {
                    const epicKey = `${ws.slug}:${epicName}`;
                    const epicExpanded = !expandedEpics.has(epicKey); // default expanded
                    const epicDone = epicTasks.filter(t => t.status === "Complete").length;

                    return (
                      <div key={epicKey}>
                        <button
                          onClick={() => toggleEpic(epicKey)}
                          className="w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          {epicExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                          <span className="text-sm font-semibold text-slate-700">{epicName}</span>
                          <span className="text-xs text-slate-400">{epicDone}/{epicTasks.length} done</span>
                        </button>

                        {epicExpanded && (
                          <div className="px-6 pb-3 space-y-2">
                            {epicTasks.map(t => {
                              const owner = t.owner || (t.assignees.length > 0 ? (t.assignees[0].full_name || t.assignees[0].email) : "");
                              const isMyTask = currentUserId && t.assignees.some(a => a.id === currentUserId);
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelected(t)}
                                  className={clsx(
                                    "flex items-center justify-between rounded-lg border border-l-4 px-4 py-3 cursor-pointer hover:shadow-md transition-all",
                                    PRIORITY_BORDER[t.priority] ?? "border-l-slate-300",
                                    isMyTask ? "bg-indigo-50/40 border-indigo-200" : "bg-white border-slate-100",
                                    selected?.id === t.id && "ring-2 ring-indigo-400"
                                  )}
                                >
                                  <div className="min-w-0 flex-1 mr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] text-slate-400">{t.id}</span>
                                      <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                                    </div>
                                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                      {owner && <span className="text-indigo-600 font-medium">{owner}</span>}
                                      {t.target_date && <span>Due {t.target_date}</span>}
                                      {isMyTask && <span className="text-emerald-600 font-medium">Assigned to you</span>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <PriorityBadge priority={t.priority} />
                                    <StatusBadge status={t.status} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No tasks message */}
              {isExpanded && !epicMap && (
                <div className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-400">
                  No tasks in this workspace yet.
                </div>
              )}
            </section>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-lg text-slate-500">No tasks match your filters.</p>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex gap-2 items-center">
              <span className="font-mono text-xs text-slate-400">{selected.id}</span>
              <StatusBadge status={selected.status} />
              <PriorityBadge priority={selected.priority} />
            </div>
            <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
            {selected.description && <p className="text-sm text-slate-600">{selected.description}</p>}
            <Df label="Workspace">{selected.workspace}</Df>
            <Df label="Epic">{selected.epic}</Df>
            <Df label="Owner">{selected.owner}</Df>
            <Df label="Assignees">{selected.assignees.length > 0 ? selected.assignees.map(a => a.full_name || a.email).join(", ") : null}</Df>
            <Df label="Due Date">{selected.target_date}</Df>
            <Df label="Dependencies">{selected.dependencies?.length > 0 ? selected.dependencies.join(", ") : null}</Df>
            <Df label="Next Action">{selected.next_action}</Df>
            <Df label="Notes">{selected.notes}</Df>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-center gap-4">
      <div className={clsx("h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold", color)}>{value}</div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="text-base text-slate-800 mt-0.5">{children || <span className="text-slate-300">--</span>}</dd></div>;
}
