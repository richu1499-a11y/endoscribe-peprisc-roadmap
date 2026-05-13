"use client";

import { useState } from "react";
import type { RoadmapTask, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { X, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  task: RoadmapTask | TaskWithAssignees;
  onClose: () => void;
  onEdit: (task: RoadmapTask) => void;
  onDuplicate?: (task: RoadmapTask) => void;
  onDelete?: (id: string) => void;
  onHardDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export default function TaskDetailDrawer({ task, onClose, onEdit, onDuplicate, onDelete, onHardDelete }: Props) {
  const [showMore, setShowMore] = useState(false);
  const assignees: Profile[] = "assignees" in task ? task.assignees : [];

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <button onClick={onClose} className="rounded p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
        {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
        <div className="space-y-3">
          <Field label="Workspace">{task.workspace ?? "--"}</Field>
          <Field label="Epic">{task.epic ?? "--"}</Field>
          <Field label="Owner">{task.owner ?? "--"}</Field>
          <Field label="Assignees">{assignees.length > 0 ? assignees.map(p => p.full_name || p.email).join(", ") : "--"}</Field>
          <Field label="Start date">{task.start_date ?? "--"}</Field>
          <Field label="Due date">{task.target_date ?? "--"}</Field>
        </div>

        <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 pt-2">
          {showMore ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          More details
        </button>

        {showMore && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Field label="Notes">{task.notes || "--"}</Field>
            <Field label="Next action">{task.next_action || "--"}</Field>
            <Field label="Task ID"><span className="font-mono text-[10px]">{task.id}</span></Field>
            {task.dependencies?.length > 0 && <Field label="Dependencies">{task.dependencies.join(", ")}</Field>}
          </div>
        )}
      </div>

      {/* Actions — available to all editors, not just admins */}
      <div className="border-t px-5 py-3 space-y-2">
        <button onClick={() => onEdit(task)} className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Edit Task
        </button>
        <div className="flex gap-2">
          {onDuplicate && (
            <button onClick={() => onDuplicate(task)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Duplicate
            </button>
          )}
          {onDelete && (
            <button onClick={() => { if (confirm("Archive this task?")) onDelete(task.id); }} className="flex-1 rounded-lg border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50">
              Archive
            </button>
          )}
          {onHardDelete && (
            <button onClick={() => onHardDelete(task.id)} className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5">{children || <span className="text-slate-300">--</span>}</dd>
    </div>
  );
}
