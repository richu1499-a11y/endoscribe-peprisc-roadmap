"use client";

import type { RoadmapTask, Workstream } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { wsLabel } from "@/lib/roadmapUtils";

interface Props {
  tasks: RoadmapTask[];
  workstreams: Workstream[];
  onSelect: (task: RoadmapTask) => void;
  onDelete: (id: string) => void;
}

export default function TaskTable({ tasks, workstreams, onSelect, onDelete }: Props) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No tasks match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Workstream</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">FDA</th>
            <th className="px-4 py-3">HIPAA</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">{t.id}</td>
              <td className="px-4 py-2.5 max-w-xs truncate font-medium text-slate-800">{t.title}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{wsLabel(workstreams, t.workstream_id)}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{t.owner}</td>
              <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{t.target_date ?? "--"}</td>
              <td className="px-4 py-2.5 text-xs text-slate-500">{t.regulatory_relevance}</td>
              <td className="px-4 py-2.5 text-xs text-slate-500">{t.hipaa_relevance}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <button onClick={() => onSelect(t)} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                <button onClick={() => onDelete(t.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
