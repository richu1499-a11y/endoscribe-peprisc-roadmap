"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getTasks, getGovernanceItems, createGovernanceItem, updateGovernanceItem, deleteGovernanceItem } from "@/lib/roadmapStore";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { RoadmapTask, GovernanceItem } from "@/lib/roadmapTypes";
import { GOVERNANCE_CATEGORIES } from "@/lib/roadmapTypes";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import GovernanceItemForm from "@/components/GovernanceItemForm";
import { clsx } from "clsx";
import { Plus, AlertTriangle, ChevronDown, ChevronUp, X, ShieldAlert } from "lucide-react";

const PHI_FLOW_ROWS = [
  { asset: "Procedure-room audio capture", phi: "Yes", type: "Audio", approved: "TBD", risk: "High" },
  { asset: "Raw audio file", phi: "Yes", type: "Audio file", approved: "TBD", risk: "High" },
  { asset: "ASR transcription process", phi: "Yes", type: "Compute", approved: "TBD", risk: "High" },
  { asset: "Transcript text", phi: "Yes", type: "Text", approved: "TBD", risk: "High" },
  { asset: "Structured ERCP variables", phi: "Yes", type: "Structured data", approved: "TBD", risk: "High" },
  { asset: "PEPRisc model input", phi: "Yes", type: "Variables", approved: "TBD", risk: "High" },
  { asset: "PEPRisc output (risk score)", phi: "Derived", type: "Score", approved: "TBD", risk: "Moderate" },
  { asset: "Validation database", phi: "Yes", type: "Research DB", approved: "TBD", risk: "High" },
  { asset: "Exported metadata/reports", phi: "De-ID only", type: "Reports", approved: "Depends", risk: "Moderate" },
  { asset: "Dashboard roadmap metadata", phi: "No", type: "Planning", approved: "Yes (this app)", risk: "Low" },
];

const GUARDRAIL_ROWS = [
  { tool: "Public AI endpoints (ChatGPT, Claude, etc.)", status: "Not allowed for PHI", notes: "Unless institutionally approved with BAA" },
  { tool: "Public model-hosting services", status: "Not allowed for PHI", notes: "Unless approved with BAA" },
  { tool: "Local GPU tower", status: "Needs review", notes: "Governance/IT review required if PHI involved" },
  { tool: "JHU Discovery / Hopkins-managed compute", status: "Candidate", notes: "Pending Hopkins IT approval" },
  { tool: "Secure institutional cloud", status: "Possible", notes: "Requires approval and agreements" },
  { tool: "Phone microphone (simulation)", status: "OK for simulation", notes: "Not for patient recordings without IRB" },
  { tool: "Room/OR microphone (patient)", status: "Requires IRB", notes: "IRB-approved workflow required" },
];

const riskBadge: Record<string, string> = { Low: "text-green-700 bg-green-50", Moderate: "text-amber-700 bg-amber-50", High: "text-red-700 bg-red-50", Unknown: "text-slate-600 bg-slate-100" };

export default function GovernancePage() {
  const [items, setItems] = useState<GovernanceItem[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [editing, setEditing] = useState<Partial<GovernanceItem> | null | "new">(null);
  const [selectedItem, setSelectedItem] = useState<GovernanceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  const refresh = useCallback(async () => {
    const [gi, t] = await Promise.all([getGovernanceItems(), getTasks()]);
    setItems(gi); setTasks(t);
  }, []);

  useEffect(() => {
    const init = async () => { await refresh(); if (isSupabaseConfigured) { const r = await getCurrentRole(); setUserCanEdit(checkCanEdit(r)); } };
    init();
  }, [refresh]);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const day30 = useMemo(() => new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10), [now]);

  // Metrics
  const highHipaa = items.filter(i => i.hipaa_risk === "High");
  const phiItems = items.filter(i => i.phi_involved);
  const needsIrb = items.filter(i => i.irb_status === "Not assessed" || i.irb_status === "Amendment likely needed");
  const needsIt = items.filter(i => i.hopkins_it_status === "Needs review" || i.hopkins_it_status === "Not assessed");
  const approved = items.filter(i => i.status === "Approved" || i.status === "Complete");
  const noOwner = items.filter(i => !i.owner);
  const dueSoon = items.filter(i => i.due_date && i.due_date <= day30 && i.due_date >= today && i.status !== "Complete" && i.status !== "Approved");

  // Category grouping
  const byCategory = useMemo(() => {
    const m = new Map<string, GovernanceItem[]>();
    for (const i of items) { const l = m.get(i.category) ?? []; l.push(i); m.set(i.category, l); }
    return m;
  }, [items]);

  // HIPAA-relevant tasks
  const hipaaTasks = tasks.filter(t =>
    t.hipaa_relevance === "High" || t.hipaa_relevance === "Moderate" ||
    t.id.startsWith("IRB-") || t.id.startsWith("INFRA-") || t.id.startsWith("AUDIO-") ||
    t.id.startsWith("DATA-") || t.id.startsWith("ASR-") || t.id.startsWith("PLATFORM-")
  );

  // Warnings
  const warnings = useMemo(() => {
    const w: { id: string; msg: string }[] = [];
    for (const i of items) {
      if (i.phi_involved && i.hipaa_risk === "Unknown") w.push({ id: i.title, msg: "PHI involved but HIPAA risk is Unknown" });
      if (i.phi_involved && !i.data_location) w.push({ id: i.title, msg: "PHI involved but no storage location defined" });
      if (i.phi_involved && !i.compute_location && (i.category === "Secure Compute" || i.category === "AI Transcription")) w.push({ id: i.title, msg: "PHI involved but no compute location defined" });
      if ((i.irb_status === "Not assessed" || i.irb_status === "Amendment likely needed") && !i.owner) w.push({ id: i.title, msg: "Needs IRB decision but no owner" });
      if (i.hopkins_it_status === "Not assessed" && i.category === "Hopkins IT Review") w.push({ id: i.title, msg: "Hopkins IT review not started" });
      if (i.category === "External Tool Restriction" && i.status !== "Complete" && i.status !== "Approved") w.push({ id: i.title, msg: "External tool restriction not yet finalized" });
      if (i.due_date && i.due_date < today && i.status !== "Complete" && i.status !== "Approved") w.push({ id: i.title, msg: "Past due" });
      if (!i.next_action) w.push({ id: i.title, msg: "No next_action defined" });
    }
    for (const t of tasks) {
      if (t.hipaa_relevance === "High" && !t.notes) w.push({ id: t.id, msg: "High HIPAA task without notes" });
      if (t.hipaa_relevance === "High" && !t.decision_needed) w.push({ id: t.id, msg: "High HIPAA task without decision_needed" });
    }
    return w;
  }, [items, tasks, today]);

  const displayItems = activeCategory ? items.filter(i => i.category === activeCategory) : items;

  async function handleSave(item: Partial<GovernanceItem>) {
    setError(null);
    try {
      if (editing === "new") await createGovernanceItem(item);
      else if (selectedItem) await updateGovernanceItem(selectedItem.id, item);
      setEditing(null); setSelectedItem(null); await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this governance item?")) return;
    try { await deleteGovernanceItem(id); await refresh(); setSelectedItem(null); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const headCls = "text-base font-semibold text-slate-800 mb-2";
  const catBtnCls = (c: string) => clsx("px-2.5 py-1 text-xs rounded border transition-colors", activeCategory === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">IRB / Compliance / Hopkins IT Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Operational governance roadmap for PHI data flow, audio recording, AI transcription, secure compute, and institutional review</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add Item</button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
        <span>This dashboard supports governance planning and does not constitute institutional approval. All items require formal review. Do not enter PHI.</span>
      </div>

      <ComplianceBanner />
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MetricCard label="Total Items" value={items.length} />
        <MetricCard label="High HIPAA" value={highHipaa.length} accent={highHipaa.length > 0 ? "red" : "default"} />
        <MetricCard label="PHI Involved" value={phiItems.length} accent={phiItems.length > 0 ? "amber" : "default"} />
        <MetricCard label="IRB Decision" value={needsIrb.length} accent={needsIrb.length > 0 ? "amber" : "default"} />
        <MetricCard label="IT Review" value={needsIt.length} />
        <MetricCard label="Approved" value={approved.length} accent="green" />
        <MetricCard label="No Owner" value={noOwner.length} accent={noOwner.length > 0 ? "amber" : "default"} />
        <MetricCard label="Due 30d" value={dueSoon.length} accent="blue" />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button className={catBtnCls("")} onClick={() => setActiveCategory("")}>All ({items.length})</button>
        {GOVERNANCE_CATEGORIES.map(c => {
          const n = byCategory.get(c)?.length ?? 0;
          return n > 0 ? <button key={c} className={catBtnCls(c)} onClick={() => setActiveCategory(c)}>{c} ({n})</button> : null;
        })}
      </div>

      {/* Governance items table */}
      <section>
        <h2 className={headCls}>Governance Items {activeCategory && `-- ${activeCategory}`}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr>
              <th className={thCls}>Title</th><th className={thCls}>Category</th><th className={thCls}>PHI</th>
              <th className={thCls}>HIPAA</th><th className={thCls}>IRB</th><th className={thCls}>IT</th>
              <th className={thCls}>Status</th><th className={thCls}>Next Action</th>
              {userCanEdit && <th className={thCls + " text-right"}>Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className={tdCls + " font-medium text-slate-800 max-w-[220px]"}>{item.title}</td>
                  <td className={tdCls + " text-[10px]"}>{item.category}</td>
                  <td className={tdCls}>{item.phi_involved ? <span className="text-red-600 font-medium">Yes</span> : "No"}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1 py-0.5 text-[10px] font-medium", riskBadge[item.hipaa_risk] ?? riskBadge.Unknown)}>{item.hipaa_risk}</span></td>
                  <td className={tdCls + " text-[10px]"}>{item.irb_status}</td>
                  <td className={tdCls + " text-[10px]"}>{item.hopkins_it_status}</td>
                  <td className={tdCls}><StatusBadge status={item.status} /></td>
                  <td className={tdCls + " max-w-[150px] truncate"}>{item.next_action || "--"}</td>
                  {userCanEdit && (
                    <td className={tdCls + " text-right"} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setSelectedItem(item); setEditing(item); }} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {displayItems.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">No governance items. {userCanEdit ? "Click Add Item." : "Run migration to seed data."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* PHI data-flow matrix */}
      <section>
        <h2 className={headCls}>PHI Data-Flow Matrix</h2>
        <p className="text-xs text-slate-500 mb-2">Map of data assets, PHI status, and governance requirements. All PHI must remain in Hopkins-approved environments.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Data Asset</th><th className={thCls}>PHI?</th><th className={thCls}>Type</th><th className={thCls}>Approved Env</th><th className={thCls}>HIPAA Risk</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {PHI_FLOW_ROWS.map((r, i) => (
                <tr key={i}><td className={tdCls + " font-medium"}>{r.asset}</td>
                  <td className={tdCls}>{r.phi === "Yes" ? <span className="text-red-600 font-medium">Yes</span> : r.phi}</td>
                  <td className={tdCls}>{r.type}</td><td className={tdCls}>{r.approved}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1 py-0.5 text-[10px] font-medium", riskBadge[r.risk])}>{r.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guardrails */}
      <section>
        <h2 className={headCls}>External Tools and Compute Guardrails</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Tool / Resource</th><th className={thCls}>PHI Status</th><th className={thCls}>Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {GUARDRAIL_ROWS.map((r, i) => (
                <tr key={i}><td className={tdCls + " font-medium"}>{r.tool}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", r.status.includes("Not allowed") ? "text-red-700 bg-red-50" : r.status.includes("Requires") ? "text-amber-700 bg-amber-50" : "text-slate-600 bg-slate-100")}>{r.status}</span></td>
                  <td className={tdCls}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Linked HIPAA tasks */}
      {hipaaTasks.length > 0 && (
        <section>
          <h2 className={headCls}>Linked Roadmap Tasks (HIPAA / IRB / Infrastructure)</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>ID</th><th className={thCls}>Title</th><th className={thCls}>HIPAA</th><th className={thCls}>Status</th><th className={thCls}>Priority</th><th className={thCls}>Target</th><th className={thCls}>Next Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {hipaaTasks.slice(0, 30).map(t => (
                  <tr key={t.id}><td className={tdCls + " font-mono"}>{t.id}</td>
                    <td className={tdCls + " font-medium max-w-[200px] truncate"}>{t.title}</td>
                    <td className={tdCls}>{t.hipaa_relevance}</td>
                    <td className={tdCls}><StatusBadge status={t.status} /></td>
                    <td className={tdCls}><PriorityBadge priority={t.priority} /></td>
                    <td className={tdCls}>{t.target_date ?? "--"}</td>
                    <td className={tdCls + " max-w-[150px] truncate"}>{t.next_action || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Warnings */}
      <section>
        <button onClick={() => setWarningsOpen(!warningsOpen)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />Governance Health Warnings ({warnings.length})
          {warningsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {warningsOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {warnings.length === 0 ? <p className="px-4 py-3 text-sm text-green-700">No warnings.</p> :
              warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
                  <span className="mt-0.5 shrink-0 h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-mono text-slate-500 max-w-[180px] truncate">{w.id}</span>
                  <span className="text-slate-700">{w.msg}</span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selectedItem && !editing && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-[420px] flex-col border-l border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <span className="text-xs uppercase text-slate-500">{selectedItem.category}</span>
            <button onClick={() => setSelectedItem(null)} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <h2 className="text-base font-semibold text-slate-900">{selectedItem.title}</h2>
            <div className="flex gap-2"><StatusBadge status={selectedItem.status} /><PriorityBadge priority={selectedItem.priority} /></div>
            <p className="text-sm text-slate-600">{selectedItem.description}</p>
            <Df label="PHI Involved">{selectedItem.phi_involved ? "Yes" : "No"}</Df>
            <Df label="HIPAA Risk"><span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", riskBadge[selectedItem.hipaa_risk] ?? riskBadge.Unknown)}>{selectedItem.hipaa_risk}</span></Df>
            <Df label="IRB Status">{selectedItem.irb_status}</Df>
            <Df label="Hopkins IT Status">{selectedItem.hopkins_it_status}</Df>
            <Df label="Data Type">{selectedItem.data_type}</Df>
            <Df label="Data Location">{selectedItem.data_location}</Df>
            <Df label="Compute Location">{selectedItem.compute_location}</Df>
            <Df label="Approval Needed">{selectedItem.approval_needed}</Df>
            <Df label="Current State">{selectedItem.current_state}</Df>
            <Df label="Gap">{selectedItem.gap}</Df>
            <Df label="Decision Needed">{selectedItem.decision_needed}</Df>
            <Df label="Next Action">{selectedItem.next_action}</Df>
            <Df label="Owner">{selectedItem.owner}</Df>
            <Df label="Due Date">{selectedItem.due_date}</Df>
            <Df label="Related Tasks">{(selectedItem.related_task_ids ?? []).join(", ")}</Df>
            <Df label="Notes">{selectedItem.notes}</Df>
          </div>
          {userCanEdit && (
            <div className="border-t px-5 py-3">
              <button onClick={() => setEditing(selectedItem)} className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Edit</button>
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-8">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <GovernanceItemForm item={editing === "new" ? null : editing as Partial<GovernanceItem>} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[10px] font-medium text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd></div>;
}
