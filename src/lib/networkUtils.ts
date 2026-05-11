import type {
  TaskWithAssignees, Workstream, Profile, Milestone,
  RiskItem, DecisionItem,
} from "./roadmapTypes";

// ---------------------------------------------------------------------------
// Graph types
// ---------------------------------------------------------------------------
export type NodeType = "project" | "workstream" | "task" | "assignee" | "milestone" | "risk" | "decision" | "regulatory";
export type EdgeType = "contains" | "depends_on" | "assigned_to" | "related_risk" | "related_decision" | "milestone_for" | "blocked_by" | "regulatory_link";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  group: string;       // workstream id or category
  color: string;
  size: number;
  meta: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  color?: string;
}

export interface RoadmapGraph {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Color palettes (sober academic)
// ---------------------------------------------------------------------------
const TYPE_COLORS: Record<NodeType, string> = {
  project: "#1e3a5f",
  workstream: "#3b82f6",
  task: "#64748b",
  assignee: "#059669",
  milestone: "#7c3aed",
  risk: "#dc2626",
  decision: "#d97706",
  regulatory: "#be185d",
};

const STATUS_COLORS: Record<string, string> = {
  "Not started": "#94a3b8", "In progress": "#3b82f6",
  "Blocked": "#dc2626", "Complete": "#16a34a", "Deferred": "#a78bfa",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#dc2626", High: "#f59e0b", Medium: "#3b82f6", Low: "#94a3b8",
};

const LEVEL_COLORS: Record<string, string> = {
  High: "#dc2626", Moderate: "#f59e0b", Low: "#60a5fa", None: "#cbd5e1",
};

// Workstream color palette (12 distinct muted colors)
const WS_PALETTE = [
  "#3b82f6", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2",
  "#4f46e5", "#be185d", "#65a30d", "#0d9488", "#9333ea", "#ca8a04",
];
let _wsColorMap: Map<string, string> | null = null;
function wsColor(wsId: string, workstreams: Workstream[]): string {
  if (!_wsColorMap) {
    _wsColorMap = new Map();
    workstreams.forEach((ws, i) => _wsColorMap!.set(ws.id, WS_PALETTE[i % WS_PALETTE.length]));
  }
  return _wsColorMap.get(wsId) ?? "#94a3b8";
}

// ---------------------------------------------------------------------------
// Coloring / sizing
// ---------------------------------------------------------------------------
export type ColorByKey = "type" | "workstream" | "status" | "priority" | "fda" | "hipaa";
export type SizeByKey = "fixed" | "priority" | "connections" | "due_soon" | "blocked_critical";

export function getNodeColor(node: GraphNode, colorBy: ColorByKey, workstreams: Workstream[]): string {
  switch (colorBy) {
    case "type": return TYPE_COLORS[node.type] ?? "#94a3b8";
    case "workstream": return wsColor(node.group, workstreams);
    case "status": return STATUS_COLORS[node.meta.status as string] ?? TYPE_COLORS[node.type] ?? "#94a3b8";
    case "priority": return PRIORITY_COLORS[node.meta.priority as string] ?? TYPE_COLORS[node.type] ?? "#94a3b8";
    case "fda": return LEVEL_COLORS[node.meta.regulatory_relevance as string] ?? TYPE_COLORS[node.type] ?? "#cbd5e1";
    case "hipaa": return LEVEL_COLORS[node.meta.hipaa_relevance as string] ?? TYPE_COLORS[node.type] ?? "#cbd5e1";
  }
}

export function getNodeSize(node: GraphNode, sizeBy: SizeByKey, connectionCount: Map<string, number>): number {
  const base = node.type === "project" ? 12 : node.type === "workstream" ? 8 : node.type === "task" ? 5 : 6;
  switch (sizeBy) {
    case "fixed": return base;
    case "priority": {
      const p = node.meta.priority as string;
      return p === "Critical" ? base * 2 : p === "High" ? base * 1.5 : base;
    }
    case "connections": return Math.max(base, Math.min(base + (connectionCount.get(node.id) ?? 0) * 0.8, base * 3));
    case "due_soon": {
      const td = node.meta.target_date as string | undefined;
      if (!td) return base;
      const days = (new Date(td).getTime() - Date.now()) / 86_400_000;
      return days <= 7 ? base * 2 : days <= 30 ? base * 1.5 : base;
    }
    case "blocked_critical": {
      const s = node.meta.status as string;
      const p = node.meta.priority as string;
      return s === "Blocked" || p === "Critical" ? base * 2 : base;
    }
  }
}

// ---------------------------------------------------------------------------
// Node builders
// ---------------------------------------------------------------------------
function n(id: string, label: string, type: NodeType, group: string, meta: Record<string, unknown> = {}): GraphNode {
  return { id, label, type, group, color: TYPE_COLORS[type], size: 5, meta };
}

export function createProjectNode(): GraphNode {
  return n("__project__", "EndoScribe + PEPRisc", "project", "__project__");
}

export function createWorkstreamNodes(workstreams: Workstream[]): GraphNode[] {
  return workstreams.map(ws => n(`ws:${ws.id}`, ws.label, "workstream", ws.id, { purpose: ws.purpose }));
}

export function createTaskNodes(tasks: TaskWithAssignees[]): GraphNode[] {
  return tasks.map(t => n(`task:${t.id}`, `${t.id}: ${t.title}`, "task", t.workstream_id, {
    status: t.status, priority: t.priority, owner: t.owner,
    target_date: t.target_date, start_date: t.start_date,
    regulatory_relevance: t.regulatory_relevance,
    hipaa_relevance: t.hipaa_relevance,
    evidence_stage: t.evidence_stage,
    assignees: t.assignees.map(a => a.full_name || a.email).join(", "),
    next_action: t.next_action, blockers: t.blockers,
  }));
}

export function createAssigneeNodes(profiles: Profile[]): GraphNode[] {
  return profiles.map(p => n(`user:${p.id}`, p.full_name || p.email, "assignee", "__users__", { email: p.email, role: p.role }));
}

export function createMilestoneNodes(milestones: Milestone[]): GraphNode[] {
  return milestones.map(m => n(`ms:${m.id}`, m.title, "milestone", m.workstream_id ?? "__milestones__", { target_date: m.target_date, status: m.status, description: m.description }));
}

export function createRiskNodes(risks: RiskItem[]): GraphNode[] {
  return risks.map(r => n(`risk:${r.id}`, r.title, "risk", "__risks__", { severity: r.severity, mitigation: r.mitigation, status: r.status }));
}

export function createDecisionNodes(decisions: DecisionItem[]): GraphNode[] {
  return decisions.map(d => n(`dec:${d.id}`, d.title, "decision", "__decisions__", { status: d.status, owner: d.owner, decision_needed: d.decision_needed }));
}

// ---------------------------------------------------------------------------
// Edge builders
// ---------------------------------------------------------------------------
function e(source: string, target: string, type: EdgeType, label?: string): GraphEdge {
  return { source, target, type, label };
}

export function createWorkstreamEdges(workstreams: Workstream[]): GraphEdge[] {
  return workstreams.map(ws => e("__project__", `ws:${ws.id}`, "contains"));
}

export function createWorkstreamTaskEdges(tasks: TaskWithAssignees[]): GraphEdge[] {
  return tasks.map(t => e(`ws:${t.workstream_id}`, `task:${t.id}`, "contains"));
}

export function createDependencyEdges(tasks: TaskWithAssignees[]): GraphEdge[] {
  const ids = new Set(tasks.map(t => t.id));
  const edges: GraphEdge[] = [];
  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (ids.has(dep)) edges.push(e(`task:${dep}`, `task:${t.id}`, "depends_on", "depends"));
    }
  }
  return edges;
}

export function createAssignmentEdges(tasks: TaskWithAssignees[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const t of tasks) {
    for (const a of t.assignees) {
      edges.push(e(`user:${a.id}`, `task:${t.id}`, "assigned_to"));
    }
  }
  return edges;
}

export function createRiskTaskEdges(risks: RiskItem[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const r of risks) {
    for (const tid of r.related_task_ids ?? []) {
      edges.push(e(`risk:${r.id}`, `task:${tid}`, "related_risk"));
    }
  }
  return edges;
}

export function createDecisionTaskEdges(decisions: DecisionItem[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const d of decisions) {
    for (const tid of d.related_task_ids ?? []) {
      edges.push(e(`dec:${d.id}`, `task:${tid}`, "related_decision"));
    }
  }
  return edges;
}

export function createMilestoneEdges(milestones: Milestone[]): GraphEdge[] {
  return milestones
    .filter(m => m.workstream_id)
    .map(m => e(`ms:${m.id}`, `ws:${m.workstream_id!}`, "milestone_for"));
}

export function createRegulatoryNodes(tasks: TaskWithAssignees[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const hasFda = tasks.some(t => t.regulatory_relevance === "High" || t.regulatory_relevance === "Moderate");
  const hasHipaa = tasks.some(t => t.hipaa_relevance === "High" || t.hipaa_relevance === "Moderate");

  if (hasFda) {
    nodes.push(n("__fda__", "FDA / Regulatory", "regulatory", "__regulatory__"));
    for (const t of tasks) {
      if (t.regulatory_relevance === "High" || t.regulatory_relevance === "Moderate")
        edges.push(e("__fda__", `task:${t.id}`, "regulatory_link"));
    }
  }
  if (hasHipaa) {
    nodes.push(n("__hipaa__", "IRB / HIPAA / Hopkins IT", "regulatory", "__regulatory__"));
    for (const t of tasks) {
      if (t.hipaa_relevance === "High" || t.hipaa_relevance === "Moderate")
        edges.push(e("__hipaa__", `task:${t.id}`, "regulatory_link"));
    }
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Full graph builder
// ---------------------------------------------------------------------------
export interface BuildOptions {
  showCompleted?: boolean;
  showAssignees?: boolean;
  showRisks?: boolean;
  showDecisions?: boolean;
  showMilestones?: boolean;
}

export interface RoadmapData {
  tasks: TaskWithAssignees[];
  workstreams: Workstream[];
  profiles: Profile[];
  milestones: Milestone[];
  risks: RiskItem[];
  decisions: DecisionItem[];
}

export function buildRoadmapNetworkGraph(data: RoadmapData, opts: BuildOptions = {}): RoadmapGraph {
  const { showCompleted = false, showAssignees = true, showRisks = true, showDecisions = true, showMilestones = true } = opts;

  let tasks = data.tasks;
  if (!showCompleted) tasks = tasks.filter(t => t.status !== "Complete");

  const nodes: GraphNode[] = [createProjectNode()];
  const links: GraphEdge[] = [];

  nodes.push(...createWorkstreamNodes(data.workstreams));
  links.push(...createWorkstreamEdges(data.workstreams));

  nodes.push(...createTaskNodes(tasks));
  links.push(...createWorkstreamTaskEdges(tasks));
  links.push(...createDependencyEdges(tasks));

  if (showAssignees && data.profiles.length > 0) {
    const assignedIds = new Set(tasks.flatMap(t => t.assignees.map(a => a.id)));
    nodes.push(...createAssigneeNodes(data.profiles.filter(p => assignedIds.has(p.id))));
    links.push(...createAssignmentEdges(tasks));
  }

  if (showMilestones && data.milestones.length > 0) {
    nodes.push(...createMilestoneNodes(data.milestones));
    links.push(...createMilestoneEdges(data.milestones));
  }

  if (showRisks && data.risks.length > 0) {
    nodes.push(...createRiskNodes(data.risks));
    links.push(...createRiskTaskEdges(data.risks));
  }

  if (showDecisions && data.decisions.length > 0) {
    nodes.push(...createDecisionNodes(data.decisions));
    links.push(...createDecisionTaskEdges(data.decisions));
  }

  const reg = createRegulatoryNodes(tasks);
  nodes.push(...reg.nodes);
  links.push(...reg.edges);

  // Remove edges that reference missing nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const cleanLinks = links.filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));

  return { nodes, links: cleanLinks };
}

// ---------------------------------------------------------------------------
// View-mode presets
// ---------------------------------------------------------------------------
export type ViewMode = "strategic" | "dependencies" | "team" | "fda_hipaa" | "critical_blocked" | "future";

export function applyViewMode(graph: RoadmapGraph, mode: ViewMode, data: RoadmapData): RoadmapGraph {
  const keepTypes = new Set<NodeType>();
  const keepEdgeTypes = new Set<EdgeType>();

  switch (mode) {
    case "strategic":
      return graph; // full graph
    case "dependencies":
      keepTypes.add("project"); keepTypes.add("workstream"); keepTypes.add("task");
      keepEdgeTypes.add("contains"); keepEdgeTypes.add("depends_on");
      break;
    case "team":
      keepTypes.add("assignee"); keepTypes.add("task"); keepTypes.add("workstream"); keepTypes.add("project");
      keepEdgeTypes.add("assigned_to"); keepEdgeTypes.add("contains");
      break;
    case "fda_hipaa":
      keepTypes.add("project"); keepTypes.add("workstream"); keepTypes.add("task"); keepTypes.add("regulatory");
      keepEdgeTypes.add("contains"); keepEdgeTypes.add("regulatory_link"); keepEdgeTypes.add("depends_on");
      break;
    case "critical_blocked":
      keepTypes.add("project"); keepTypes.add("workstream"); keepTypes.add("task"); keepTypes.add("risk"); keepTypes.add("decision");
      keepEdgeTypes.add("contains"); keepEdgeTypes.add("depends_on"); keepEdgeTypes.add("related_risk"); keepEdgeTypes.add("related_decision");
      break;
    case "future":
      keepTypes.add("project"); keepTypes.add("workstream"); keepTypes.add("task");
      keepEdgeTypes.add("contains"); keepEdgeTypes.add("depends_on");
      break;
  }

  if (keepTypes.size === 0) return graph;

  let nodes = graph.nodes.filter(n => keepTypes.has(n.type));

  // For critical_blocked, only keep relevant tasks
  if (mode === "critical_blocked") {
    nodes = nodes.filter(n => n.type !== "task" || n.meta.status === "Blocked" || n.meta.priority === "Critical");
  }

  // For fda_hipaa, only keep relevant tasks
  if (mode === "fda_hipaa") {
    nodes = nodes.filter(n =>
      n.type !== "task" || n.meta.regulatory_relevance === "High" || n.meta.regulatory_relevance === "Moderate" ||
      n.meta.hipaa_relevance === "High" || n.meta.hipaa_relevance === "Moderate"
    );
  }

  // For future, only keep Future Modules workstream tasks
  if (mode === "future") {
    const futureWsId = data.workstreams.find(w => w.label.includes("Future"))?.id;
    nodes = nodes.filter(n => n.type !== "task" || n.group === futureWsId);
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  const links = graph.links.filter(l =>
    keepEdgeTypes.has(l.type) && nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
  );

  // Remove orphan workstreams/project if no connected tasks
  const connectedIds = new Set(links.flatMap(l => [l.source as string, l.target as string]));
  nodes = nodes.filter(n => n.type === "project" || connectedIds.has(n.id));

  return { nodes, links };
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------
export interface NetworkWarning {
  nodeId: string;
  message: string;
  severity: "error" | "warn";
}

export function getNetworkWarnings(data: RoadmapData): NetworkWarning[] {
  const warnings: NetworkWarning[] = [];
  const taskIds = new Set(data.tasks.map(t => t.id));

  for (const t of data.tasks) {
    for (const dep of t.dependencies ?? []) {
      if (!taskIds.has(dep)) warnings.push({ nodeId: `task:${t.id}`, message: `Dependency '${dep}' not found`, severity: "warn" });
    }
    if (t.priority === "Critical" && t.assignees.length === 0)
      warnings.push({ nodeId: `task:${t.id}`, message: "Critical task unassigned", severity: "warn" });
    if (t.status === "Blocked" && (!t.blockers || t.blockers.length === 0))
      warnings.push({ nodeId: `task:${t.id}`, message: "Blocked without blockers", severity: "warn" });
    if (t.regulatory_relevance === "High" && !t.decision_needed && !t.notes)
      warnings.push({ nodeId: `task:${t.id}`, message: "High FDA without decision or notes", severity: "warn" });
    if (t.hipaa_relevance === "High" && !t.notes)
      warnings.push({ nodeId: `task:${t.id}`, message: "High HIPAA without notes", severity: "warn" });
    if (!t.workstream_id)
      warnings.push({ nodeId: `task:${t.id}`, message: "Orphan task - no workstream", severity: "warn" });
  }

  for (const r of data.risks) {
    if (!r.related_task_ids || r.related_task_ids.length === 0)
      warnings.push({ nodeId: `risk:${r.id}`, message: "Risk with no related tasks", severity: "warn" });
  }
  for (const d of data.decisions) {
    if (!d.related_task_ids || d.related_task_ids.length === 0)
      warnings.push({ nodeId: `dec:${d.id}`, message: "Decision with no related tasks", severity: "warn" });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
export function summarizeNetworkGraph(graph: RoadmapGraph) {
  const byType = (type: NodeType) => graph.nodes.filter(n => n.type === type).length;
  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.links.length,
    tasks: byType("task"),
    workstreams: byType("workstream"),
    assignees: byType("assignee"),
    milestones: byType("milestone"),
    risks: byType("risk"),
    decisions: byType("decision"),
    dependencies: graph.links.filter(l => l.type === "depends_on").length,
  };
}
