"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  getTasks, getWorkstreams, getProfiles, getTaskAssignments,
  getTasksWithAssignees, getMilestones, getRisks, getDecisions,
} from "@/lib/roadmapStore";
import type {} from "@/lib/roadmapTypes";
import {
  buildRoadmapNetworkGraph, applyViewMode, getNetworkWarnings,
  summarizeNetworkGraph, getNodeColor, getNodeSize,
  type RoadmapData, type RoadmapGraph, type GraphNode,
  type ViewMode, type ColorByKey, type SizeByKey, type NetworkWarning,
} from "@/lib/networkUtils";
import MetricCard from "@/components/MetricCard";
import ComplianceBanner from "@/components/ComplianceBanner";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { wsLabel } from "@/lib/roadmapUtils";
import { clsx } from "clsx";
import { X, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

// Dynamic imports - SSR disabled for canvas-based libraries
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

// Node type legend
const NODE_TYPE_LEGEND: { type: string; color: string; label: string }[] = [
  { type: "project", color: "#1e3a5f", label: "Project" },
  { type: "workstream", color: "#3b82f6", label: "Workstream" },
  { type: "task", color: "#64748b", label: "Task" },
  { type: "assignee", color: "#059669", label: "Assignee" },
  { type: "milestone", color: "#7c3aed", label: "Milestone" },
  { type: "risk", color: "#dc2626", label: "Risk" },
  { type: "decision", color: "#d97706", label: "Decision" },
  { type: "regulatory", color: "#be185d", label: "Regulatory" },
];

export default function NetworkPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("strategic");
  const [colorBy, setColorBy] = useState<ColorByKey>("type");
  const [sizeBy, setSizeBy] = useState<SizeByKey>("priority");
  const [is3D, setIs3D] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAssignees, setShowAssignees] = useState(true);
  const [showRisks, setShowRisks] = useState(true);
  const [showDecisions, setShowDecisions] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const graphRef = useRef<{ centerAt?: (x: number, y: number, ms: number) => void }>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, ws, profs, assigns, ms, risks, decs] = await Promise.all([
      getTasks(), getWorkstreams(), getProfiles(), getTaskAssignments(),
      getMilestones(), getRisks(), getDecisions(),
    ]);
    const tasks = await getTasksWithAssignees(rawTasks, assigns, profs);
    setData({ tasks, workstreams: ws, profiles: profs, milestones: ms, risks, decisions: decs });
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  // Build graph
  const fullGraph = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return buildRoadmapNetworkGraph(data, { showCompleted, showAssignees, showRisks, showDecisions, showMilestones });
  }, [data, showCompleted, showAssignees, showRisks, showDecisions, showMilestones]);

  const graph = useMemo(() => {
    if (!data) return fullGraph;
    return applyViewMode(fullGraph, viewMode, data);
  }, [fullGraph, viewMode, data]);

  // Apply search filter
  const displayGraph = useMemo((): RoadmapGraph => {
    if (!search) return graph;
    const q = search.toLowerCase();
    const matchNodes = graph.nodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    const matchIds = new Set(matchNodes.map(n => n.id));
    // Also include their direct neighbors
    for (const l of graph.links) {
      if (matchIds.has(l.source as string)) matchIds.add(l.target as string);
      if (matchIds.has(l.target as string)) matchIds.add(l.source as string);
    }
    const nodes = graph.nodes.filter(n => matchIds.has(n.id));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = graph.links.filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));
    return { nodes, links };
  }, [graph, search]);

  // Connection counts for sizing
  const connectionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of displayGraph.links) {
      m.set(l.source as string, (m.get(l.source as string) ?? 0) + 1);
      m.set(l.target as string, (m.get(l.target as string) ?? 0) + 1);
    }
    return m;
  }, [displayGraph]);

  // Neighbor map for highlighting
  const neighborMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of displayGraph.links) {
      const s = l.source as string;
      const t = l.target as string;
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return m;
  }, [displayGraph]);

  const summary = useMemo(() => summarizeNetworkGraph(displayGraph), [displayGraph]);
  const warnings = useMemo(() => data ? getNetworkWarnings(data) : [], [data]);

  // Graph data with colored/sized nodes
  const graphData = useMemo(() => ({
    nodes: displayGraph.nodes.map(node => ({
      ...node,
      color: getNodeColor(node, colorBy, data?.workstreams ?? []),
      val: getNodeSize(node, sizeBy, connectionCounts),
      __highlighted: highlightNodes.size === 0 || highlightNodes.has(node.id),
    })),
    links: displayGraph.links.map(l => ({
      ...l,
      color: highlightNodes.size > 0 && !highlightNodes.has(l.source as string) && !highlightNodes.has(l.target as string) ? "#e2e8f0" : "#94a3b8",
    })),
  }), [displayGraph, colorBy, sizeBy, connectionCounts, data, highlightNodes]);

  function handleNodeClick(node: GraphNode & { __highlighted?: boolean }) {
    setSelectedNode(node);
    const neighbors = neighborMap.get(node.id) ?? new Set();
    setHighlightNodes(new Set([node.id, ...neighbors]));
  }

  function clearSelection() {
    setSelectedNode(null);
    setHighlightNodes(new Set());
  }

  // Find detail data for selected node
  const selectedTask = useMemo(() => {
    if (!selectedNode || !data) return null;
    if (selectedNode.type !== "task") return null;
    const taskId = selectedNode.id.replace("task:", "");
    return data.tasks.find(t => t.id === taskId) ?? null;
  }, [selectedNode, data]);

  const selCls = "rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 bg-white focus:border-indigo-400 focus:outline-none";
  const btnCls = (active: boolean) => clsx("px-2.5 py-1 text-xs font-medium rounded transition-colors", active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50");
  const toggleCls = (active: boolean) => clsx("rounded px-2 py-1 text-xs border transition-colors cursor-pointer", active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500 hover:bg-slate-50");

  if (!data) return <div className="flex items-center justify-center h-96 text-sm text-slate-500">Loading roadmap data...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dependency Network / Spider Map</h1>
        <p className="text-xs text-slate-500 mt-0.5">Interactive map of workstreams, tasks, dependencies, assignees, blockers, decisions, risks, and regulatory relevance. Drag to pan, scroll to zoom, click nodes for details.</p>
      </div>

      <ComplianceBanner />

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        <MetricCard label="Nodes" value={summary.totalNodes} />
        <MetricCard label="Edges" value={summary.totalEdges} />
        <MetricCard label="Tasks" value={summary.tasks} />
        <MetricCard label="Dependencies" value={summary.dependencies} accent="blue" />
        <MetricCard label="Assignees" value={summary.assignees} accent="green" />
        <MetricCard label="Milestones" value={summary.milestones} />
        <MetricCard label="Risks" value={summary.risks} accent={summary.risks > 0 ? "red" : "default"} />
        <MetricCard label="Decisions" value={summary.decisions} accent={summary.decisions > 0 ? "amber" : "default"} />
        <MetricCard label="Workstreams" value={summary.workstreams} />
      </div>

      {/* View modes */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">View:</span>
        {([
          ["strategic", "Strategic Web"],
          ["dependencies", "Dependencies"],
          ["team", "Team Map"],
          ["fda_hipaa", "FDA/HIPAA"],
          ["critical_blocked", "Critical/Blocked"],
          ["future", "Future Modules"],
        ] as [ViewMode, string][]).map(([v, l]) => (
          <button key={v} className={btnCls(viewMode === v)} onClick={() => setViewMode(v)}>{l}</button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btnCls(!is3D)} onClick={() => setIs3D(false)}>2D</button>
        <button className={btnCls(is3D)} onClick={() => setIs3D(true)}>3D</button>

        <input className="rounded border border-slate-300 py-1 px-2 text-xs w-36 focus:border-indigo-400 focus:outline-none" placeholder="Search nodes..." value={search} onChange={e => setSearch(e.target.value)} />

        <select className={selCls} value={colorBy} onChange={e => setColorBy(e.target.value as ColorByKey)}>
          <option value="type">Color: Type</option>
          <option value="workstream">Color: Workstream</option>
          <option value="status">Color: Status</option>
          <option value="priority">Color: Priority</option>
          <option value="fda">Color: FDA</option>
          <option value="hipaa">Color: HIPAA</option>
        </select>

        <select className={selCls} value={sizeBy} onChange={e => setSizeBy(e.target.value as SizeByKey)}>
          <option value="fixed">Size: Fixed</option>
          <option value="priority">Size: Priority</option>
          <option value="connections">Size: Connections</option>
          <option value="due_soon">Size: Due Soon</option>
          <option value="blocked_critical">Size: Blocked/Critical</option>
        </select>

        <label className={toggleCls(showLabels)}><input type="checkbox" className="hidden" checked={showLabels} onChange={() => setShowLabels(!showLabels)} /> Labels</label>
        <label className={toggleCls(showCompleted)}><input type="checkbox" className="hidden" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} /> Completed</label>
        <label className={toggleCls(showAssignees)}><input type="checkbox" className="hidden" checked={showAssignees} onChange={() => setShowAssignees(!showAssignees)} /> Assignees</label>
        <label className={toggleCls(showRisks)}><input type="checkbox" className="hidden" checked={showRisks} onChange={() => setShowRisks(!showRisks)} /> Risks</label>
        <label className={toggleCls(showDecisions)}><input type="checkbox" className="hidden" checked={showDecisions} onChange={() => setShowDecisions(!showDecisions)} /> Decisions</label>
        <label className={toggleCls(showMilestones)}><input type="checkbox" className="hidden" checked={showMilestones} onChange={() => setShowMilestones(!showMilestones)} /> Milestones</label>

        {highlightNodes.size > 0 && (
          <button onClick={clearSelection} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><RotateCcw className="h-3 w-3" /> Reset</button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-600">
        {NODE_TYPE_LEGEND.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}
          </span>
        ))}
      </div>

      {/* Graph */}
      <div className="relative rounded-lg border border-slate-200 bg-white" style={{ height: 520 }}>
        {!is3D ? (
          <ForceGraph2D
            ref={graphRef as React.MutableRefObject<never>}
            graphData={graphData}
            nodeLabel={n => (n as GraphNode).label}
            nodeColor={n => {
              const gn = n as GraphNode & { __highlighted?: boolean; color: string };
              return gn.__highlighted ? gn.color : "#e2e8f0";
            }}
            nodeVal={n => (n as GraphNode & { val: number }).val}
            nodeCanvasObject={showLabels ? (node, ctx, globalScale) => {
              const gn = node as GraphNode & { x: number; y: number; val: number; color: string; __highlighted?: boolean };
              const size = gn.val ?? 5;
              const alpha = gn.__highlighted ? 1 : 0.25;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.arc(gn.x, gn.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = gn.color;
              ctx.fill();
              if (globalScale > 1.5 && size >= 4) {
                ctx.globalAlpha = alpha * 0.9;
                ctx.font = `${Math.max(2.5, 10 / globalScale)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillStyle = "#334155";
                const lbl = gn.label.length > 30 ? gn.label.slice(0, 28) + "..." : gn.label;
                ctx.fillText(lbl, gn.x, gn.y + size + 3);
              }
              ctx.globalAlpha = 1;
            } : undefined}
            linkColor={l => (l as { color: string }).color ?? "#cbd5e1"}
            linkWidth={0.5}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node) => handleNodeClick(node as GraphNode & { __highlighted?: boolean })}
            onBackgroundClick={clearSelection}
            cooldownTicks={60}
            width={undefined}
            height={520}
          />
        ) : (
          <ForceGraph3D
            graphData={graphData}
            nodeLabel={n => (n as GraphNode).label}
            nodeColor={n => (n as GraphNode & { color: string }).color}
            nodeVal={n => (n as GraphNode & { val: number }).val}
            linkColor={() => "#94a3b8"}
            linkWidth={0.3}
            onNodeClick={(node) => handleNodeClick(node as GraphNode & { __highlighted?: boolean })}
            onBackgroundClick={clearSelection}
            width={undefined}
            height={520}
          />
        )}

        <p className="absolute bottom-1 left-3 text-[10px] text-slate-400">
          {is3D ? "Drag to rotate. Scroll to zoom. Click node for details." : "Drag to pan. Scroll to zoom. Click node for details."}
          {" "}Refresh page to see latest changes.
        </p>
      </div>

      {/* Network health warnings */}
      <section>
        <button onClick={() => setWarningsOpen(!warningsOpen)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Network Health Warnings ({warnings.length})
          {warningsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {warningsOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {warnings.length === 0 ? (
              <p className="px-4 py-3 text-sm text-green-700">No warnings detected.</p>
            ) : warnings.map((w: NetworkWarning, i: number) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
                <span className={clsx("mt-0.5 shrink-0 h-2 w-2 rounded-full", w.severity === "error" ? "bg-red-500" : "bg-amber-400")} />
                <span className="font-mono text-slate-500">{w.nodeId}</span>
                <span className="text-slate-700">{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-[400px] flex-col border-l border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div>
              <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: getNodeColor(selectedNode, colorBy, data.workstreams) }} />
              <span className="text-xs uppercase text-slate-500">{selectedNode.type}</span>
            </div>
            <button onClick={clearSelection} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <h2 className="text-base font-semibold text-slate-900">{selectedNode.label}</h2>

            {/* Task detail */}
            {selectedTask && (
              <div className="space-y-2">
                <div className="flex gap-2"><StatusBadge status={selectedTask.status} /><PriorityBadge priority={selectedTask.priority} /></div>
                <DField label="Workstream">{wsLabel(data.workstreams, selectedTask.workstream_id)}</DField>
                <DField label="Owner">{selectedTask.owner}</DField>
                <DField label="Assignees">{selectedTask.assignees.map(a => a.full_name || a.email).join(", ")}</DField>
                <DField label="Start">{selectedTask.start_date}</DField>
                <DField label="Target">{selectedTask.target_date}</DField>
                <DField label="Next Action">{selectedTask.next_action}</DField>
                <DField label="Dependencies">{selectedTask.dependencies?.join(", ")}</DField>
                <DField label="Blockers">{selectedTask.blockers?.join(", ")}</DField>
                <DField label="Decision Needed">{selectedTask.decision_needed}</DField>
                <DField label="FDA">{selectedTask.regulatory_relevance}</DField>
                <DField label="HIPAA">{selectedTask.hipaa_relevance}</DField>
                <DField label="Evidence Stage">{selectedTask.evidence_stage}</DField>
                <DField label="GSD Goal">{selectedTask.gsd_goal}</DField>
                <DField label="Notes">{selectedTask.notes}</DField>
              </div>
            )}

            {/* Workstream detail */}
            {selectedNode.type === "workstream" && (() => {
              const wsId = selectedNode.id.replace("ws:", "");
              const wsTasks = data.tasks.filter(t => t.workstream_id === wsId);
              return (
                <div className="space-y-1">
                  <DField label="Purpose">{selectedNode.meta.purpose as string}</DField>
                  <DField label="Tasks">{wsTasks.length}</DField>
                  <DField label="Critical">{wsTasks.filter(t => t.priority === "Critical").length}</DField>
                  <DField label="Blocked">{wsTasks.filter(t => t.status === "Blocked").length}</DField>
                  <DField label="Unassigned">{wsTasks.filter(t => t.assignees.length === 0).length}</DField>
                  <DField label="High FDA">{wsTasks.filter(t => t.regulatory_relevance === "High").length}</DField>
                  <DField label="High HIPAA">{wsTasks.filter(t => t.hipaa_relevance === "High").length}</DField>
                </div>
              );
            })()}

            {/* Assignee detail */}
            {selectedNode.type === "assignee" && (() => {
              const uid = selectedNode.id.replace("user:", "");
              const uTasks = data.tasks.filter(t => t.assignees.some(a => a.id === uid));
              const today = new Date().toISOString().slice(0, 10);
              return (
                <div className="space-y-1">
                  <DField label="Email">{selectedNode.meta.email as string}</DField>
                  <DField label="Role">{selectedNode.meta.role as string}</DField>
                  <DField label="Total Assigned">{uTasks.length}</DField>
                  <DField label="Open">{uTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred").length}</DField>
                  <DField label="Blocked">{uTasks.filter(t => t.status === "Blocked").length}</DField>
                  <DField label="Critical">{uTasks.filter(t => t.priority === "Critical").length}</DField>
                  <DField label="Overdue">{uTasks.filter(t => t.target_date && t.target_date < today && t.status !== "Complete").length}</DField>
                </div>
              );
            })()}

            {/* Risk detail */}
            {selectedNode.type === "risk" && (
              <div className="space-y-1">
                <DField label="Severity">{selectedNode.meta.severity as string}</DField>
                <DField label="Mitigation">{selectedNode.meta.mitigation as string}</DField>
                <DField label="Status">{selectedNode.meta.status as string}</DField>
              </div>
            )}

            {/* Decision detail */}
            {selectedNode.type === "decision" && (
              <div className="space-y-1">
                <DField label="Decision Needed">{selectedNode.meta.decision_needed as string}</DField>
                <DField label="Owner">{selectedNode.meta.owner as string}</DField>
                <DField label="Status">{selectedNode.meta.status as string}</DField>
              </div>
            )}

            {/* Milestone detail */}
            {selectedNode.type === "milestone" && (
              <div className="space-y-1">
                <DField label="Target Date">{selectedNode.meta.target_date as string}</DField>
                <DField label="Status">{selectedNode.meta.status as string}</DField>
                <DField label="Description">{selectedNode.meta.description as string}</DField>
              </div>
            )}

            {/* Connections */}
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Connections ({connectionCounts.get(selectedNode.id) ?? 0})</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {(neighborMap.get(selectedNode.id) ?? new Set()).size > 0 ? (
                  [...(neighborMap.get(selectedNode.id) ?? [])].map(nid => {
                    const n = displayGraph.nodes.find(n => n.id === nid);
                    return n ? (
                      <button key={nid} className="block w-full text-left text-xs text-slate-600 hover:text-indigo-600 truncate px-1 py-0.5 rounded hover:bg-slate-50" onClick={() => { const gn = graphData.nodes.find(x => x.id === nid); if (gn) handleNodeClick(gn as GraphNode & { __highlighted?: boolean }); }}>
                        <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: getNodeColor(n, colorBy, data.workstreams) }} />
                        {n.label}
                      </button>
                    ) : null;
                  })
                ) : <p className="text-xs text-slate-400">No connections</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd>
    </div>
  );
}
