"use client";

import type { RoadmapTask, Workstream, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { wsLabel } from "@/lib/roadmapUtils";

interface Props {
  tasks: (RoadmapTask | TaskWithAssignees)[];
  workstreams: Workstream[];
  onSelect: (task: RoadmapTask) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function assigneeNames(t: RoadmapTask | TaskWithAssignees): string {
  if ("assignees" in t && t.assignees && t.assignees.length > 0) {
    return t.assignees.map((p: Profile) => p.full_name || p.email).join(", ");
  }
  return "";
}

export default function TaskTable({ tasks, workstreams, onSelect, onDelete, compact }: Props) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No tasks match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2.5">ID</th>
            <th className="px-3 py-2.5">Title</th>
            {!compact && <th className="px-3 py-2.5">Workstream</th>}
            <th className="px-3 py-2.5">Owner</th>
            <th className="px-3 py-2.5">Assignees</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Priority</th>
            <th className="px-3 py-2.5">Target</th>
            {!compact && <><th className="px-3 py-2.5">FDA</th><th className="px-3 py-2.5">HIPAA</th></>}
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{t.id}</td>
              <td className="px-3 py-2 max-w-xs truncate font-medium text-slate-800">{t.title}</td>
              {!compact && <td className="px-3 py-2 text-xs text-slate-600">{wsLabel(workstreams, t.workstream_id)}</td>}
              <td className="px-3 py-2 text-xs text-slate-600">{t.owner}</td>
              <td className="px-3 py-2 text-xs text-slate-500 max-w-[120px] truncate">{assigneeNames(t) || "--"}</td>
              <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
              <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{t.target_date ?? "--"}</td>
              {!compact && (
                <>
                  <td className="px-3 py-2 text-xs text-slate-500">{t.regulatory_relevance}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{t.hipaa_relevance}</td>
                </>
              )}
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button onClick={() => onSelect(t)} className="mr-2 text-xs text-indigo-600 hover:underline">View</button>
                <button onClick={() => onDelete(t.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
