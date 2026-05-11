"use client";

import { useState, useMemo } from "react";
import type { GovernanceItem } from "@/lib/roadmapTypes";
import { GOVERNANCE_CATEGORIES, GOVERNANCE_ITEM_STATUSES, HIPAA_RISK_LEVELS, IRB_STATUS_VALUES, HOPKINS_IT_STATUS_VALUES, PRIORITIES } from "@/lib/roadmapTypes";

interface Props {
  item: Partial<GovernanceItem> | null;
  onSave: (item: Partial<GovernanceItem>) => void;
  onCancel: () => void;
}

function blank(): Partial<GovernanceItem> {
  return {
    title: "", description: "", category: "IRB Amendment", status: "Not started",
    priority: "Medium", owner: "", due_date: null, phi_involved: false,
    data_type: "", data_location: "", compute_location: "",
    irb_status: "Not assessed", hipaa_risk: "Unknown", hopkins_it_status: "Not assessed",
    approval_needed: "", current_state: "", gap: "",
    decision_needed: "", next_action: "", notes: "",
    related_task_ids: [], related_decision_ids: [],
  };
}

export default function GovernanceItemForm({ item, onSave, onCancel }: Props) {
  const initial = useMemo(() => item ?? blank(), [item]);
  const [form, setForm] = useState<Partial<GovernanceItem>>(initial);
  const isNew = !item?.id;

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Governance Item" : "Edit Governance Item"}</h3>

      <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required /></div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category ?? ""} onChange={e => set("category", e.target.value)} required>
            {GOVERNANCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select></div>
        <div><label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status ?? "Not started"} onChange={e => set("status", e.target.value)}>
            {GOVERNANCE_ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
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
        <div><label className={labelCls}>HIPAA Risk</label>
          <select className={inputCls} value={form.hipaa_risk ?? "Unknown"} onChange={e => set("hipaa_risk", e.target.value)}>
            {HIPAA_RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select></div>
        <div><label className={labelCls}>IRB Status</label>
          <select className={inputCls} value={form.irb_status ?? "Not assessed"} onChange={e => set("irb_status", e.target.value)}>
            {IRB_STATUS_VALUES.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className={labelCls}>Hopkins IT Status</label>
          <select className={inputCls} value={form.hopkins_it_status ?? "Not assessed"} onChange={e => set("hopkins_it_status", e.target.value)}>
            {HOPKINS_IT_STATUS_VALUES.map(s => <option key={s}>{s}</option>)}
          </select></div>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.phi_involved ?? false} onChange={e => set("phi_involved", e.target.checked)} className="rounded" />
          PHI involved
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Data Type</label><input className={inputCls} value={form.data_type ?? ""} onChange={e => set("data_type", e.target.value)} placeholder="Audio, transcript, variables..." /></div>
        <div><label className={labelCls}>Data Location</label><input className={inputCls} value={form.data_location ?? ""} onChange={e => set("data_location", e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Compute Location</label><input className={inputCls} value={form.compute_location ?? ""} onChange={e => set("compute_location", e.target.value)} /></div>
        <div><label className={labelCls}>Approval Needed</label><input className={inputCls} value={form.approval_needed ?? ""} onChange={e => set("approval_needed", e.target.value)} /></div>
      </div>

      <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div><label className={labelCls}>Current State</label><input className={inputCls} value={form.current_state ?? ""} onChange={e => set("current_state", e.target.value)} /></div>
      <div><label className={labelCls}>Gap</label><input className={inputCls} value={form.gap ?? ""} onChange={e => set("gap", e.target.value)} /></div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Decision Needed</label><input className={inputCls} value={form.decision_needed ?? ""} onChange={e => set("decision_needed", e.target.value)} /></div>
        <div><label className={labelCls}>Next Action</label><input className={inputCls} value={form.next_action ?? ""} onChange={e => set("next_action", e.target.value)} /></div>
      </div>

      <div><label className={labelCls}>Related Task IDs (comma-separated)</label><input className={inputCls} value={(form.related_task_ids ?? []).join(", ")} onChange={e => set("related_task_ids", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>

      <div><label className={labelCls}>Notes</label><textarea className={inputCls + " h-14"} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>

      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Do not enter PHI, patient identifiers, or clinical data.</div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save Changes"}</button>
      </div>
    </form>
  );
}
