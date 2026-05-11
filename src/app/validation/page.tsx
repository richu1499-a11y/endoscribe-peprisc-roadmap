"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getTasks, getValidationItems, createValidationItem, updateValidationItem, deleteValidationItem } from "@/lib/roadmapStore";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { RoadmapTask, ValidationItem } from "@/lib/roadmapTypes";
import { VALIDATION_DOMAINS } from "@/lib/roadmapTypes";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import ValidationItemForm from "@/components/ValidationItemForm";
import { clsx } from "clsx";
import { Plus, AlertTriangle, ChevronDown, ChevronUp, X, ShieldAlert } from "lucide-react";

// Evidence ladder levels
const EVIDENCE_LADDER = [
  { level: 1, label: "Audio capture reliability", domains: ["Audio Capture"] },
  { level: 2, label: "ASR / transcription accuracy", domains: ["ASR / Transcription"] },
  { level: 3, label: "Speaker diarization", domains: ["Speaker Diarization"] },
  { level: 4, label: "Variable extraction", domains: ["Variable Extraction"] },
  { level: 5, label: "PEPRisc risk-output agreement", domains: ["PEPRisc Output"] },
  { level: 6, label: "Workflow feasibility", domains: ["Workflow Feasibility"] },
  { level: 7, label: "Failure-mode and clinical materiality", domains: ["Failure Mode / Safety", "Clinical Materiality"] },
  { level: 8, label: "Prospective shadow validation", domains: ["Prospective Shadow Validation"] },
  { level: 9, label: "Clinician-facing evaluation", domains: [] },
  { level: 10, label: "Multicenter / regulatory-ready evidence", domains: [] },
];

// Failure-mode categories
const FAILURE_MODES = [
  { mode: "Audio capture failure", description: "Microphone malfunction, ambient noise overwhelming signal", severity: "Medium", detection: "Signal quality check" },
  { mode: "Transcription error", description: "Incorrect words in transcript", severity: "Medium", detection: "WER/CER metrics" },
  { mode: "Medical terminology error", description: "ERCP-specific terms missed or wrong", severity: "High", detection: "Terminology error rate" },
  { mode: "Wrong speaker attribution", description: "Non-endoscopist speech attributed to primary", severity: "High", detection: "Diarization accuracy" },
  { mode: "Missing PEPRisc variable", description: "Required variable not extracted", severity: "High", detection: "Missing-variable rate" },
  { mode: "Wrong variable extraction", description: "Variable present but incorrectly valued", severity: "High", detection: "Sensitivity/specificity" },
  { mode: "Delayed output", description: "Risk score not available in useful timeframe", severity: "Medium", detection: "Latency measurement" },
  { mode: "Wrong risk output", description: "PEPRisc score materially discordant from ground truth", severity: "Critical", detection: "Bland-Altman, clinical review" },
  { mode: "Clinically material discordance", description: "Risk category changes clinical decision", severity: "Critical", detection: "Expert review classification" },
  { mode: "Workflow interruption", description: "System failure during procedure", severity: "Medium", detection: "Completion rate" },
  { mode: "Governance failure", description: "PHI leakage, unapproved storage/compute", severity: "Critical", detection: "Audit trail review" },
];

// Dataset readiness rows
const DATASET_ROWS = [
  { item: "Existing 35-40 recordings cataloged", tasks: ["DATA-001"], stage: "Existing recordings" },
  { item: "10 highest-quality recordings curated", tasks: ["DATA-002"], stage: "Curated 10-case set" },
  { item: "Ground-truth procedure notes linked", tasks: ["DATA-003"], stage: "Curated 10-case set" },
  { item: "PEPRisc variables manually abstracted", tasks: ["DATA-003", "PEP-004"], stage: "Curated 10-case set" },
  { item: "Recording quality labels complete", tasks: ["DATA-004"], stage: "Development dataset" },
  { item: "De-identified metadata table created", tasks: ["DATA-005"], stage: "Development dataset" },
  { item: "Prospective shadow cohort defined", tasks: ["CLIN-001", "VALID-005"], stage: "Prospective shadow cohort" },
  { item: "Multicenter expansion pathway defined", tasks: ["FUTURE-004"], stage: "Future dataset" },
];

export default function ValidationPage() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [editing, setEditing] = useState<Partial<ValidationItem> | null | "new">(null);
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState("");

  const refresh = useCallback(async () => {
    const [vi, t] = await Promise.all([getValidationItems(), getTasks()]);
    setItems(vi); setTasks(t);
  }, []);

  useEffect(() => {
    const init = async () => { await refresh(); if (isSupabaseConfigured) { const r = await getCurrentRole(); setUserCanEdit(checkCanEdit(r)); } };
    init();
  }, [refresh]);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const day30 = useMemo(() => new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10), [now]);

  // Metrics
  const inProgress = items.filter(i => i.status === "In progress" || i.status === "Analysis planned");
  const blocked = items.filter(i => i.status === "Blocked" || i.status === "Data needed");
  const complete = items.filter(i => i.status === "Complete" || i.status === "Analysis complete");
  const noOwner = items.filter(i => !i.owner);
  const highPri = items.filter(i => i.priority === "Critical" || i.priority === "High");
  const dueSoon = items.filter(i => i.due_date && i.due_date <= day30 && i.due_date >= today && i.status !== "Complete");
  const domains = new Set(items.map(i => i.validation_domain));

  // Group by domain
  const byDomain = useMemo(() => {
    const m = new Map<string, ValidationItem[]>();
    for (const i of items) { const l = m.get(i.validation_domain) ?? []; l.push(i); m.set(i.validation_domain, l); }
    return m;
  }, [items]);

  // Validation-relevant tasks
  const valTasks = tasks.filter(t =>
    t.evidence_stage === "Internal validation" || t.evidence_stage === "Prospective validation" ||
    t.id.startsWith("VALID-") || t.id.startsWith("DATA-") || t.id.startsWith("ASR-") ||
    t.id.startsWith("DIAR-") || t.id.startsWith("AUDIO-") || t.id.startsWith("PEP-")
  );

  // Warnings
  const warnings = useMemo(() => {
    const w: { id: string; msg: string }[] = [];
    for (const i of items) {
      if (!i.owner) w.push({ id: i.title, msg: "No owner" });
      if (!i.metric_name) w.push({ id: i.title, msg: "No metric_name defined" });
      if (!i.target_threshold) w.push({ id: i.title, msg: "No target_threshold" });
      if (!i.current_result && (i.status === "Complete" || i.status === "Analysis complete")) w.push({ id: i.title, msg: "Marked complete but no current_result" });
      if ((i.priority === "Critical" || i.priority === "High") && !i.due_date) w.push({ id: i.title, msg: "High-priority without due date" });
      if (!i.next_action) w.push({ id: i.title, msg: "No next_action" });
      if (i.validation_domain === "Prospective Shadow Validation" && !i.dataset_stage) w.push({ id: i.title, msg: "Prospective item without dataset_stage" });
      if (i.validation_domain === "Failure Mode / Safety" && !i.notes) w.push({ id: i.title, msg: "Failure-mode item without notes" });
    }
    return w;
  }, [items]);

  const displayItems = activeDomain ? items.filter(i => i.validation_domain === activeDomain) : items;

  async function handleSave(item: Partial<ValidationItem>) {
    setError(null);
    try {
      if (editing === "new") await createValidationItem(item);
      else if (selectedItem) await updateValidationItem(selectedItem.id, item);
      setEditing(null); setSelectedItem(null); await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this validation item?")) return;
    try { await deleteValidationItem(id); await refresh(); setSelectedItem(null); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const headCls = "text-base font-semibold text-slate-800 mb-2";
  const domBtnCls = (d: string) => clsx("px-2 py-1 text-xs rounded border transition-colors", activeDomain === d ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50");

  const statusIcon = (s: string) => {
    if (s === "Complete" || s === "Analysis complete") return <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />;
    if (s === "In progress" || s === "Analysis planned") return <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />;
    if (s === "Data needed" || s === "Blocked") return <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />;
    return <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" />;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Validation Science</h1>
          <p className="text-xs text-slate-500 mt-0.5">Evidence-generation dashboard for audio, ASR, diarization, extraction, PEPRisc agreement, feasibility, failure modes, and shadow validation</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add Item</button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
        <span>This dashboard tracks evidence planning metadata. It does not store patient-level validation data, audio files, transcripts, or clinical outcomes. Do not enter PHI.</span>
      </div>

      <ComplianceBanner />
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MetricCard label="Total Items" value={items.length} />
        <MetricCard label="In Progress" value={inProgress.length} accent="blue" />
        <MetricCard label="Blocked/Data" value={blocked.length} accent={blocked.length > 0 ? "red" : "default"} />
        <MetricCard label="Complete" value={complete.length} accent="green" />
        <MetricCard label="No Owner" value={noOwner.length} accent={noOwner.length > 0 ? "amber" : "default"} />
        <MetricCard label="High Priority" value={highPri.length} accent="amber" />
        <MetricCard label="Due 30d" value={dueSoon.length} accent="blue" />
        <MetricCard label="Domains" value={domains.size} />
      </div>

      {/* Domain filter */}
      <div className="flex flex-wrap gap-1.5">
        <button className={domBtnCls("")} onClick={() => setActiveDomain("")}>All ({items.length})</button>
        {VALIDATION_DOMAINS.map(d => {
          const n = byDomain.get(d)?.length ?? 0;
          return n > 0 ? <button key={d} className={domBtnCls(d)} onClick={() => setActiveDomain(d)}>{d} ({n})</button> : null;
        })}
      </div>

      {/* Validation items table */}
      <section>
        <h2 className={headCls}>Validation Items {activeDomain && `-- ${activeDomain}`}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr>
              <th className={thCls}>Title</th><th className={thCls}>Domain</th><th className={thCls}>Metric</th>
              <th className={thCls}>Target</th><th className={thCls}>Result</th><th className={thCls}>Dataset</th>
              <th className={thCls}>Status</th><th className={thCls}>Priority</th>
              <th className={thCls}>Next Action</th>
              {userCanEdit && <th className={thCls + " text-right"}>Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className={tdCls + " font-medium text-slate-800 max-w-[200px]"}>{item.title}</td>
                  <td className={tdCls + " text-[10px]"}>{item.validation_domain}</td>
                  <td className={tdCls}>{item.metric_name || "--"}</td>
                  <td className={tdCls + " max-w-[100px] truncate"}>{item.target_threshold || "--"}</td>
                  <td className={tdCls}>{item.current_result || "--"}</td>
                  <td className={tdCls + " text-[10px]"}>{item.dataset_stage || "--"}</td>
                  <td className={tdCls}><StatusBadge status={item.status} /></td>
                  <td className={tdCls}><PriorityBadge priority={item.priority} /></td>
                  <td className={tdCls + " max-w-[130px] truncate"}>{item.next_action || "--"}</td>
                  {userCanEdit && (
                    <td className={tdCls + " text-right"} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setSelectedItem(item); setEditing(item); }} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {displayItems.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">No validation items. {userCanEdit ? "Click Add Item." : "Run migration to seed data."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evidence ladder */}
      <section>
        <h2 className={headCls}>Evidence Ladder</h2>
        <p className="text-xs text-slate-500 mb-2">Structured progression from component validation to regulatory-ready evidence.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Level</th><th className={thCls}>Evidence Layer</th><th className={thCls}>Items</th><th className={thCls}>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {EVIDENCE_LADDER.map(lev => {
                const levItems = items.filter(i => lev.domains.includes(i.validation_domain));
                const done = levItems.filter(i => i.status === "Complete" || i.status === "Analysis complete").length;
                const total = levItems.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <tr key={lev.level}>
                    <td className={tdCls + " font-mono font-semibold text-indigo-600"}>{lev.level}</td>
                    <td className={tdCls + " font-medium"}>{lev.label}</td>
                    <td className={tdCls}>{total > 0 ? `${done}/${total}` : <span className="text-slate-400">--</span>}</td>
                    <td className={tdCls}>
                      {total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                          <span className="text-[10px] text-slate-500">{pct}%</span>
                        </div>
                      ) : <span className="text-[10px] text-slate-400">Future</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dataset readiness */}
      <section>
        <h2 className={headCls}>Dataset Readiness</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Dataset Milestone</th><th className={thCls}>Related Tasks</th><th className={thCls}>Stage</th><th className={thCls}>Task Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {DATASET_ROWS.map((r, i) => {
                const relTasks = r.tasks.map(tid => tasks.find(t => t.id === tid)).filter(Boolean);
                const allDone = relTasks.length > 0 && relTasks.every(t => t!.status === "Complete");
                return (
                  <tr key={i}>
                    <td className={tdCls + " font-medium"}>{r.item}</td>
                    <td className={tdCls + " font-mono text-[10px]"}>{r.tasks.join(", ")}</td>
                    <td className={tdCls + " text-[10px]"}>{r.stage}</td>
                    <td className={tdCls}>{statusIcon(allDone ? "Complete" : relTasks.length > 0 ? relTasks[0]!.status : "Not started")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Failure-mode taxonomy */}
      <section>
        <h2 className={headCls}>Failure-Mode and Safety Taxonomy</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Failure Mode</th><th className={thCls}>Description</th><th className={thCls}>Severity</th><th className={thCls}>Detection</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {FAILURE_MODES.map((fm, i) => (
                <tr key={i}>
                  <td className={tdCls + " font-medium"}>{fm.mode}</td>
                  <td className={tdCls + " max-w-[250px]"}>{fm.description}</td>
                  <td className={tdCls}><span className={clsx("rounded px-1 py-0.5 text-[10px] font-medium",
                    fm.severity === "Critical" ? "text-red-700 bg-red-50" : fm.severity === "High" ? "text-amber-700 bg-amber-50" : "text-slate-600 bg-slate-100"
                  )}>{fm.severity}</span></td>
                  <td className={tdCls}>{fm.detection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Linked tasks */}
      {valTasks.length > 0 && (
        <section>
          <h2 className={headCls}>Linked Roadmap Tasks (Validation / Data / Audio / ASR / PEPRisc)</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>ID</th><th className={thCls}>Title</th><th className={thCls}>Evidence</th><th className={thCls}>Status</th><th className={thCls}>Priority</th><th className={thCls}>Target</th><th className={thCls}>Next Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {valTasks.slice(0, 30).map(t => (
                  <tr key={t.id}><td className={tdCls + " font-mono"}>{t.id}</td>
                    <td className={tdCls + " font-medium max-w-[200px] truncate"}>{t.title}</td>
                    <td className={tdCls + " text-[10px]"}>{t.evidence_stage}</td>
                    <td className={tdCls}><StatusBadge status={t.status} /></td>
                    <td className={tdCls}><PriorityBadge priority={t.priority} /></td>
                    <td className={tdCls}>{t.target_date ?? "--"}</td>
                    <td className={tdCls + " max-w-[130px] truncate"}>{t.next_action || "--"}</td>
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
          <AlertTriangle className="h-4 w-4 text-amber-500" />Validation Health Warnings ({warnings.length})
          {warningsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {warningsOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {warnings.length === 0 ? <p className="px-4 py-3 text-sm text-green-700">No warnings.</p> :
              warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
                  <span className="mt-0.5 shrink-0 h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-slate-500 max-w-[200px] truncate">{w.id}</span>
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
            <span className="text-xs uppercase text-slate-500">{selectedItem.validation_domain}</span>
            <button onClick={() => setSelectedItem(null)} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <h2 className="text-base font-semibold text-slate-900">{selectedItem.title}</h2>
            <div className="flex gap-2"><StatusBadge status={selectedItem.status} /><PriorityBadge priority={selectedItem.priority} /></div>
            <p className="text-sm text-slate-600">{selectedItem.description}</p>
            <Df label="Metric Type">{selectedItem.metric_type}</Df>
            <Df label="Metric Name">{selectedItem.metric_name}</Df>
            <Df label="Target Threshold">{selectedItem.target_threshold}</Df>
            <Df label="Current Result">{selectedItem.current_result}</Df>
            <Df label="Sample Size">{selectedItem.sample_size}</Df>
            <Df label="Dataset Stage">{selectedItem.dataset_stage}</Df>
            <Df label="Evidence Stage">{selectedItem.evidence_stage}</Df>
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
            <ValidationItemForm item={editing === "new" ? null : editing as Partial<ValidationItem>} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[10px] font-medium text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd></div>;
}
