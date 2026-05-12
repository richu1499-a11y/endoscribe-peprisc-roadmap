"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getTasks, getWorkstreams, getProfiles, getTaskAssignments, getTasksWithAssignees } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, Workstream, Profile } from "@/lib/roadmapTypes";
import { uniqueValues } from "@/lib/roadmapUtils";
import {
  filterTimelineTasks, getTimelineWarnings, getWorkstreamTimelineSummary,
  getAssigneeWorkload, type TimelineFilters, type GroupByKey, type TimelineWarning,
} from "@/lib/timelineUtils";
import GanttChart from "@/components/GanttChart";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import { wsLabel } from "@/lib/roadmapUtils";
import { clsx } from "clsx";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type ViewMode = "team" | "mine" | "unassigned-critical" | "fda-hipaa";
type NearTermWindow = "week" | "7" | "14" | "30" | "60";

export default function TimelinePage() {
  const [allTasks, setAllTasks] = useState<TaskWithAssignees[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [filterWs, setFilterWs] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFda, setFilterFda] = useState("");
  const [filterHipaa, setFilterHipaa] = useState("");
  const [filterEvidence, setFilterEvidence] = useState("");
  const [dateWindow, setDateWindow] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("team");
  const [groupBy, setGroupBy] = useState<GroupByKey>("workstream");
  const [colorBy, setColorBy] = useState<"status" | "priority" | "regulatory_relevance" | "hipaa_relevance">("status");
  const [nearTerm, setNearTerm] = useState<NearTermWindow>("30");
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [rawTasks, ws, profs, assigns] = await Promise.all([
      getTasks(), getWorkstreams(), getProfiles(), getTaskAssignments(),
    ]);
    setWorkstreams(ws);
    setProfiles(profs);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setAllTasks(enriched);
    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id ?? null);
    }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  // Build filter object
  const filters: TimelineFilters = {
    workstream: filterWs || undefined,
    assignee: filterAssignee || undefined,
    owner: filterOwner || undefined,
    status: filterStatus || undefined,
    priority: filterPriority || undefined,
    fda: filterFda || undefined,
    hipaa: filterHipaa || undefined,
    evidenceStage: filterEvidence || undefined,
    dateWindow: dateWindow !== "all" ? dateWindow : undefined,
    onlyMine, onlyUnassigned, onlyCritical, onlyBlocked,
    currentUserId,
  };

  // Apply view mode presets
  let viewTasks = allTasks;
  if (viewMode === "mine" && currentUserId) {
    viewTasks = allTasks.filter(t => t.assignees.some(a => a.id === currentUserId));
  } else if (viewMode === "unassigned-critical") {
    viewTasks = allTasks.filter(t => t.priority === "Critical" && t.assignees.length === 0);
  } else if (viewMode === "fda-hipaa") {
    viewTasks = allTasks.filter(t => t.regulatory_relevance === "High" || t.regulatory_relevance === "Moderate" || t.hipaa_relevance === "High" || t.hipaa_relevance === "Moderate");
  }

  const filtered = filterTimelineTasks(viewTasks, filters);

  // Stable "now" reference for the render pass (avoids calling Date.now() during render)
  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);

  // Metrics
  const myFiltered = currentUserId ? filtered.filter(t => t.assignees.some(a => a.id === currentUserId)) : [];
  const cutoff30 = useMemo(() => new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10), [now]);
  const due30 = filtered.filter(t => t.target_date && t.target_date <= cutoff30 && t.target_date >= today);

  // Summaries
  const wsSummary = getWorkstreamTimelineSummary(filtered, workstreams);
  const workloadSummary = getAssigneeWorkload(allTasks, profiles);
  const warnings = getTimelineWarnings(allTasks);

  // Near-term tasks
  const nearTermDays = nearTerm === "week" ? 7 : parseInt(nearTerm);
  const nearTermCutoff = useMemo(() => new Date(now.getTime() + nearTermDays * 86_400_000).toISOString().slice(0, 10), [now, nearTermDays]);
  const nearTermTasks = filtered.filter(t => t.target_date && t.target_date <= nearTermCutoff).sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""));

  const selCls = "rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 bg-white focus:border-indigo-400 focus:outline-none";
  const toggleCls = (active: boolean) => clsx("rounded px-2.5 py-1 text-xs font-medium border transition-colors", active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500 hover:bg-slate-50");
  const viewBtnCls = (v: ViewMode) => clsx("px-3 py-1.5 text-xs font-medium rounded transition-colors", viewMode === v ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50");
  const ntBtnCls = (v: NearTermWindow) => clsx("px-2.5 py-1 text-xs rounded transition-colors", nearTerm === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Timeline / Gantt Roadmap</h1>
        <p className="text-xs text-slate-500 mt-0.5">Visual execution timeline for EndoScribe + PEPRisc workstreams, assignees, dependencies, and milestones</p>
      </div>

      <ComplianceBanner />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MetricCard label="Visible" value={filtered.length} />
        <MetricCard label="My Tasks" value={myFiltered.length} accent="blue" />
        <MetricCard label="Critical" value={filtered.filter(t => t.priority === "Critical").length} accent={filtered.some(t => t.priority === "Critical") ? "amber" : "default"} />
        <MetricCard label="Blocked" value={filtered.filter(t => t.status === "Blocked").length} accent={filtered.some(t => t.status === "Blocked") ? "red" : "default"} />
        <MetricCard label="Unassigned" value={filtered.filter(t => t.assignees.length === 0).length} />
        <MetricCard label="High FDA" value={filtered.filter(t => t.regulatory_relevance === "High").length} accent="amber" />
        <MetricCard label="High HIPAA" value={filtered.filter(t => t.hipaa_relevance === "High").length} accent="red" />
        <MetricCard label="Due 30d" value={due30.length} accent="blue" />
      </div>

      {/* View mode selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">View:</span>
        <button className={viewBtnCls("team")} onClick={() => setViewMode("team")}>Team Timeline</button>
        {currentUserId && <button className={viewBtnCls("mine")} onClick={() => setViewMode("mine")}>My Timeline</button>}
        <button className={viewBtnCls("unassigned-critical")} onClick={() => setViewMode("unassigned-critical")}>Unassigned Critical</button>
        <button className={viewBtnCls("fda-hipaa")} onClick={() => setViewMode("fda-hipaa")}>FDA/HIPAA</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select className={selCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workstreams</option>
          {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
        </select>
        {profiles.length > 0 && (
          <select className={selCls} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Assignees</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
        )}
        <select className={selCls} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {uniqueValues(allTasks, "owner").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueValues(allTasks, "status").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {uniqueValues(allTasks, "priority").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={filterFda} onChange={e => setFilterFda(e.target.value)}>
          <option value="">All FDA</option>
          {["High","Moderate","Low","None"].map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={filterHipaa} onChange={e => setFilterHipaa(e.target.value)}>
          <option value="">All HIPAA</option>
          {["High","Moderate","Low","None"].map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={filterEvidence} onChange={e => setFilterEvidence(e.target.value)}>
          <option value="">All Evidence</option>
          {uniqueValues(allTasks, "evidence_stage").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selCls} value={dateWindow} onChange={e => setDateWindow(e.target.value)}>
          <option value="all">All Dates</option>
          <option value="week">This Week</option>
          <option value="30">30 Days</option>
          <option value="60">60 Days</option>
          <option value="90">90 Days</option>
        </select>
      </div>

      {/* Quick toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {currentUserId && <button className={toggleCls(onlyMine)} onClick={() => setOnlyMine(!onlyMine)}>Only mine</button>}
        <button className={toggleCls(onlyUnassigned)} onClick={() => setOnlyUnassigned(!onlyUnassigned)}>Unassigned</button>
        <button className={toggleCls(onlyCritical)} onClick={() => setOnlyCritical(!onlyCritical)}>Critical</button>
        <button className={toggleCls(onlyBlocked)} onClick={() => setOnlyBlocked(!onlyBlocked)}>Blocked</button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Group:</span>
          <select className={selCls} value={groupBy} onChange={e => setGroupBy(e.target.value as GroupByKey)}>
            <option value="workstream">Workstream</option>
            <option value="assignee">Assignee</option>
            <option value="owner">Owner</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="evidence_stage">Evidence Stage</option>
          </select>
          <span className="text-xs text-slate-500">Color:</span>
          <select className={selCls} value={colorBy} onChange={e => setColorBy(e.target.value as typeof colorBy)}>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="regulatory_relevance">FDA Relevance</option>
            <option value="hipaa_relevance">HIPAA Relevance</option>
          </select>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart tasks={filtered} workstreams={workstreams} groupBy={groupBy} colorBy={colorBy} onSelect={setSelected} />

      {/* Near-term execution */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-800">Near-Term Execution</h2>
          <div className="flex gap-1 rounded bg-slate-100 p-0.5">
            {([["week", "Week"], ["7", "7d"], ["14", "14d"], ["30", "30d"], ["60", "60d"]] as [NearTermWindow, string][]).map(([v, l]) => (
              <button key={v} className={ntBtnCls(v)} onClick={() => setNearTerm(v)}>{l}</button>
            ))}
          </div>
        </div>
        {nearTermTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No tasks due within {nearTermDays} days.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">ID</th><th className="px-3 py-2">Task</th><th className="px-3 py-2">Workstream</th>
                  <th className="px-3 py-2">Assignee</th><th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Priority</th><th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Target</th><th className="px-3 py-2">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nearTermTasks.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(t)}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{t.id}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-slate-800">{t.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{wsLabel(workstreams, t.workstream_id)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{t.assignees.map(a => a.full_name || a.email).join(", ") || "--"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{t.owner}</td>
                    <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{t.target_date}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-[150px] truncate">{t.next_action || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workstream summary */}
      {wsSummary.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Workstream Timeline Summary</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Workstream</th><th className="px-3 py-2">Tasks</th>
                  <th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Unasgn</th>
                  <th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Crit</th><th className="px-3 py-2">Block</th>
                  <th className="px-3 py-2">FDA-H</th><th className="px-3 py-2">HIPAA-H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wsSummary.map(ws => (
                  <tr key={ws.id}>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{ws.label}</td>
                    <td className="px-3 py-1.5">{ws.taskCount}</td>
                    <td className="px-3 py-1.5">{ws.assigned}</td>
                    <td className="px-3 py-1.5">{ws.unassigned > 0 ? <span className="text-amber-600">{ws.unassigned}</span> : 0}</td>
                    <td className="px-3 py-1.5 text-slate-500">{ws.earliest}</td>
                    <td className="px-3 py-1.5 text-slate-500">{ws.latest}</td>
                    <td className="px-3 py-1.5">{ws.critical > 0 ? <span className="font-semibold text-amber-700">{ws.critical}</span> : 0}</td>
                    <td className="px-3 py-1.5">{ws.blocked > 0 ? <span className="text-red-600">{ws.blocked}</span> : 0}</td>
                    <td className="px-3 py-1.5">{ws.highFda}</td>
                    <td className="px-3 py-1.5">{ws.highHipaa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Assignee workload */}
      {workloadSummary.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Assignee Workload</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">User</th><th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Open</th><th className="px-3 py-2">This Week</th>
                  <th className="px-3 py-2">Overdue</th><th className="px-3 py-2">Blocked</th>
                  <th className="px-3 py-2">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workloadSummary.map(w => (
                  <tr key={w.profile.id}>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{w.profile.full_name || w.profile.email}</td>
                    <td className="px-3 py-1.5">{w.total}</td>
                    <td className="px-3 py-1.5">{w.open}</td>
                    <td className="px-3 py-1.5">{w.dueThisWeek}</td>
                    <td className="px-3 py-1.5">{w.overdue > 0 ? <span className="text-red-600 font-semibold">{w.overdue}</span> : 0}</td>
                    <td className="px-3 py-1.5">{w.blocked > 0 ? <span className="text-red-600">{w.blocked}</span> : 0}</td>
                    <td className="px-3 py-1.5">{w.critical > 0 ? <span className="text-amber-700 font-semibold">{w.critical}</span> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Timeline health warnings */}
      <section>
        <button onClick={() => setWarningsOpen(!warningsOpen)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Timeline Health Warnings ({warnings.length})
          {warningsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {warningsOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {warnings.length === 0 ? (
              <p className="px-4 py-3 text-sm text-green-700">No warnings detected.</p>
            ) : (
              warnings.map((w: TimelineWarning, i: number) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs cursor-pointer hover:bg-slate-50" onClick={() => {
                  const task = allTasks.find(t => t.id === w.taskId);
                  if (task) setSelected(task);
                }}>
                  <span className={clsx("mt-0.5 shrink-0 h-2 w-2 rounded-full", w.severity === "error" ? "bg-red-500" : "bg-amber-400")} />
                  <span className="font-mono text-slate-500">{w.taskId}</span>
                  <span className="text-slate-700">{w.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Task detail drawer */}
      {selected && (
        <TaskDetailDrawer
          task={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { window.location.href = `/tasks`; }}
        />
      )}
    </div>
  );
}
