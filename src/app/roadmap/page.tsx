"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups, getMilestones } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup, Milestone } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Target, X, BarChart3, Layers, Share2 } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const WS_COLORS: Record<string, string> = {
  "endoscribe-core-template-engine": "#0d9488",
  "voice-asr-room-workflow": "#f59e0b",
  "peprisc-prediction-models": "#8b5cf6",
  "recommendation-engine": "#ec4899",
  "analytics-quality": "#14b8a6",
  "infrastructure-deployment-strategy": "#06b6d4",
  "validation-regulatory-translation": "#ef4444",
};

interface EpicDef { id: string; title: string; goal: string; items: string[] }
interface WsEpics { slug: string; epics: EpicDef[] }

const ROADMAP_EPICS: WsEpics[] = [
  { slug: "endoscribe-core-template-engine", epics: [
    { id: "1.1", title: "Procedure Template Foundation", goal: "Refine and expand EndoScribe\u2019s structured template library.", items: ["ERCP, EUS, and colonoscopy template tracks", "Template coverage expansion", "Handling new or uncommon procedures"] },
    { id: "1.2", title: "Multi-Agentic Template Framework", goal: "Define the future architecture for provider-adaptive note generation.", items: ["Transcript/context parsing", "Template selection", "Provider-preference adaptation", "Note drafting and verification"] },
    { id: "1.3", title: "Clinician Documentation Workflow", goal: "Define how clinicians interact with EndoScribe before, during, and after note generation.", items: ["Clinician dictation workflow", "Note-taking workflow", "Endoscope guidance/user protocol", "Note editing/correction workflow"] },
    { id: "1.4", title: "Transcript Safety", goal: "Prevent identifiers and irrelevant content from entering downstream models.", items: ["Patient-identifier masking", "Transcript filtering", "Relevant-speech prioritization", "Finalize cataloging recordings"] },
  ]},
  { slug: "voice-asr-room-workflow", epics: [
    { id: "2.1", title: "ASR Model Evaluation", goal: "Determine which transcription model is clinically usable.", items: ["Med ASR evaluation", "Comparison with Whisper/other models", "Clinical terminology capture", "Latency implications"] },
    { id: "2.2", title: "Microphone Experiment", goal: "Determine whether phone capture is adequate or OR microphone is needed.", items: ["Phone microphone testing", "OR/external microphone testing", "Quality and setup burden comparison"] },
    { id: "2.3", title: "Multi-Speaker Handling", goal: "Define how EndoScribe handles multiple speakers.", items: ["Speaker diarization", "Main clinician detection", "Content-based filtering", "Relevant-speech capture"] },
  ]},
  { slug: "peprisc-prediction-models", epics: [
    { id: "3.1", title: "Hands-Free PEPRisc Workflow", goal: "Move PEPRisc toward real-time hands-free calculation.", items: ["Automated variable capture", "Real-time or trigger-based calculation", "Output visibility during validation", "Integration with EndoScribe workflow"] },
    { id: "3.2", title: "PEPRisc Prospective Validation", goal: "Prepare PEPRisc for prospective non-interventional evaluation.", items: ["Shadow-mode vs visible output", "Ground-truth comparison", "IRB amendment linkage"] },
    { id: "3.3", title: "Prediction Model Monitoring", goal: "Define how prediction models will be monitored over time.", items: ["Drift detection", "Staging/production comparison", "Retraining/update pathway"] },
  ]},
  { slug: "recommendation-engine", epics: [
    { id: "4.1", title: "Recommendation Logic Reset", goal: "Review and clean the current recommendation system.", items: ["Refine existing logics", "Engine expansion", "MVP recommendation set"] },
    { id: "4.2", title: "Guideline Maintenance Strategy", goal: "Define how recommendations remain current and clinically acceptable.", items: ["Source-of-truth guideline strategy", "Update workflow", "Review and approval process"] },
    { id: "4.3", title: "Recommendation Validation", goal: "Validate recommendation outputs separately.", items: ["Validation approach", "Ground-truth comparison", "Error categories"] },
  ]},
  { slug: "analytics-quality", epics: [
    { id: "5.1", title: "KPI and Quality Metric Framework", goal: "Decide what EndoScribe should measure and report.", items: ["EndoScribe KPIs", "Quality metrics", "Dashboard/reporting requirements"] },
    { id: "5.2", title: "Analytics Framework", goal: "Define future provider-level and facility-level analytics.", items: ["Provider-level analytics", "Facility-level analytics", "Leadership summaries", "Future benchmarking"] },
  ]},
  { slug: "infrastructure-deployment-strategy", epics: [
    { id: "6.1", title: "Systems Architecture", goal: "Define the technical architecture for MVP and prospective validation.", items: ["Architecture diagram", "Data-flow diagram", "Storage model", "Online/offline components"] },
    { id: "6.2", title: "Deployment Strategy", goal: "Define short-term and long-term deployment pathways.", items: ["MVP deployment", "Long-term deployment", "DSAI/Hopkins compute", "On-prem/cloud options"] },
    { id: "6.3", title: "Data Infrastructure", goal: "Define the database and async processing layer.", items: ["Database strategy", "Queue strategy", "Offline job processing", "Latency-sensitive inference"] },
    { id: "6.4", title: "Model Operations", goal: "Define how models are staged, deployed, monitored, and updated.", items: ["CI/CD", "Staging/production workflow", "Monitoring and rollback", "Federated/distributed learning"] },
  ]},
  { slug: "validation-regulatory-translation", epics: [
    { id: "7.1", title: "Prospective Validation Design", goal: "Define distinct validation tracks.", items: ["EndoScribe validation", "PEPRisc validation", "Recommendation-engine validation", "Shadow-mode design", "Pilot launch criteria"] },
    { id: "7.2", title: "IRB Amendment & ASGE Alignment", goal: "Update the study protocol and IRB language.", items: ["ASGE goals/aims/protocol alignment", "Prospective evaluations", "Audio/transcript/data-flow language", "Identifier masking language"] },
    { id: "7.3", title: "FDA Pre-Sub Preparation", goal: "Prepare for regulatory discussion.", items: ["Prepare for FDA Pre-Sub meeting", "Prepare regulatory question list"] },
  ]},
];

type ViewTab = "overview" | "epics" | "map";
const TABS: { key: ViewTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Program Overview", icon: BarChart3 },
  { key: "epics", label: "Roadmap Epics", icon: Layers },
  { key: "map", label: "Roadmap Map", icon: Share2 },
];

export default function RoadmapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialView = (searchParams.get("view") as ViewTab) || "overview";
  const [view, setView] = useState<ViewTab>(["overview", "epics", "map"].includes(initialView) ? initialView : "overview");

  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskWithAssignees | null>(null);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [colorBy, setColorBy] = useState<"workspace" | "status" | "priority">("workspace");
  const [filterWs, setFilterWs] = useState("");

  function switchTab(tab: ViewTab) {
    setView(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const refresh = useCallback(async () => {
    const [raw, profs, assigns, ws, ms] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups(), getMilestones()]);
    setTasks(await getTasksWithAssignees(raw, assigns, profs));
    setWorkspaces(ws);
    setMilestones(ms);
    if (isSupabaseConfigured) { const user = await getCurrentUser(); setCurrentUserId(user?.id ?? null); }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);
  useEffect(() => { if (workspaces.length > 0 && expandedWs.size === 0) setExpandedWs(new Set(workspaces.map(w => w.slug))); }, [workspaces, expandedWs.size]);

  const active = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");
  const high = active.filter(t => t.priority === "Critical" || t.priority === "High").length;
  const blocked = active.filter(t => t.status === "Blocked").length;
  const myTasks = currentUserId ? active.filter(t => t.assignees.some(a => a.id === currentUserId)) : [];
  const totalEpics = ROADMAP_EPICS.reduce((s, ws) => s + ws.epics.length, 0);

  const filtered = useMemo(() => {
    let t = active;
    if (filterWs) t = t.filter(x => x.workspace === filterWs);
    return t;
  }, [active, filterWs]);

  const graphData = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const nodes: any[] = [];
    const links: any[] = [];
    const taskIds = new Set(filtered.map(t => t.id));
    const usedWs = new Set(filtered.map(t => t.workspace).filter(Boolean));
    for (const ws of workspaces) {
      if (usedWs.has(ws.slug)) nodes.push({ id: `ws:${ws.slug}`, label: ws.title, color: WS_COLORS[ws.slug] ?? "#64748b", val: 20, type: "workspace", owner: "" });
    }
    for (const t of filtered) {
      const color = colorBy === "workspace" ? (WS_COLORS[t.workspace ?? ""] ?? "#64748b") : colorBy === "status" ? ({ "Not started": "#94a3b8", "In progress": "#0d9488", Blocked: "#ef4444", Complete: "#22c55e", Deferred: "#a78bfa" }[t.status] ?? "#94a3b8") : (t.priority === "Critical" ? "#ef4444" : t.priority === "High" ? "#f59e0b" : "#0d9488");
      const size = t.priority === "Critical" ? 12 : t.priority === "High" ? 9 : 6;
      const owner = t.owner || (t.assignees.length > 0 ? t.assignees[0].full_name || t.assignees[0].email : "");
      nodes.push({ id: t.id, label: t.title, color, val: size, type: "task", owner, meta: t });
      if (t.workspace && usedWs.has(t.workspace)) links.push({ source: `ws:${t.workspace}`, target: t.id, color: "#e2e8f0" });
      for (const dep of t.dependencies ?? []) { if (taskIds.has(dep)) links.push({ source: dep, target: t.id, color: "#94a3b8" }); }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { nodes, links };
  }, [filtered, workspaces, colorBy]);

  function toggleWs(slug: string) { setExpandedWs(prev => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; }); }

  const selCls = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-teal-400 focus:outline-none";
  const tabCls = (t: ViewTab) => clsx("flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors", view === t ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Roadmap</h1>
          <p className="text-base text-slate-500 mt-1">{workspaces.length} verticals &middot; {totalEpics} epics &middot; {active.length} active tasks</p>
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (<button key={t.key} className={tabCls(t.key)} onClick={() => switchTab(t.key)}><t.icon className="h-4 w-4" /> {t.label}</button>))}
        </div>
      </div>

      {/* ═══════ PROGRAM OVERVIEW ═══════ */}
      {view === "overview" && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Program Overview</h2>
            <p className="text-base text-slate-600 leading-relaxed">EndoScribe is being developed as a platform for ambient endoscopy documentation, procedure-specific recommendations, prediction-model integration, and quality analytics. The current roadmap focuses on refining the core documentation engine, validating the speech-capture workflow, integrating PEPRisc as a hands-free prediction model, defining the infrastructure pathway, and preparing for prospective validation and regulatory planning.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <SC label="Active Tasks" value={active.length} color="bg-teal-500" />
            <SC label="High Priority" value={high} color="bg-amber-500" />
            <SC label="Blocked" value={blocked} color={blocked > 0 ? "bg-red-500" : "bg-slate-400"} />
            <SC label="Epics" value={totalEpics} color="bg-slate-600" />
            <SC label="My Tasks" value={myTasks.length} color="bg-teal-600" />
          </div>
          {milestones.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-teal-600" /> Milestones</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {milestones.map(ms => (
                  <div key={ms.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-2"><StatusBadge status={ms.status} />{ms.target_date && <span className="text-xs text-teal-600 font-medium">{ms.target_date}</span>}</div>
                    <h3 className="text-base font-semibold text-slate-900">{ms.title}</h3>
                    {ms.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ms.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Workspace Progress</h2>
            <div className="space-y-3">
              {workspaces.filter(w => w.is_visible).map(ws => {
                const wt = tasks.filter(t => t.workspace === ws.slug);
                const done = wt.filter(t => t.status === "Complete").length;
                const total = wt.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const color = WS_COLORS[ws.slug] ?? "#64748b";
                return (
                  <div key={ws.slug} className="rounded-xl border border-slate-200 bg-white px-6 py-4 flex items-center gap-5">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <p className="flex-1 text-sm font-semibold text-slate-900">{ws.title}</p>
                    <div className="w-32 flex items-center gap-2 shrink-0">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                      <span className="text-xs text-slate-500 w-10 text-right">{done}/{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ═══════ ROADMAP EPICS ═══════ */}
      {view === "epics" && (
        <div className="space-y-6">
          {ROADMAP_EPICS.map(wsEpic => {
            const ws = workspaces.find(w => w.slug === wsEpic.slug);
            if (!ws) return null;
            const color = WS_COLORS[wsEpic.slug] ?? "#64748b";
            const isExpanded = expandedWs.has(wsEpic.slug);
            return (
              <section key={wsEpic.slug} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <button onClick={() => toggleWs(wsEpic.slug)} className="w-full flex items-center gap-4 px-7 py-5 hover:bg-slate-50 transition-colors text-left">
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <div className="flex-1"><h2 className="text-lg font-bold text-slate-900">{ws.title}</h2><p className="text-sm text-slate-500 mt-0.5">{wsEpic.epics.length} epics</p></div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {wsEpic.epics.map(epic => (
                      <div key={epic.id} className="px-8 py-5">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono text-slate-400 mt-0.5 shrink-0">{epic.id}</span>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">{epic.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{epic.goal}</p>
                            <div className="mt-3 space-y-1">
                              {epic.items.map((item, i) => (<div key={i} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-slate-300 mt-0.5">&#x2022;</span><span>{item}</span></div>))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ═══════ ROADMAP MAP ═══════ */}
      {view === "map" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select className={selCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
              <option value="">All Workspaces</option>
              {workspaces.map(w => <option key={w.slug} value={w.slug}>{w.title}</option>)}
            </select>
            <select className={selCls} value={colorBy} onChange={e => setColorBy(e.target.value as typeof colorBy)}>
              <option value="workspace">Color: Workspace</option>
              <option value="status">Color: Status</option>
              <option value="priority">Color: Priority</option>
            </select>
            <button disabled className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-400 cursor-not-allowed">Explore in 3D</button>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            {colorBy === "workspace" && workspaces.filter(w => w.is_visible).map(w => (
              <span key={w.slug} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: WS_COLORS[w.slug] }} />{w.title}</span>
            ))}
          </div>
          {graphData.nodes.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ height: 560 }}>
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              <ForceGraph2D graphData={graphData as any} nodeLabel={(n: any) => n.label} nodeColor={(n: any) => n.color} nodeVal={(n: any) => n.val}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const size = node.val ?? 6;
                  if (node.type === "workspace") { ctx.beginPath(); ctx.moveTo(node.x, node.y - size); ctx.lineTo(node.x + size, node.y); ctx.lineTo(node.x, node.y + size); ctx.lineTo(node.x - size, node.y); ctx.closePath(); ctx.fillStyle = node.color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
                  else { ctx.beginPath(); ctx.arc(node.x, node.y, size, 0, 2 * Math.PI); ctx.fillStyle = node.color; ctx.fill(); if (selected?.id === node.id) { ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3; ctx.stroke(); } }
                  if (globalScale > 1) { const title = node.label.length > 30 ? node.label.slice(0, 28) + "..." : node.label; const fs = Math.max(3, 11 / globalScale); ctx.font = `${node.type === "workspace" ? "bold " : ""}${fs}px sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#1e293b"; ctx.fillText(title, node.x, node.y + size + fs * 0.4 + 2); if (node.owner && globalScale > 1.5) { ctx.font = `${fs * 0.85}px sans-serif`; ctx.fillStyle = "#0d9488"; ctx.fillText(node.owner, node.x, node.y + size + fs * 1.4 + 3); } }
                }}
                linkColor={(l: any) => l.color} linkWidth={1.5} linkDirectionalArrowLength={4} linkDirectionalArrowRelPos={1}
                onNodeClick={(n: any) => { if (n.type === "task" && n.meta) setSelected(n.meta); }} onBackgroundClick={() => setSelected(null)} cooldownTicks={80} height={560} />
              {/* eslint-enable @typescript-eslint/no-explicit-any */}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center"><p className="text-lg text-slate-500">No tasks to display.</p></div>
          )}
          <p className="text-xs text-slate-400">Drag to pan. Scroll to zoom. Click a node for details.</p>
        </div>
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
            <Df label="Epic">{selected.epic}</Df>
            <Df label="Owner">{selected.owner}</Df>
            <Df label="Assignees">{selected.assignees.length > 0 ? selected.assignees.map(a => a.full_name || a.email).join(", ") : null}</Df>
            <Df label="Due Date">{selected.target_date}</Df>
            <Df label="Dependencies">{selected.dependencies?.length > 0 ? selected.dependencies.join(", ") : null}</Df>
          </div>
        </div>
      )}
    </div>
  );
}

function SC({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center gap-4">
      <div className={clsx("h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold", color)}>{value}</div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="text-base text-slate-800 mt-0.5">{children || <span className="text-slate-300">--</span>}</dd></div>;
}
