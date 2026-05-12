"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { clsx } from "clsx";
import { X, RotateCcw, ArrowRight } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const WS_COLORS: Record<string, string> = {
  "endoscribe-core": "#3b82f6", "peprisc": "#8b5cf6", "hardware-workflow": "#f59e0b",
  "irb-fda-translation": "#ef4444", "research-study-trial": "#10b981",
};
const PRIORITY_BORDER: Record<string, string> = { Critical: "border-l-red-500 bg-red-50/30", High: "border-l-amber-500 bg-amber-50/20", Medium: "border-l-blue-400", Low: "border-l-slate-300" };

type ViewTab = "roadmap" | "network";

export default function RoadmapMapPage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [view, setView] = useState<ViewTab>("roadmap");
  const [colorBy, setColorBy] = useState<"workspace" | "status" | "priority">("workspace");
  const [filterWs, setFilterWs] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);

  const refresh = useCallback(async () => {
    const [raw, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    setTasks(await getTasksWithAssignees(raw, assigns, profs));
    setWorkspaces(ws);
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  const filtered = useMemo(() => {
    let t = tasks;
    if (!showComplete) t = t.filter(x => x.status !== "Complete");
    if (filterWs) t = t.filter(x => x.workspace === filterWs);
    return t;
  }, [tasks, showComplete, filterWs]);

  // Group by workspace for roadmap view
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

  // Build dependency lookup
  const depMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of filtered) {
      if (t.dependencies?.length > 0) m.set(t.id, t.dependencies);
    }
    return m;
  }, [filtered]);

  // Network graph data
  const graphData = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const nodes: any[] = [];
    const links: any[] = [];
    const taskIds = new Set(filtered.map(t => t.id));
    const usedWs = new Set(filtered.map(t => t.workspace).filter(Boolean));

    for (const ws of workspaces) {
      if (usedWs.has(ws.slug)) {
        nodes.push({ id: `ws:${ws.slug}`, label: ws.title, color: WS_COLORS[ws.slug] ?? "#64748b", val: 20, type: "workspace", owner: "" });
      }
    }
    for (const t of filtered) {
      const wsColor = WS_COLORS[t.workspace ?? ""] ?? "#64748b";
      const color = colorBy === "workspace" ? wsColor : colorBy === "status" ? ({ "Not started": "#94a3b8", "In progress": "#3b82f6", Blocked: "#ef4444", Complete: "#22c55e", Deferred: "#a78bfa" }[t.status] ?? "#94a3b8") : (t.priority === "Critical" ? "#ef4444" : t.priority === "High" ? "#f59e0b" : "#3b82f6");
      const size = t.priority === "Critical" ? 12 : t.priority === "High" ? 9 : 6;
      const owner = t.owner || (t.assignees.length > 0 ? t.assignees[0].full_name || t.assignees[0].email : "");
      nodes.push({ id: t.id, label: t.title, color, val: size, type: "task", owner, meta: t });
      if (t.workspace && usedWs.has(t.workspace)) links.push({ source: `ws:${t.workspace}`, target: t.id, color: "#e2e8f0" });
      for (const dep of t.dependencies ?? []) {
        if (taskIds.has(dep)) links.push({ source: dep, target: t.id, color: "#94a3b8" });
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { nodes, links };
  }, [filtered, workspaces, colorBy]);

  const depCount = graphData.links.filter((l: { color: string }) => l.color === "#94a3b8").length;
  const selCls = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none";
  const tabCls = (t: ViewTab) => clsx("px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors", view === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roadmap Map</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} tasks across {byWorkspace.size} workspaces, {depCount} dependencies</p>
        </div>
        <div className="flex gap-2">
          <button className={tabCls("roadmap")} onClick={() => setView("roadmap")}>Roadmap Flow</button>
          <button className={tabCls("network")} onClick={() => setView("network")}>Network Graph</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={selCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workspaces</option>
          {workspaces.map(w => <option key={w.slug} value={w.slug}>{w.title}</option>)}
        </select>
        {view === "network" && (
          <select className={selCls} value={colorBy} onChange={e => setColorBy(e.target.value as typeof colorBy)}>
            <option value="workspace">Color: Workspace</option>
            <option value="status">Color: Status</option>
            <option value="priority">Color: Priority</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={showComplete} onChange={() => setShowComplete(!showComplete)} className="rounded" /> Completed
        </label>
      </div>

      {/* ============ ROADMAP FLOW VIEW ============ */}
      {view === "roadmap" && (
        <div className="space-y-8">
          {workspaces.filter(ws => byWorkspace.has(ws.slug)).map(ws => {
            const wsTasks = byWorkspace.get(ws.slug) ?? [];
            const wsColor = WS_COLORS[ws.slug] ?? "#64748b";
            // Sort: tasks with no dependencies first, then by dep chain
            const sorted = [...wsTasks].sort((a, b) => {
              const aDeps = (a.dependencies ?? []).length;
              const bDeps = (b.dependencies ?? []).length;
              return aDeps - bDeps;
            });

            return (
              <section key={ws.slug}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: wsColor }} />
                  <h2 className="text-lg font-bold text-slate-900">{ws.title}</h2>
                  <span className="text-sm text-slate-400">{wsTasks.length} tasks</span>
                </div>

                {/* Horizontal scrollable flow */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {sorted.map((t, i) => {
                      const owner = t.owner || (t.assignees.length > 0 ? (t.assignees[0].full_name || t.assignees[0].email) : "");
                      const hasDeps = (t.dependencies ?? []).length > 0;
                      return (
                        <div key={t.id} className="flex items-center gap-2">
                          {/* Dependency arrow */}
                          {hasDeps && i > 0 && <ArrowRight className="h-5 w-5 text-slate-300 shrink-0" />}

                          {/* Task card */}
                          <div
                            onClick={() => setSelected(t)}
                            className={clsx(
                              "w-64 shrink-0 rounded-xl border border-l-4 p-4 cursor-pointer hover:shadow-lg transition-all",
                              PRIORITY_BORDER[t.priority] ?? "border-l-slate-300",
                              selected?.id === t.id ? "ring-2 ring-indigo-500 shadow-lg" : "bg-white"
                            )}
                          >
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">{t.title}</p>
                            {owner && <p className="text-xs text-indigo-600 font-medium mt-1.5">{owner}</p>}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              <StatusBadge status={t.status} />
                              <PriorityBadge priority={t.priority} />
                            </div>
                            {t.target_date && <p className="text-xs text-slate-500 mt-2">Due {t.target_date}</p>}
                            {hasDeps && <p className="text-[10px] text-slate-400 mt-1">Depends on: {t.dependencies.join(", ")}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
              <p className="text-lg text-slate-500">No tasks to display.</p>
            </div>
          )}
        </div>
      )}

      {/* ============ NETWORK GRAPH VIEW ============ */}
      {view === "network" && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            {colorBy === "workspace" && workspaces.filter(w => byWorkspace.has(w.slug)).map(w => (
              <span key={w.slug} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: WS_COLORS[w.slug] }} />{w.title}</span>
            ))}
            {colorBy === "status" && [["Not started","#94a3b8"],["In progress","#3b82f6"],["Blocked","#ef4444"],["Complete","#22c55e"]].map(([s, c]) => (
              <span key={s} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />{s}</span>
            ))}
            {colorBy === "priority" && [["Critical","#ef4444"],["High","#f59e0b"],["Medium","#3b82f6"]].map(([p, c]) => (
              <span key={p} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />{p}</span>
            ))}
          </div>

          {graphData.nodes.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 580 }}>
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              <ForceGraph2D
                graphData={graphData as any}
                nodeLabel={(n: any) => n.label}
                nodeColor={(n: any) => n.color}
                nodeVal={(n: any) => n.val}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const size = node.val ?? 6;
                  if (node.type === "workspace") {
                    ctx.beginPath(); ctx.moveTo(node.x, node.y - size); ctx.lineTo(node.x + size, node.y); ctx.lineTo(node.x, node.y + size); ctx.lineTo(node.x - size, node.y);
                    ctx.closePath(); ctx.fillStyle = node.color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
                  } else {
                    ctx.beginPath(); ctx.arc(node.x, node.y, size, 0, 2 * Math.PI); ctx.fillStyle = node.color; ctx.fill();
                    if (selected?.id === node.id) { ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 3; ctx.stroke(); }
                  }
                  if (globalScale > 1) {
                    const title = node.label.length > 30 ? node.label.slice(0, 28) + "..." : node.label;
                    const fs = Math.max(3, 11 / globalScale);
                    ctx.font = `${node.type === "workspace" ? "bold " : ""}${fs}px sans-serif`;
                    ctx.textAlign = "center"; ctx.fillStyle = "#1e293b";
                    ctx.fillText(title, node.x, node.y + size + fs * 0.4 + 2);
                    // Owner label below title
                    if (node.owner && globalScale > 1.5) {
                      ctx.font = `${fs * 0.85}px sans-serif`; ctx.fillStyle = "#6366f1";
                      ctx.fillText(node.owner, node.x, node.y + size + fs * 1.4 + 3);
                    }
                  }
                }}
                linkColor={(l: any) => l.color}
                linkWidth={1.5}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                onNodeClick={(n: any) => { if (n.type === "task" && n.meta) setSelected(n.meta); }}
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
          <p className="text-xs text-slate-400">Drag to pan. Scroll to zoom. Click a node for details. Owner names shown in purple.</p>
        </>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex gap-2"><StatusBadge status={selected.status} /><PriorityBadge priority={selected.priority} /></div>
            <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
            {selected.description && <p className="text-sm text-slate-600">{selected.description}</p>}
            <Df label="Workspace">{selected.workspace}</Df>
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

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="text-base text-slate-800 mt-0.5">{children || <span className="text-slate-300">--</span>}</dd></div>;
}
