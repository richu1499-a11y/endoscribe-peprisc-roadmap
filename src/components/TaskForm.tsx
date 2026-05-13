"use client";

import { useState, useMemo } from "react";
import type { RoadmapTask, Profile } from "@/lib/roadmapTypes";
import { TASK_STATUSES, PRIORITIES, REGULATORY_LEVELS, EVIDENCE_STAGES } from "@/lib/roadmapTypes";
import { ChevronDown, ChevronRight } from "lucide-react";

interface WorkspaceOption { slug: string; title: string }

interface Props {
  task: RoadmapTask | null;
  workspaces?: WorkspaceOption[];
  profiles?: Profile[];
  currentAssigneeIds?: string[];
  defaultWorkspace?: string;
  onSave: (task: RoadmapTask, assigneeIds?: string[]) => void;
  onCancel: () => void;
}

function blank(defaultWs?: string): RoadmapTask {
  return {
    id: "", title: "", description: "", workstream_id: "", owner: "",
    contributors: [], status: "Not started", priority: "Medium",
    start_date: null, target_date: null,
    dependencies: [], deliverables: [], blockers: [], risks: [],
    decision_needed: "", regulatory_relevance: "None", hipaa_relevance: "None",
    evidence_stage: "Concept", gsd_goal: "", next_action: "", notes: "",
    workspace: defaultWs ?? "",
  };
}

export default function TaskForm({ task, workspaces, profiles, currentAssigneeIds, defaultWorkspace, onSave, onCancel }: Props) {
  const initial = useMemo(() => task ?? blank(defaultWorkspace), [task, defaultWorkspace]);
  const [form, setForm] = useState<RoadmapTask>(initial);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(currentAssigneeIds ?? []);
  const [showMore, setShowMore] = useState(false);
  const isNew = !task;

  function set<K extends keyof RoadmapTask>(key: K, value: RoadmapTask[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleAssignee(uid: string) {
    setSelectedAssignees(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalForm = isNew && !form.id ? { ...form, id: `TASK-${Date.now().toString(36).toUpperCase()}` } : form;
    onSave(finalForm, profiles ? selectedAssignees : undefined);
  }

  const c = "app-field w-full rounded-lg px-3 py-2 text-sm";
  const l = "block text-xs font-medium text-[var(--muted)] mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text)]">{isNew ? "New Task" : "Edit Task"}</h3>

      <div>
        <label className={l}>Task name *</label>
        <input className={c} value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?" autoFocus required />
      </div>

      <div>
        <label className={l}>Description</label>
        <textarea className={c + " h-16"} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Add details..." />
      </div>

      {workspaces && workspaces.length > 0 && (
        <div>
          <label className={l}>Workspace</label>
          <select className={c} value={form.workspace ?? ""} onChange={e => set("workspace" as keyof RoadmapTask, e.target.value as never)}>
            <option value="">Select workspace...</option>
            {workspaces.map(ws => <option key={ws.slug} value={ws.slug}>{ws.title}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div><label className={l}>Status</label><select className={c} value={form.status} onChange={e => set("status", e.target.value as RoadmapTask["status"])}>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className={l}>Priority</label><select className={c} value={form.priority} onChange={e => set("priority", e.target.value as RoadmapTask["priority"])}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
      </div>

      {profiles && profiles.length > 0 && (
        <div>
          <label className={l}>Assignee</label>
          <div className="max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
            {profiles.map(p => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]">
                <input type="checkbox" checked={selectedAssignees.includes(p.id)} onChange={() => toggleAssignee(p.id)} className="rounded" />
                {p.full_name || p.email}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div><label className={l}>Start date</label><input type="date" className={c} value={form.start_date ?? ""} onChange={e => set("start_date", e.target.value || null)} /></div>
        <div><label className={l}>Due date</label><input type="date" className={c} value={form.target_date ?? ""} onChange={e => set("target_date", e.target.value || null)} /></div>
      </div>

      <button type="button" onClick={() => setShowMore(!showMore)} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)]">
        {showMore ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        More options
      </button>

      {showMore && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div><label className={l}>Notes</label><textarea className={c + " h-14"} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div><label className={l}>Next action</label><input className={c} value={form.next_action} onChange={e => set("next_action", e.target.value)} /></div>
          <div><label className={l}>Owner</label><input className={c} value={form.owner} onChange={e => set("owner", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={l}>FDA</label><select className={c} value={form.regulatory_relevance} onChange={e => set("regulatory_relevance", e.target.value as RoadmapTask["regulatory_relevance"])}>{REGULATORY_LEVELS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label className={l}>HIPAA</label><select className={c} value={form.hipaa_relevance} onChange={e => set("hipaa_relevance", e.target.value as RoadmapTask["hipaa_relevance"])}>{REGULATORY_LEVELS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label className={l}>Evidence</label><select className={c} value={form.evidence_stage} onChange={e => set("evidence_stage", e.target.value as RoadmapTask["evidence_stage"])}>{EVIDENCE_STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          {isNew && <div><label className={l}>Task ID (auto if blank)</label><input className={c} value={form.id} onChange={e => set("id", e.target.value)} placeholder="Leave blank" /></div>}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-strong)]">Cancel</button>
        <button type="submit" className="app-button-primary rounded-lg px-4 py-2 text-sm font-medium">{isNew ? "Create Task" : "Save Changes"}</button>
      </div>
    </form>
  );
}
