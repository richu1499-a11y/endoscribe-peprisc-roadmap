"use client";

import type { RoadmapTask, Workstream, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { wsLabel } from "@/lib/roadmapUtils";
import { X } from "lucide-react";

interface Props {
  task: RoadmapTask | TaskWithAssignees;
  workstreams: Workstream[];
  onClose: () => void;
  onEdit: (task: RoadmapTask) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd>
    </div>
  );
}

export default function TaskDetailDrawer({ task, workstreams, onClose, onEdit }: Props) {
  const assignees: Profile[] = "assignees" in task ? task.assignees : [];

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[420px] flex-col border-l border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-sm font-bold text-slate-800">{task.id}</h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{task.title}</h2>
        <p className="text-sm text-slate-600">{task.description}</p>

        <div className="flex gap-2 pt-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>

        <dl className="divide-y divide-slate-100 pt-3">
          <Field label="Workstream">{wsLabel(workstreams, task.workstream_id)}</Field>
          <Field label="Owner">{task.owner}</Field>
          <Field label="Assignees">
            {assignees.length > 0
              ? assignees.map(p => p.full_name || p.email).join(", ")
              : null}
          </Field>
          <Field label="Start Date">{task.start_date}</Field>
          <Field label="Target Date">{task.target_date}</Field>
          <Field label="Next Action">{task.next_action}</Field>
          <Field label="GSD Goal">{task.gsd_goal}</Field>
          <Field label="Dependencies">{task.dependencies?.join(", ")}</Field>
          <Field label="Deliverables">{task.deliverables?.join(", ")}</Field>
          <Field label="Blockers">{task.blockers?.join(", ")}</Field>
          <Field label="Risks">{task.risks?.join(", ")}</Field>
          <Field label="Decision Needed">{task.decision_needed}</Field>
          <Field label="FDA Relevance">{task.regulatory_relevance}</Field>
          <Field label="HIPAA Relevance">{task.hipaa_relevance}</Field>
          <Field label="Evidence Stage">{task.evidence_stage}</Field>
          <Field label="Notes">{task.notes}</Field>
        </dl>
      </div>

      <div className="border-t px-5 py-3">
        <button onClick={() => onEdit(task)} className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Edit Task
        </button>
      </div>
    </div>
  );
}
