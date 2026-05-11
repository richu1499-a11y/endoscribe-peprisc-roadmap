"use client";

import { useState, useMemo } from "react";
import type { RoadmapTask, Workstream } from "@/lib/roadmapTypes";
import { TASK_STATUSES, PRIORITIES, REGULATORY_LEVELS, EVIDENCE_STAGES } from "@/lib/roadmapTypes";

interface Props {
  task: RoadmapTask | null;        // null = create mode
  workstreams: Workstream[];
  onSave: (task: RoadmapTask) => void;
  onCancel: () => void;
}

function blank(): RoadmapTask {
  return {
    id: "", title: "", description: "", workstream_id: "", owner: "",
    contributors: [], status: "Not started", priority: "Medium",
    start_date: null, target_date: null,
    dependencies: [], deliverables: [], blockers: [], risks: [],
    decision_needed: "", regulatory_relevance: "None", hipaa_relevance: "None",
    evidence_stage: "Concept", gsd_goal: "", next_action: "", notes: "",
  };
}

export default function TaskForm({ task, workstreams, onSave, onCancel }: Props) {
  const initial = useMemo(() => task ?? blank(), [task]);
  const [form, setForm] = useState<RoadmapTask>(initial);

  const isNew = !task;

  function set<K extends keyof RoadmapTask>(key: K, value: RoadmapTask[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Task" : `Edit ${form.id}`}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Task ID</label>
          <input className={inputCls} value={form.id} onChange={e => set("id", e.target.value)} required disabled={!isNew} />
        </div>
        <div>
          <label className={labelCls}>Workstream</label>
          <select className={inputCls} value={form.workstream_id} onChange={e => set("workstream_id", e.target.value)} required>
            <option value="">Select...</option>
            {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} required />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea className={inputCls + " h-20"} value={form.description} onChange={e => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Owner</label>
          <input className={inputCls} value={form.owner} onChange={e => set("owner", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value as RoadmapTask["status"])}>
            {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority} onChange={e => set("priority", e.target.value as RoadmapTask["priority"])}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date</label>
          <input type="date" className={inputCls} value={form.start_date ?? ""} onChange={e => set("start_date", e.target.value || null)} />
        </div>
        <div>
          <label className={labelCls}>Target Date</label>
          <input type="date" className={inputCls} value={form.target_date ?? ""} onChange={e => set("target_date", e.target.value || null)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>FDA Relevance</label>
          <select className={inputCls} value={form.regulatory_relevance} onChange={e => set("regulatory_relevance", e.target.value as RoadmapTask["regulatory_relevance"])}>
            {REGULATORY_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>HIPAA Relevance</label>
          <select className={inputCls} value={form.hipaa_relevance} onChange={e => set("hipaa_relevance", e.target.value as RoadmapTask["hipaa_relevance"])}>
            {REGULATORY_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Evidence Stage</label>
          <select className={inputCls} value={form.evidence_stage} onChange={e => set("evidence_stage", e.target.value as RoadmapTask["evidence_stage"])}>
            {EVIDENCE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Next Action</label>
        <input className={inputCls} value={form.next_action} onChange={e => set("next_action", e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>GSD Goal</label>
        <input className={inputCls} value={form.gsd_goal} onChange={e => set("gsd_goal", e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls + " h-16"} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create Task" : "Save Changes"}</button>
      </div>
    </form>
  );
}
