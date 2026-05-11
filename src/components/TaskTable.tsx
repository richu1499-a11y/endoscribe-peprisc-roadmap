"use client";

import type { RoadmapTask, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

interface Props {
  tasks: (RoadmapTask | TaskWithAssignees)[];
  onSelect: (task: RoadmapTask) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  compact?: boolean;
}

function assigneeNames(t: RoadmapTask | TaskWithAssignees): string {
  if ("assignees" in t && t.assignees && t.assignees.length > 0) {
    return t.assignees.map((p: Profile) => p.full_name || p.email).join(", ");
  }
  return "";
}

export default function TaskTable({ tasks, onSelect, onDelete, showDelete, compact }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Task</th>
            <th className="px-3 py-2.5 hidden sm:table-cell">Assignee</th>
            <th className="px-3 py-2.5">Priority</th>
            {!compact && <th className="px-3 py-2.5 hidden md:table-cell">Due date</th>}
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onSelect(t)}>
              <td className="px-3 py-2.5">
                <p className="font-medium text-slate-800 truncate max-w-[250px]">{t.title}</p>
                {t.workspace && <p className="text-[10px] text-slate-400 mt-0.5">{t.workspace}</p>}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-600 hidden sm:table-cell max-w-[120px] truncate">{assigneeNames(t) || "--"}</td>
              <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
              {!compact && <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 hidden md:table-cell">{t.target_date ?? "--"}</td>}
              <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                <button onClick={() => onSelect(t)} className="mr-2 text-xs text-indigo-600 hover:underline">View</button>
                {showDelete && onDelete && <button onClick={() => onDelete(t.id)} className="text-xs text-red-500 hover:underline">Archive</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
