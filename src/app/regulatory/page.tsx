"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getTasks, getRegulatoryItems, createRegulatoryItem, updateRegulatoryItem, deleteRegulatoryItem } from "@/lib/roadmapStore";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { RoadmapTask, RegulatoryItem } from "@/lib/roadmapTypes";
import { REGULATORY_CATEGORIES } from "@/lib/roadmapTypes";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import RegulatoryItemForm from "@/components/RegulatoryItemForm";
import { clsx } from "clsx";
import { Plus, AlertTriangle, ChevronDown, ChevronUp, X, ShieldAlert } from "lucide-react";

// Intended-use matrix static data
const INTENDED_USE_ROWS = [
  { use: "Documentation-only transcription", user: "Clinician", output: "Draft note text", care: "No", riskTier: "Low" },
  { use: "Structured note with human review", user: "Clinician", output: "Structured fields", care: "Indirect", riskTier: "Low" },
  { use: "PEPRisc shadow-mode (research)", user: "Researcher", output: "Risk score (not shown)", care: "No", riskTier: "Low" },
  { use: "PEPRisc coordinator-facing", user: "Coordinator", output: "Risk estimate", care: "Indirect", riskTier: "Moderate" },
  { use: "PEPRisc clinician-facing non-directive", user: "Clinician", output: "Risk estimate + basis", care: "Informational", riskTier: "Moderate" },
  { use: "Real-time procedural recommendation", user: "Clinician", output: "Action recommendation", care: "Yes", riskTier: "High" },
  { use: "Multi-modal platform (audio/text/video)", user: "Clinician", output: "Multiple outputs", care: "Yes", riskTier: "High" },
  { use: "Adaptive/updatable AI model", user: "System", output: "Updated predictions", care: "Depends", riskTier: "High" },
];

// CDS assessment questions
const CDS_QUESTIONS = [
  { q: "Does the function use medical information normally communicated between clinicians?", prong: 1 },
  { q: "Does it provide a recommendation rather than a directive?", prong: 2 },
  { q: "Can the clinician independently review the basis for the recommendation?", prong: 3 },
  { q: "Does it analyze signals/images/patterns beyond simple clinical information?", prong: 4 },
  { q: "Is output time-critical to patient safety?", prong: 0 },
  { q: "Is this research-only, shadow-mode, or clinician-facing?", prong: 0 },
];

// Platform vs module items
const PLATFORM_ITEMS = [
  { name: "Transcription (ASR)", type: "Platform", risk: "Low", evidence: "WER, CER, medical term accuracy" },
  { name: "Structured note generation", type: "Platform", risk: "Low", evidence: "Output quality, completeness" },
  { name: "Template support", type: "Platform", risk: "Low", evidence: "Template accuracy" },
  { name: "Variable extraction", type: "Platform", risk: "Moderate", evidence: "Sensitivity, specificity, F1" },
  { name: "Audit logging / dashboard", type: "Platform", risk: "Low", evidence: "Completeness, access control" },
  { name: "PEPRisc (shadow)", type: "Prediction Module", risk: "Moderate", evidence: "AUC, calibration, agreement" },
  { name: "PEPRisc (clinician-facing)", type: "Prediction Module", risk: "High", evidence: "Full validation + CDS analysis" },
  { name: "Future Barrett's model", type: "Prediction Module", risk: "High", evidence: "TBD" },
  { name: "Future papilla/cannulation model", type: "Prediction Module", risk: "High", evidence: "TBD" },
];

const riskColor: Record<string, string> = { Low: "text-green-700 bg-green-50", Moderate: "text-amber-700 bg-amber-50", High: "text-red-700 bg-red-50", Unknown: "text-slate-600 bg-slate-100" };

export default function RegulatoryPage() {
  const [regItems, setRegItems] = useState<RegulatoryItem[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [editing, setEditing] = useState<Partial<RegulatoryItem> | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RegulatoryItem | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");

  const refresh = useCallback(async () => {
    const [ri, t] = await Promise.all([getRegulatoryItems(), getTasks()]);
    setRegItems(ri);
    setTasks(t);
  }, []);

  useEffect(() => {
    const init = async () => {
      await refresh();
      if (isSupabaseConfigured) {
        const role = await getCurrentRole();
        setUserCanEdit(checkCanEdit(role));
      }
    };
    init();
  }, [refresh]);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const day30 = useMemo(() => new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10), [now]);

  // Metrics
  const highRisk = regItems.filter(i => i.regulatory_risk === "High");
  const needsDecision = regItems.filter(i => i.status === "Needs decision");
  const complete = regItems.filter(i => i.status === "Complete");
  const noOwner = regItems.filter(i => !i.owner);
  const fdaTasks = tasks.filter(t => t.regulatory_relevance === "High" || t.regulatory_relevance === "Moderate");
  const dueSoon = regItems.filter(i => i.due_date && i.due_date <= day30 && i.due_date >= today && i.status !== "Complete");

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, RegulatoryItem[]>();
    for (const item of regItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [regItems]);

  // Warnings
  const warnings = useMemo(() => {
    const w: { id: string; msg: string }[] = [];
    for (const i of regItems) {
      if (!i.owner) w.push({ id: i.title, msg: "No owner assigned" });
      if (!i.next_action) w.push({ id: i.title, msg: "No next_action" });
      if (i.category === "FDA Pre-Submission" && !i.evidence_needed) w.push({ id: i.title, msg: "Pre-sub item missing evidence_needed" });
      if (i.category === "Intended Use" && i.status === "Not started") w.push({ id: i.title, msg: "Intended-use item not started" });
      if (i.due_date && i.due_date < today && i.status !== "Complete") w.push({ id: i.title, msg: "Past due" });
    }
    for (const t of tasks) {
      if (t.regulatory_relevance === "High" && !t.decision_needed && !t.notes) w.push({ id: t.id, msg: "High FDA task without decision_needed or notes" });
    }
    return w;
  }, [regItems, tasks, today]);

  // Filtered view
  const displayItems = activeCategory ? regItems.filter(i => i.category === activeCategory) : regItems;

  async function handleSave(item: Partial<RegulatoryItem>) {
    setError(null);
    try {
      if (editing === "new") { await createRegulatoryItem(item); }
      else if (selectedItem) { await updateRegulatoryItem(selectedItem.id, item); }
      setEditing(null);
      setSelectedItem(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Operation failed"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this regulatory item?")) return;
    try { await deleteRegulatoryItem(id); await refresh(); setSelectedItem(null); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); }
  }

  const tblCls = "overflow-x-auto rounded-lg border border-slate-200 bg-white";
  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const headCls = "text-base font-semibold text-slate-800 mb-2";
  const catBtnCls = (c: string) => clsx("px-2.5 py-1 text-xs rounded border transition-colors", activeCategory === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">FDA / Regulatory Strategy</h1>
          <p className="text-xs text-slate-500 mt-0.5">Structured regulatory roadmap for EndoScribe platform and PEPRisc clinical prediction module</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
        <span>This dashboard supports regulatory planning and does not provide legal or regulatory advice. All classifications and assessments require formal review by qualified regulatory counsel before submission.</span>
      </div>

      <ComplianceBanner />

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* A. Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MetricCard label="Total Items" value={regItems.length} />
        <MetricCard label="High Risk" value={highRisk.length} accent={highRisk.length > 0 ? "red" : "default"} />
        <MetricCard label="Needs Decision" value={needsDecision.length} accent={needsDecision.length > 0 ? "amber" : "default"} />
        <MetricCard label="Complete" value={complete.length} accent="green" />
        <MetricCard label="Pre-Sub Qs" value={regItems.filter(i => i.category === "FDA Pre-Submission").length} />
        <MetricCard label="FDA Tasks" value={fdaTasks.length} accent="amber" />
        <MetricCard label="Due 30d" value={dueSoon.length} accent="blue" />
        <MetricCard label="No Owner" value={noOwner.length} accent={noOwner.length > 0 ? "amber" : "default"} />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button className={catBtnCls("")} onClick={() => setActiveCategory("")}>All ({regItems.length})</button>
        {REGULATORY_CATEGORIES.map(c => {
          const count = byCategory.get(c)?.length ?? 0;
          if (count === 0) return null;
          return <button key={c} className={catBtnCls(c)} onClick={() => setActiveCategory(c)}>{c} ({count})</button>;
        })}
      </div>

      {/* Regulatory items table */}
      <section>
        <h2 className={headCls}>Regulatory Items {activeCategory && `-- ${activeCategory}`}</h2>
        <div className={tblCls}>
          <table className="w-full text-left">
            <thead><tr>
              <th className={thCls}>Title</th><th className={thCls}>Category</th><th className={thCls}>Risk</th>
              <th className={thCls}>Status</th><th className={thCls}>Priority</th><th className={thCls}>Owner</th>
              <th className={thCls}>Next Action</th>
              {userCanEdit && <th className={thCls + " text-right"}>Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className={tdCls + " font-medium text-slate-800 max-w-[250px]"}>{item.title}</td>
                  <td className={tdCls}>{item.category}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", riskColor[item.regulatory_risk] ?? riskColor.Unknown)}>{item.regulatory_risk}</span></td>
                  <td className={tdCls}><StatusBadge status={item.status} /></td>
                  <td className={tdCls}><PriorityBadge priority={item.priority} /></td>
                  <td className={tdCls}>{item.owner || "--"}</td>
                  <td className={tdCls + " max-w-[180px] truncate"}>{item.next_action || "--"}</td>
                  {userCanEdit && (
                    <td className={tdCls + " text-right"} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setSelectedItem(item); setEditing(item); }} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {displayItems.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">No regulatory items. {userCanEdit ? "Click Add Item to create one." : "Run migration to seed data."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* B. Intended-use matrix */}
      <section>
        <h2 className={headCls}>Intended-Use Risk Spectrum</h2>
        <p className="text-xs text-slate-500 mb-2">Regulatory risk increases as the system moves from documentation to prediction to clinician-facing decision support.</p>
        <div className={tblCls}>
          <table className="w-full text-left">
            <thead><tr>
              <th className={thCls}>Intended Use</th><th className={thCls}>User</th><th className={thCls}>Output</th>
              <th className={thCls}>Used for Care?</th><th className={thCls}>Risk Tier</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {INTENDED_USE_ROWS.map((r, i) => (
                <tr key={i}><td className={tdCls + " font-medium"}>{r.use}</td><td className={tdCls}>{r.user}</td>
                  <td className={tdCls}>{r.output}</td><td className={tdCls}>{r.care}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", riskColor[r.riskTier])}>{r.riskTier}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C. CDS assessment */}
      <section>
        <h2 className={headCls}>CDS / SaMD Assessment Questions</h2>
        <p className="text-xs text-slate-500 mb-2">21st Century Cures Act four-prong test for non-device CDS. Assess each question for EndoScribe and PEPRisc.</p>
        <div className={tblCls}>
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Question</th><th className={thCls}>Prong</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {CDS_QUESTIONS.map((q, i) => (
                <tr key={i}><td className={tdCls}>{q.q}</td><td className={tdCls}>{q.prong > 0 ? `Prong ${q.prong}` : "Context"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* D. Platform vs module */}
      <section>
        <h2 className={headCls}>Platform vs Module Classification</h2>
        <div className={tblCls}>
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Function</th><th className={thCls}>Type</th><th className={thCls}>Risk Tier</th><th className={thCls}>Evidence Needed</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {PLATFORM_ITEMS.map((p, i) => (
                <tr key={i}><td className={tdCls + " font-medium"}>{p.name}</td><td className={tdCls}>{p.type}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", riskColor[p.risk])}>{p.risk}</span></td>
                  <td className={tdCls}>{p.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* E. Linked FDA tasks */}
      {fdaTasks.length > 0 && (
        <section>
          <h2 className={headCls}>Linked Roadmap Tasks (High/Moderate FDA Relevance)</h2>
          <div className={tblCls}>
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>ID</th><th className={thCls}>Title</th><th className={thCls}>Owner</th><th className={thCls}>Status</th><th className={thCls}>Priority</th><th className={thCls}>Target</th><th className={thCls}>Decision</th><th className={thCls}>Next Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {fdaTasks.map(t => (
                  <tr key={t.id}><td className={tdCls + " font-mono"}>{t.id}</td><td className={tdCls + " font-medium max-w-[200px] truncate"}>{t.title}</td>
                    <td className={tdCls}>{t.owner}</td><td className={tdCls}><StatusBadge status={t.status} /></td>
                    <td className={tdCls}><PriorityBadge priority={t.priority} /></td><td className={tdCls}>{t.target_date ?? "--"}</td>
                    <td className={tdCls + " max-w-[150px] truncate"}>{t.decision_needed || "--"}</td><td className={tdCls + " max-w-[150px] truncate"}>{t.next_action || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* F. Warnings */}
      <section>
        <button onClick={() => setWarningsOpen(!warningsOpen)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />Regulatory Health Warnings ({warnings.length})
          {warningsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {warningsOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {warnings.length === 0 ? <p className="px-4 py-3 text-sm text-green-700">No warnings.</p> :
              warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
                  <span className="mt-0.5 shrink-0 h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-mono text-slate-500">{w.id}</span>
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
            <Df label="Regulatory Risk"><span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", riskColor[selectedItem.regulatory_risk] ?? riskColor.Unknown)}>{selectedItem.regulatory_risk}</span></Df>
            <Df label="Owner">{selectedItem.owner}</Df>
            <Df label="Due Date">{selectedItem.due_date}</Df>
            <Df label="Evidence Needed">{selectedItem.evidence_needed}</Df>
            <Df label="Current Evidence">{selectedItem.current_evidence}</Df>
            <Df label="Decision Needed">{selectedItem.decision_needed}</Df>
            <Df label="Next Action">{selectedItem.next_action}</Df>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-12">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <RegulatoryItemForm item={editing === "new" ? null : editing as Partial<RegulatoryItem>} onSave={handleSave} onCancel={() => { setEditing(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[10px] font-medium text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd></div>;
}
