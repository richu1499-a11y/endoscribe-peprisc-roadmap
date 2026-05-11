"use client";

import { useState, useMemo } from "react";
import type { RegulatoryItem } from "@/lib/roadmapTypes";
import { REGULATORY_CATEGORIES, REGULATORY_ITEM_STATUSES, REGULATORY_RISK_LEVELS, PRIORITIES } from "@/lib/roadmapTypes";

interface Props {
  item: Partial<RegulatoryItem> | null;
  onSave: (item: Partial<RegulatoryItem>) => void;
  onCancel: () => void;
}

function blank(): Partial<RegulatoryItem> {
  return {
    title: "", description: "", category: "Intended Use", status: "Not started",
    priority: "Medium", owner: "", due_date: null, regulatory_risk: "Unknown",
    evidence_needed: "", current_evidence: "", decision_needed: "",
    next_action: "", notes: "", related_task_ids: [], related_decision_ids: [],
  };
}

export default function RegulatoryItemForm({ item, onSave, onCancel }: Props) {
  const initial = useMemo(() => item ?? blank(), [item]);
  const [form, setForm] = useState<Partial<RegulatoryItem>>(initial);
  const isNew = !item?.id;

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Regulatory Item" : "Edit Regulatory Item"}</h3>

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category ?? ""} onChange={e => set("category", e.target.value)} required>
            {REGULATORY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Regulatory Risk</label>
          <select className={inputCls} value={form.regulatory_risk ?? "Unknown"} onChange={e => set("regulatory_risk", e.target.value)}>
            {REGULATORY_RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status ?? "Not started"} onChange={e => set("status", e.target.value)}>
            {REGULATORY_ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority ?? "Medium"} onChange={e => set("priority", e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Owner</label>
          <input className={inputCls} value={form.owner ?? ""} onChange={e => set("owner", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea className={inputCls + " h-16"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Evidence Needed</label>
          <textarea className={inputCls + " h-14"} value={form.evidence_needed ?? ""} onChange={e => set("evidence_needed", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Current Evidence</label>
          <textarea className={inputCls + " h-14"} value={form.current_evidence ?? ""} onChange={e => set("current_evidence", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Decision Needed</label>
          <input className={inputCls} value={form.decision_needed ?? ""} onChange={e => set("decision_needed", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Next Action</label>
          <input className={inputCls} value={form.next_action ?? ""} onChange={e => set("next_action", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Due Date</label>
        <input type="date" className={inputCls + " w-48"} value={form.due_date ?? ""} onChange={e => set("due_date", e.target.value || null)} />
      </div>

      <div>
        <label className={labelCls}>Related Task IDs (comma-separated)</label>
        <input className={inputCls} value={(form.related_task_ids ?? []).join(", ")} onChange={e => set("related_task_ids", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls + " h-14"} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
      </div>

      <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Do not enter PHI, patient identifiers, or clinical data.
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save Changes"}</button>
      </div>
    </form>
  );
}
