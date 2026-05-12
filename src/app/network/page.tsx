"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { clsx } from "clsx";
import { X, RotateCcw } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

// Workspace colors
const WS_COLORS: Record<string, string> = {
  "endoscribe-core": "#3b82f6",
  "peprisc": "#8b5cf6",
  "hardware-workflow": "#f59e0b",
  "irb-fda-translation": "#ef4444",
  "research-study-trial": "#10b981",
};
const PRIORITY_SIZE: Record<string, number> = { Critical: 12, High: 9, Medium: 6, Low: 4 };
const STATUS_SHAPE: Record<string, string> = { "Not started": "#94a3b8", "In progress": "#3b82f6", Blocked: "#ef4444", Complete: "#22c55e", Deferred: "#a78bfa" };

interface GNode { id: string; label: string; workspace: string; color: string; val: number; type: "task" | "workspace"; meta: TaskWithAssignees | null }
interface GLink { source: string; target: string; color: string }

export default function RoadmapMapPage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [is3D, setIs3D] = useState(false);
  const [colorBy, setColorBy] = useState<"workspace" | "status" | "priority">("workspace");
  const [filterWs, setFilterWs] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    const [raw, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    setTasks(await getTasksWithAssignees(raw, assigns, profs));
    setWorkspaces(ws);
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  // Filter tasks
  const filtered = useMemo(() => {
    let t = tasks;
    if (!showComplete) t = t.filter(x => x.status !== "Complete");
    if (filterWs) t = t.filter(x => x.workspace === filterWs);
    if (filterStatus) t = t.filter(x => x.status === filterStatus);
    if (filterPriority) t = t.filter(x => x.priority === filterPriority);
    if (search) { const q = search.toLowerCase(); t = t.filter(x => x.title.toLowerCase().includes(q) || x.id.toLowerCase().includes(q)); }
    return t;
  }, [tasks, showComplete, filterWs, filterStatus, filterPriority, search]);

  // Build graph
  const graphData = useMemo(() => {
    const nodes: GNode[] = [];
    const links: GLink[] = [];
    const taskIds = new Set(filtered.map(t => t.id));

    // Workspace hub nodes
    const usedWs = new Set(filtered.map(t => t.workspace).filter(Boolean));
    for (const ws of workspaces) {
      if (usedWs.has(ws.slug)) {
        nodes.push({ id: `ws:${ws.slug}`, label: ws.title, workspace: ws.slug, color: WS_COLORS[ws.slug] ?? "#64748b", val: 18, type: "workspace", meta: null });
      }
    }

    // Task nodes
    for (const t of filtered) {
      const wsColor = WS_COLORS[t.workspace ?? ""] ?? "#64748b";
      const color = colorBy === "workspace" ? wsColor : colorBy === "status" ? (STATUS_SHAPE[t.status] ?? "#94a3b8") : (t.priority === "Critical" ? "#ef4444" : t.priority === "High" ? "#f59e0b" : "#3b82f6");
      const size = PRIORITY_SIZE[t.priority] ?? 6;
      nodes.push({ id: t.id, label: t.title, workspace: t.workspace ?? "", color, val: size, type: "task", meta: t });

      // Link task → workspace
      if (t.workspace && usedWs.has(t.workspace)) {
        links.push({ source: `ws:${t.workspace}`, target: t.id, color: "#e2e8f0" });
      }

      // Dependency links
      for (const dep of t.dependencies ?? []) {
        if (taskIds.has(dep)) {
          links.push({ source: dep, target: t.id, color: "#94a3b8" });
        }
      }
    }

    return { nodes, links };
  }, [filtered, workspaces, colorBy]);

  const depCount = graphData.links.filter(l => l.color === "#94a3b8").length;

  function handleNodeClick(node: GNode) {
    if (node.type === "task" && node.meta) setSelected(node.meta);
  }

  const selCls = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roadmap Map</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive dependency network. Click nodes for details. {filtered.length} tasks, {depCount} dependencies.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIs3D(false)} className={clsx("px-4 py-2 text-sm font-semibold rounded-lg transition-colors", !is3D ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50")}>2D</button>
          <button onClick={() => setIs3D(true)} className={clsx("px-4 py-2 text-sm font-semibold rounded-lg transition-colors", is3D ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50")}>3D</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input className={selCls + " w-48"} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={selCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workspaces</option>
          {workspaces.map(w => <option key={w.slug} value={w.slug}>{w.title}</option>)}
        </select>
        <select className={selCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {["Not started","In progress","Blocked","Complete","Deferred"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className={selCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          {["Critical","High","Medium","Low"].map(p => <option key={p}>{p}</option>)}
        </select>
        <select className={selCls} value={colorBy} onChange={e => setColorBy(e.target.value as typeof colorBy)}>
          <option value="workspace">Color: Workspace</option>
          <option value="status">Color: Status</option>
          <option value="priority">Color: Priority</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={showComplete} onChange={() => setShowComplete(!showComplete)} className="rounded" /> Show completed
        </label>
        {selected && <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><RotateCcw className="h-4 w-4" /> Reset</button>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="font-semibold">Legend:</span>
        {colorBy === "workspace" && workspaces.filter(w => new Set(filtered.map(t => t.workspace)).has(w.slug)).map(w => (
          <span key={w.slug} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: WS_COLORS[w.slug] }} />{w.title}</span>
        ))}
        {colorBy === "status" && Object.entries(STATUS_SHAPE).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />{s}</span>
        ))}
        {colorBy === "priority" && [["Critical","#ef4444"],["High","#f59e0b"],["Medium","#3b82f6"],["Low","#94a3b8"]].map(([p, c]) => (
          <span key={p} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />{p}</span>
        ))}
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded-full border-2 border-slate-400" /> Workspace hub</span>
        <span className="flex items-center gap-1"><span className="h-px w-4 bg-slate-400" /> Dependency arrow</span>
      </div>

      {/* Graph */}
      {graphData.nodes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-lg text-slate-500">No tasks to display.</p>
          <p className="text-sm text-slate-400 mt-2">Add tasks with dependencies to see the roadmap network.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 580 }}>
          {/* eslint-disable @typescript-eslint/no-explicit-any */}
          {!is3D ? (
            <ForceGraph2D
              graphData={graphData as any}
              nodeLabel={(n: any) => n.label}
              nodeColor={(n: any) => n.color}
              nodeVal={(n: any) => n.val}
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const size = node.val ?? 6;
                ctx.beginPath();
                if (node.type === "workspace") {
                  // Diamond for workspace
                  ctx.moveTo(node.x, node.y - size); ctx.lineTo(node.x + size, node.y); ctx.lineTo(node.x, node.y + size); ctx.lineTo(node.x - size, node.y);
                  ctx.closePath(); ctx.fillStyle = node.color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
                } else {
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI); ctx.fillStyle = node.color; ctx.fill();
                  if (selected?.id === node.id) { ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 3; ctx.stroke(); }
                }
                // Label
                if (globalScale > 1.2) {
                  const lbl = node.label.length > 35 ? node.label.slice(0, 33) + "..." : node.label;
                  ctx.font = `${node.type === "workspace" ? "bold " : ""}${Math.max(3, 11 / globalScale)}px sans-serif`;
                  ctx.textAlign = "center"; ctx.fillStyle = "#1e293b";
                  ctx.fillText(lbl, node.x, node.y + size + 4);
                }
              }}
              linkColor={(l: any) => l.color}
              linkWidth={1.5}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              onNodeClick={(n: any) => handleNodeClick(n)}
              onBackgroundClick={() => setSelected(null)}
              cooldownTicks={80}
              height={580}
            />
          ) : (
            <ForceGraph3D
              graphData={graphData as any}
              nodeLabel={(n: any) => n.label}
              nodeColor={(n: any) => n.color}
              nodeVal={(n: any) => n.val}
              linkColor={() => "#94a3b8"}
              linkWidth={0.5}
              onNodeClick={(n: any) => handleNodeClick(n)}
              onBackgroundClick={() => setSelected(null)}
              height={580}
            />
          )}
          {/* eslint-enable @typescript-eslint/no-explicit-any */}
        </div>
      )}

      <p className="text-xs text-slate-400">{is3D ? "Drag to rotate. Scroll to zoom." : "Drag to pan. Scroll to zoom."} Click a node for details.</p>

      {/* Task detail panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex gap-2"><StatusBadge status={selected.status} /><PriorityBadge priority={selected.priority} /></div>
            <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
            {selected.description && <p className="text-sm text-slate-600">{selected.description}</p>}
            <div className="space-y-3">
              <Df label="Workspace">{selected.workspace}</Df>
              <Df label="Owner">{selected.owner}</Df>
              <Df label="Assignees">{selected.assignees.length > 0 ? selected.assignees.map(a => a.full_name || a.email).join(", ") : null}</Df>
              <Df label="Due Date">{selected.target_date}</Df>
              <Df label="Dependencies">{selected.dependencies?.length > 0 ? selected.dependencies.join(", ") : null}</Df>
              <Df label="Next Action">{selected.next_action}</Df>
              <Df label="Notes">{selected.notes}</Df>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-base text-slate-800 mt-0.5">{children || <span className="text-slate-300">--</span>}</dd>
    </div>
  );
}
