"use client";

import { useState, useMemo } from "react";
import type { ValidationItem } from "@/lib/roadmapTypes";
import { VALIDATION_DOMAINS, VALIDATION_ITEM_STATUSES, VALIDATION_METRIC_TYPES, VALIDATION_DATASET_STAGES, EVIDENCE_STAGES, PRIORITIES } from "@/lib/roadmapTypes";

interface Props {
  item: Partial<ValidationItem> | null;
  onSave: (item: Partial<ValidationItem>) => void;
  onCancel: () => void;
}

function blank(): Partial<ValidationItem> {
  return {
    title: "", description: "", validation_domain: "ASR / Transcription",
    status: "Not started", priority: "Medium", owner: "", due_date: null,
    metric_type: "Accuracy", metric_name: "", target_threshold: "",
    current_result: "", sample_size: "", dataset_stage: "Development dataset",
    evidence_stage: "Development", failure_mode: "", clinical_materiality: "",
    gap: "", decision_needed: "", next_action: "", notes: "",
    related_task_ids: [], related_decision_ids: [],
  };
}

export default function ValidationItemForm({ item, onSave, onCancel }: Props) {
  const initial = useMemo(() => item ?? blank(), [item]);
  const [form, setForm] = useState<Partial<ValidationItem>>(initial);
  const isNew = !item?.id;

  function set(key: string, value: unknown) { setForm(prev => ({ ...prev, [key]: value })); }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Validation Item" : "Edit Validation Item"}</h3>

      <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required /></div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Validation Domain</label>
          <select className={inputCls} value={form.validation_domain ?? ""} onChange={e => set("validation_domain", e.target.value)} required>
            {VALIDATION_DOMAINS.map(d => <option key={d}>{d}</option>)}
          </select></div>
        <div><label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status ?? ""} onChange={e => set("status", e.target.value)}>
            {VALIDATION_ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority ?? "Medium"} onChange={e => set("priority", e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select></div>
        <div><label className={labelCls}>Owner</label><input className={inputCls} value={form.owner ?? ""} onChange={e => set("owner", e.target.value)} /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" className={inputCls} value={form.due_date ?? ""} onChange={e => set("due_date", e.target.value || null)} /></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><label className={labelCls}>Metric Type</label>
          <select className={inputCls} value={form.metric_type ?? ""} onChange={e => set("metric_type", e.target.value)}>
            {VALIDATION_METRIC_TYPES.map(m => <option key={m}>{m}</option>)}
          </select></div>
        <div><label className={labelCls}>Metric Name</label><input className={inputCls} value={form.metric_name ?? ""} onChange={e => set("metric_name", e.target.value)} placeholder="e.g., WER, F1, AUC" /></div>
        <div><label className={labelCls}>Target Threshold</label><input className={inputCls} value={form.target_threshold ?? ""} onChange={e => set("target_threshold", e.target.value)} placeholder="e.g., > 0.85, < 10%" /></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><label className={labelCls}>Current Result</label><input className={inputCls} value={form.current_result ?? ""} onChange={e => set("current_result", e.target.value)} /></div>
        <div><label className={labelCls}>Sample Size</label><input className={inputCls} value={form.sample_size ?? ""} onChange={e => set("sample_size", e.target.value)} /></div>
        <div><label className={labelCls}>Dataset Stage</label>
          <select className={inputCls} value={form.dataset_stage ?? ""} onChange={e => set("dataset_stage", e.target.value)}>
            <option value="">Select...</option>
            {VALIDATION_DATASET_STAGES.map(d => <option key={d}>{d}</option>)}
          </select></div>
      </div>

      <div><label className={labelCls}>Evidence Stage</label>
        <select className={inputCls + " w-64"} value={form.evidence_stage ?? ""} onChange={e => set("evidence_stage", e.target.value)}>
          <option value="">Select...</option>
          {EVIDENCE_STAGES.map(s => <option key={s}>{s}</option>)}
        </select></div>

      <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div><label className={labelCls}>Gap</label><input className={inputCls} value={form.gap ?? ""} onChange={e => set("gap", e.target.value)} /></div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Decision Needed</label><input className={inputCls} value={form.decision_needed ?? ""} onChange={e => set("decision_needed", e.target.value)} /></div>
        <div><label className={labelCls}>Next Action</label><input className={inputCls} value={form.next_action ?? ""} onChange={e => set("next_action", e.target.value)} /></div>
      </div>

      <div><label className={labelCls}>Related Task IDs (comma-separated)</label><input className={inputCls} value={(form.related_task_ids ?? []).join(", ")} onChange={e => set("related_task_ids", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>

      <div><label className={labelCls}>Notes</label><textarea className={inputCls + " h-14"} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>

      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Do not enter PHI, patient-level data, audio files, or transcripts.</div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save Changes"}</button>
      </div>
    </form>
  );
}
