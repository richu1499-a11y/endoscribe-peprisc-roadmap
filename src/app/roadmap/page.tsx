"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getTasks,
  getProfiles,
  getTaskAssignments,
  getTasksWithAssignees,
  getWorkspaceGroups,
  getMilestones,
} from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type {
  TaskWithAssignees,
  WorkspaceGroup,
  Milestone,
} from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronRight,
  Target,
  X,
  Filter,
  BarChart3,
  Layers,
  Share2,
  Cuboid,
} from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

/* ──────────────────────────────────────────────────────────── */
/*  Constants                                                   */
/* ──────────────────────────────────────────────────────────── */

const WS_COLORS: Record<string, string> = {
  "endoscribe-core-template-engine": "#3b82f6",
  "peprisc-prediction-models": "#8b5cf6",
  "validation-and-research": "#10b981",
  "hardware-audio-workflow": "#f59e0b",
  "irb-regulatory-compliance": "#ef4444",
  "platform-and-infrastructure": "#06b6d4",
  "project-management-ops": "#64748b",
  "voice-asr-room-workflow": "#f59e0b",
  "recommendation-engine": "#ec4899",
  "analytics-quality": "#14b8a6",
  "infrastructure-deployment-strategy": "#06b6d4",
  "validation-regulatory-translation": "#ef4444",
  // Legacy fallbacks
  "endoscribe-core": "#3b82f6",
  "peprisc": "#8b5cf6",
  "peprisc-model-integration": "#8b5cf6",
  "hardware-workflow": "#f59e0b",
  "irb-fda-translation": "#ef4444",
  "research-study-trial": "#10b981",
};

const PRIORITY_BORDER: Record<string, string> = {
  Critical: "border-l-red-500",
  High: "border-l-amber-500",
  Medium: "border-l-blue-400",
  Low: "border-l-slate-300",
};

type ViewTab = "executive" | "board" | "map";

const TABS: { key: ViewTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "executive", label: "Executive Roadmap", icon: BarChart3 },
  { key: "board", label: "Workspace Board", icon: Layers },
  { key: "map", label: "Roadmap Map", icon: Share2 },
];

/* ──────────────────────────────────────────────────────────── */
/*  Page component                                              */
/* ──────────────────────────────────────────────────────────── */

export default function RoadmapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialView = (searchParams.get("view") as ViewTab) || "executive";
  const [view, setView] = useState<ViewTab>(
    ["executive", "board", "map"].includes(initialView) ? initialView : "executive"
  );

  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);

  // Shared filters
  const [filterWs, setFilterWs] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  // Board state
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  // Map state
  const [colorBy, setColorBy] = useState<"workspace" | "status" | "priority">("workspace");

  /* ── Tab switching ── */
  function switchTab(tab: ViewTab) {
    setView(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  /* ── Data loading ── */
  const refresh = useCallback(async () => {
    const [raw, profs, assigns, ws, ms] = await Promise.all([
      getTasks(),
      getProfiles(),
      getTaskAssignments(),
      getWorkspaceGroups(),
      getMilestones(),
    ]);
    setTasks(await getTasksWithAssignees(raw, assigns, profs));
    setWorkspaces(ws);
    setMilestones(ms);
    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id ?? null);
    }
  }, []);

  useEffect(() => {
    const init = async () => { await refresh(); };
    init();
  }, [refresh]);

  // Auto-expand all workspaces for the board tab
  useEffect(() => {
    if (workspaces.length > 0 && expandedWs.size === 0) {
      setExpandedWs(new Set(workspaces.map((w) => w.slug)));
    }
  }, [workspaces, expandedWs.size]);

  /* ── Derived data ── */
  const filtered = useMemo(() => {
    let t = tasks;
    if (!showComplete) t = t.filter((x) => x.status !== "Complete");
    if (filterWs) t = t.filter((x) => x.workspace === filterWs);
    if (filterStatus) t = t.filter((x) => x.status === filterStatus);
    if (filterPriority) t = t.filter((x) => x.priority === filterPriority);
    return t;
  }, [tasks, showComplete, filterWs, filterStatus, filterPriority]);

  // Group by workspace -> epic
  const byWorkspaceEpic = useMemo(() => {
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

  // Flat group by workspace (for map legend / executive)
  const byWorkspace = useMemo(() => {
    const map = new Map<string, TaskWithAssignees[]>();
    for (const t of filtered) {
      const ws = t.workspace ?? "unassigned";
      const list = map.get(ws) ?? [];
      list.push(t);
      map.set(ws, list);
    }
    return map;
  }, [filtered]);

  /* ── Stats ── */
  const totalActive = filtered.filter(
    (t) => t.status !== "Complete" && t.status !== "Deferred"
  ).length;
  const inProgress = filtered.filter((t) => t.status === "In progress").length;
  const blocked = filtered.filter((t) => t.status === "Blocked").length;
  const complete = tasks.filter((t) => t.status === "Complete").length;
  const totalTasks = tasks.length;

  /* ── Workspace helpers ── */
  function toggleWs(slug: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  function toggleEpic(key: string) {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function wsProgress(slug: string): { done: number; total: number; pct: number } {
    const wsTasks = tasks.filter((t) => t.workspace === slug);
    const done = wsTasks.filter((t) => t.status === "Complete").length;
    const total = wsTasks.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  /* ── Graph data (for Map tab) ── */
  const graphData = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const nodes: any[] = [];
    const links: any[] = [];
    const taskIds = new Set(filtered.map((t) => t.id));
    const usedWs = new Set(filtered.map((t) => t.workspace).filter(Boolean));

    for (const ws of workspaces) {
      if (usedWs.has(ws.slug)) {
        nodes.push({
          id: `ws:${ws.slug}`,
          label: ws.title,
          color: WS_COLORS[ws.slug] ?? "#64748b",
          val: 20,
          type: "workspace",
          owner: "",
        });
      }
    }

    for (const t of filtered) {
      const wsColor = WS_COLORS[t.workspace ?? ""] ?? "#64748b";
      const color =
        colorBy === "workspace"
          ? wsColor
          : colorBy === "status"
          ? ({
              "Not started": "#94a3b8",
              "In progress": "#3b82f6",
              Blocked: "#ef4444",
              Complete: "#22c55e",
              Deferred: "#a78bfa",
            }[t.status] ?? "#94a3b8")
          : t.priority === "Critical"
          ? "#ef4444"
          : t.priority === "High"
          ? "#f59e0b"
          : "#3b82f6";
      const size =
        t.priority === "Critical" ? 12 : t.priority === "High" ? 9 : 6;
      const owner =
        t.owner ||
        (t.assignees.length > 0
          ? t.assignees[0].full_name || t.assignees[0].email
          : "");
      nodes.push({
        id: t.id,
        label: t.title,
        color,
        val: size,
        type: "task",
        owner,
        meta: t,
      });
      if (t.workspace && usedWs.has(t.workspace))
        links.push({ source: `ws:${t.workspace}`, target: t.id, color: "#e2e8f0" });
      for (const dep of t.dependencies ?? []) {
        if (taskIds.has(dep))
          links.push({ source: dep, target: t.id, color: "#94a3b8" });
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { nodes, links };
  }, [filtered, workspaces, colorBy]);

  const depCount = graphData.links.filter(
    (l: { color: string }) => l.color === "#94a3b8"
  ).length;

  /* ── Style helpers ── */
  const selCls =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none";

  /* ════════════════════════════════════════════════════════════ */
  /*  RENDER                                                      */
  /* ════════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalActive} active across {workspaces.length} workspaces |{" "}
            {complete}/{totalTasks} complete
          </p>
        </div>
      </div>

      {/* ── Segmented control ── */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Shared filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          className={selCls}
          value={filterWs}
          onChange={(e) => setFilterWs(e.target.value)}
        >
          <option value="">All Workspaces</option>
          {workspaces.map((w) => (
            <option key={w.slug} value={w.slug}>
              {w.title}
            </option>
          ))}
        </select>
        <select
          className={selCls}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option>Not started</option>
          <option>In progress</option>
          <option>Blocked</option>
          <option>Deferred</option>
        </select>
        <select
          className={selCls}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showComplete}
            onChange={() => setShowComplete(!showComplete)}
            className="rounded"
          />{" "}
          Completed
        </label>
        {view === "map" && (
          <select
            className={selCls}
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value as typeof colorBy)}
          >
            <option value="workspace">Color: Workspace</option>
            <option value="status">Color: Status</option>
            <option value="priority">Color: Priority</option>
          </select>
        )}
      </div>

      {/* ================================================================ */}
      {/*  TAB 1 - EXECUTIVE ROADMAP                                       */}
      {/* ================================================================ */}
      {view === "executive" && (
        <div className="space-y-8">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Active" value={totalActive} color="bg-blue-500" />
            <StatCard label="In Progress" value={inProgress} color="bg-emerald-500" />
            <StatCard
              label="Blocked"
              value={blocked}
              color={blocked > 0 ? "bg-red-500" : "bg-slate-400"}
            />
            <StatCard
              label="Complete"
              value={complete}
              sub={`of ${totalTasks}`}
              color="bg-green-600"
            />
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" /> Milestones
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {milestones.map((ms) => (
                  <div
                    key={ms.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={ms.status} />
                      {ms.target_date && (
                        <span className="text-xs font-medium text-indigo-600">
                          Target: {ms.target_date}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {ms.title}
                    </h3>
                    {ms.description && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {ms.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Workspace progress overview */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Workspace Progress
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((ws) => {
                const prog = wsProgress(ws.slug);
                const wsColor = WS_COLORS[ws.slug] ?? "#64748b";
                const wsTasks = byWorkspace.get(ws.slug) ?? [];
                const wsBlocked = wsTasks.filter(
                  (t) => t.status === "Blocked"
                ).length;
                const wsInProgress = wsTasks.filter(
                  (t) => t.status === "In progress"
                ).length;

                return (
                  <div
                    key={ws.slug}
                    className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: wsColor }}
                      />
                      <h3 className="text-base font-semibold text-slate-900 flex-1 min-w-0 truncate">
                        {ws.title}
                      </h3>
                      <span className="text-sm font-bold text-slate-700">
                        {prog.pct}%
                      </span>
                    </div>
                    {ws.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-1">
                        {ws.description}
                      </p>
                    )}
                    {/* Progress bar */}
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${prog.pct}%`,
                          backgroundColor: wsColor,
                        }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>
                        {prog.done}/{prog.total} done
                      </span>
                      {wsInProgress > 0 && (
                        <span className="text-blue-600 font-medium">
                          {wsInProgress} in progress
                        </span>
                      )}
                      {wsBlocked > 0 && (
                        <span className="text-red-500 font-medium">
                          {wsBlocked} blocked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {filtered.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
              <p className="text-lg text-slate-500">No tasks match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  TAB 2 - WORKSPACE BOARD                                         */}
      {/* ================================================================ */}
      {view === "board" && (
        <div className="space-y-4">
          {workspaces.map((ws) => {
            const epicMap = byWorkspaceEpic.get(ws.slug);
            const wsColor = WS_COLORS[ws.slug] ?? "#64748b";
            const prog = wsProgress(ws.slug);
            const isExpanded = expandedWs.has(ws.slug);
            const taskCount = epicMap
              ? [...epicMap.values()].reduce((s, arr) => s + arr.length, 0)
              : 0;

            return (
              <section
                key={ws.slug}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Workspace header */}
                <button
                  onClick={() => toggleWs(ws.slug)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: wsColor }}
                  />
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-900">
                      {ws.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ws.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium text-slate-600">
                      {taskCount} task{taskCount !== 1 ? "s" : ""}
                    </span>
                    <div className="w-24 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${prog.pct}%`,
                            backgroundColor: wsColor,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">
                        {prog.pct}%
                      </span>
                    </div>
                  </div>
                </button>

                {/* Epics within workspace */}
                {isExpanded && epicMap && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {[...epicMap.entries()].map(([epicName, epicTasks]) => {
                      const epicKey = `${ws.slug}:${epicName}`;
                      const epicExpanded = !expandedEpics.has(epicKey);
                      const epicDone = epicTasks.filter(
                        (t) => t.status === "Complete"
                      ).length;

                      return (
                        <div key={epicKey}>
                          <button
                            onClick={() => toggleEpic(epicKey)}
                            className="w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            {epicExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span className="text-sm font-semibold text-slate-700">
                              {epicName}
                            </span>
                            <span className="text-xs text-slate-400">
                              {epicDone}/{epicTasks.length} done
                            </span>
                          </button>

                          {epicExpanded && (
                            <div className="px-6 pb-3 space-y-2">
                              {epicTasks.map((t) => {
                                const owner =
                                  t.owner ||
                                  (t.assignees.length > 0
                                    ? t.assignees[0].full_name ||
                                      t.assignees[0].email
                                    : "");
                                const isMyTask =
                                  currentUserId &&
                                  t.assignees.some(
                                    (a) => a.id === currentUserId
                                  );
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => setSelected(t)}
                                    className={clsx(
                                      "flex items-center justify-between rounded-lg border border-l-4 px-4 py-3 cursor-pointer hover:shadow-md transition-all",
                                      PRIORITY_BORDER[t.priority] ??
                                        "border-l-slate-300",
                                      isMyTask
                                        ? "bg-indigo-50/40 border-indigo-200"
                                        : "bg-white border-slate-100",
                                      selected?.id === t.id &&
                                        "ring-2 ring-indigo-400"
                                    )}
                                  >
                                    <div className="min-w-0 flex-1 mr-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] text-slate-400">
                                          {t.id}
                                        </span>
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                          {t.title}
                                        </p>
                                      </div>
                                      <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                        {owner && (
                                          <span className="text-indigo-600 font-medium">
                                            {owner}
                                          </span>
                                        )}
                                        {t.target_date && (
                                          <span>Due {t.target_date}</span>
                                        )}
                                        {isMyTask && (
                                          <span className="text-emerald-600 font-medium">
                                            Assigned to you
                                          </span>
                                        )}
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

          {filtered.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
              <p className="text-lg text-slate-500">No tasks match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  TAB 3 - ROADMAP MAP                                             */}
      {/* ================================================================ */}
      {view === "map" && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {colorBy === "workspace" &&
              workspaces
                .filter((w) => byWorkspace.has(w.slug))
                .map((w) => (
                  <span key={w.slug} className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: WS_COLORS[w.slug] }}
                    />
                    {w.title}
                  </span>
                ))}
            {colorBy === "status" &&
              [
                ["Not started", "#94a3b8"],
                ["In progress", "#3b82f6"],
                ["Blocked", "#ef4444"],
                ["Complete", "#22c55e"],
              ].map(([s, c]) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                  {s}
                </span>
              ))}
            {colorBy === "priority" &&
              [
                ["Critical", "#ef4444"],
                ["High", "#f59e0b"],
                ["Medium", "#3b82f6"],
              ].map(([p, c]) => (
                <span key={p} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                  {p}
                </span>
              ))}

            <div className="ml-auto">
              <button
                disabled
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
              >
                <Cuboid className="h-4 w-4" />
                Explore in 3D
              </button>
            </div>
          </div>

          {graphData.nodes.length > 0 ? (
            <div
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              style={{ height: 580 }}
            >
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              <ForceGraph2D
                graphData={graphData as any}
                nodeLabel={(n: any) => n.label}
                nodeColor={(n: any) => n.color}
                nodeVal={(n: any) => n.val}
                nodeCanvasObject={(
                  node: any,
                  ctx: CanvasRenderingContext2D,
                  globalScale: number
                ) => {
                  const size = node.val ?? 6;
                  if (node.type === "workspace") {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y - size);
                    ctx.lineTo(node.x + size, node.y);
                    ctx.lineTo(node.x, node.y + size);
                    ctx.lineTo(node.x - size, node.y);
                    ctx.closePath();
                    ctx.fillStyle = node.color;
                    ctx.fill();
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  } else {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                    ctx.fillStyle = node.color;
                    ctx.fill();
                    if (selected?.id === node.id) {
                      ctx.strokeStyle = "#1e3a5f";
                      ctx.lineWidth = 3;
                      ctx.stroke();
                    }
                  }
                  if (globalScale > 1) {
                    const title =
                      node.label.length > 30
                        ? node.label.slice(0, 28) + "..."
                        : node.label;
                    const fs = Math.max(3, 11 / globalScale);
                    ctx.font = `${
                      node.type === "workspace" ? "bold " : ""
                    }${fs}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.fillStyle = "#1e293b";
                    ctx.fillText(title, node.x, node.y + size + fs * 0.4 + 2);
                    if (node.owner && globalScale > 1.5) {
                      ctx.font = `${fs * 0.85}px sans-serif`;
                      ctx.fillStyle = "#6366f1";
                      ctx.fillText(
                        node.owner,
                        node.x,
                        node.y + size + fs * 1.4 + 3
                      );
                    }
                  }
                }}
                linkColor={(l: any) => l.color}
                linkWidth={1.5}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                onNodeClick={(n: any) => {
                  if (n.type === "task" && n.meta) setSelected(n.meta);
                }}
                onBackgroundClick={() => setSelected(null)}
                cooldownTicks={80}
                height={580}
              />
              {/* eslint-enable @typescript-eslint/no-explicit-any */}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
              <p className="text-lg text-slate-500">No tasks to display.</p>
            </div>
          )}
          <p className="text-xs text-slate-400">
            {filtered.length} tasks, {depCount} dependencies. Drag to pan.
            Scroll to zoom. Click a node for details.
          </p>
        </>
      )}

      {/* ── Detail slide-out panel (shared across all tabs) ── */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex gap-2 items-center">
              <span className="font-mono text-xs text-slate-400">
                {selected.id}
              </span>
              <StatusBadge status={selected.status} />
              <PriorityBadge priority={selected.priority} />
            </div>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {selected.title}
            </h2>
            {selected.description && (
              <p className="text-sm text-slate-600">{selected.description}</p>
            )}
            <Df label="Workspace">{selected.workspace}</Df>
            <Df label="Epic">{selected.epic}</Df>
            <Df label="Owner">{selected.owner}</Df>
            <Df label="Assignees">
              {selected.assignees.length > 0
                ? selected.assignees
                    .map((a) => a.full_name || a.email)
                    .join(", ")
                : null}
            </Df>
            <Df label="Due Date">{selected.target_date}</Df>
            <Df label="Dependencies">
              {selected.dependencies?.length > 0
                ? selected.dependencies.join(", ")
                : null}
            </Df>
            <Df label="Next Action">{selected.next_action}</Df>
            <Df label="Notes">{selected.notes}</Df>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Sub-components                                              */
/* ──────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-center gap-4">
      <div
        className={clsx(
          "h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold",
          color
        )}
      >
        {value}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Df({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="text-base text-slate-800 mt-0.5">
        {children || <span className="text-slate-300">--</span>}
      </dd>
    </div>
  );
}
