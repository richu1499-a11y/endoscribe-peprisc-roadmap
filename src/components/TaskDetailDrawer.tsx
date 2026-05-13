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
  isAdmin?: boolean;
}

export default function TaskDetailDrawer({ task, onClose, onEdit, onDuplicate, onDelete, isAdmin }: Props) {
  const [showMore, setShowMore] = useState(false);
  const assignees: Profile[] = "assignees" in task ? task.assignees : [];

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="flex gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <button onClick={onClose} className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)]"><X className="h-4 w-4" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">{task.title}</h2>

        {task.description && <p className="text-sm text-[var(--muted)]">{task.description}</p>}

        <div className="space-y-3">
          <Field label="Workspace">{task.workspace ?? "--"}</Field>
          <Field label="Assignees">{assignees.length > 0 ? assignees.map(p => p.full_name || p.email).join(", ") : "--"}</Field>
          <Field label="Start date">{task.start_date ?? "--"}</Field>
          <Field label="Due date">{task.target_date ?? "--"}</Field>
        </div>

        {/* Collapsible more options */}
        <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-1 pt-2 text-xs text-[var(--muted)] hover:text-[var(--text)]">
          {showMore ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          More details
        </button>

        {showMore && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <Field label="Notes">{task.notes || "--"}</Field>
            <Field label="Next action">{task.next_action || "--"}</Field>
            <Field label="Owner">{task.owner || "--"}</Field>
            <Field label="Task ID"><span className="font-mono text-[10px]">{task.id}</span></Field>
            {task.dependencies?.length > 0 && <Field label="Dependencies">{task.dependencies.join(", ")}</Field>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-[var(--border)] px-5 py-3">
        <button onClick={() => onEdit(task)} className="app-button-primary w-full rounded-lg px-4 py-2 text-sm font-medium">
          Edit Task
        </button>
        <div className="flex gap-2">
          {onDuplicate && (
            <button onClick={() => onDuplicate(task)} className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-strong)]">
              Duplicate
            </button>
          )}
          {isAdmin && onDelete && (
            <button onClick={() => { if (confirm("Archive this task?")) onDelete(task.id); }} className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40">
              Archive
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
      <dt className="text-[10px] font-medium uppercase text-[var(--subtle)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--text)]">{children || <span className="text-[var(--subtle)]">--</span>}</dd>
    </div>
  );
}
