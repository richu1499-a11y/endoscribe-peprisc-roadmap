"use client";

import type { RoadmapTask, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import { TASK_STATUSES, PRIORITIES } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import ActionMenu from "./ActionMenu";

interface Props {
  tasks: (RoadmapTask | TaskWithAssignees)[];
  onSelect: (task: RoadmapTask) => void;
  onUpdate?: (id: string, updates: Partial<RoadmapTask>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (task: RoadmapTask) => void;
  isAdmin?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

function assigneeNames(t: RoadmapTask | TaskWithAssignees): string {
  if ("assignees" in t && t.assignees && t.assignees.length > 0) {
    return t.assignees.map((p: Profile) => p.full_name || p.email).join(", ");
  }
  return "";
}

export default function TaskTable({ tasks, onSelect, onUpdate, onDelete, onDuplicate, isAdmin, compact, emptyMessage }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">{emptyMessage ?? "No tasks yet."}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Task</th>
              <th className="px-3 py-2.5">Assignee</th>
              <th className="px-3 py-2.5 w-24">Priority</th>
              {!compact && <th className="px-3 py-2.5 w-28 hidden md:table-cell">Due date</th>}
              <th className="px-3 py-2.5 w-28">Status</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => onSelect(t)}>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800 truncate max-w-[280px]">{t.title}</p>
                  {t.workspace && <p className="text-[10px] text-slate-400 mt-0.5">{t.workspace}</p>}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate">{assigneeNames(t) || <span className="text-slate-300">--</span>}</td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  {onUpdate ? (
                    <select value={t.priority} onChange={e => onUpdate(t.id, { priority: e.target.value as RoadmapTask["priority"] })} className="rounded border-0 bg-transparent text-xs font-medium focus:ring-1 focus:ring-indigo-400 cursor-pointer py-0.5 -ml-1">
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  ) : <PriorityBadge priority={t.priority} />}
                </td>
                {!compact && <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 hidden md:table-cell">{t.target_date ?? <span className="text-slate-300">--</span>}</td>}
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  {onUpdate ? (
                    <select value={t.status} onChange={e => onUpdate(t.id, { status: e.target.value as RoadmapTask["status"] })} className="rounded border-0 bg-transparent text-xs font-medium focus:ring-1 focus:ring-indigo-400 cursor-pointer py-0.5 -ml-1">
                      {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <StatusBadge status={t.status} />}
                </td>
                <td className="px-1 py-2.5" onClick={e => e.stopPropagation()}>
                  <ActionMenu isAdmin={isAdmin} actions={[
                    { label: "View details", onClick: () => onSelect(t) },
                    { label: "Duplicate", onClick: () => onDuplicate?.(t), hidden: !onDuplicate },
                    { label: "Archive", onClick: () => onDelete?.(t.id), adminOnly: true, danger: true, hidden: !onDelete },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {tasks.map(t => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3 active:bg-slate-50" onClick={() => onSelect(t)}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                {t.workspace && <p className="text-[10px] text-slate-400 mt-0.5">{t.workspace}</p>}
              </div>
              <div onClick={e => e.stopPropagation()}>
                <ActionMenu isAdmin={isAdmin} actions={[
                  { label: "View details", onClick: () => onSelect(t) },
                  { label: "Archive", onClick: () => onDelete?.(t.id), adminOnly: true, danger: true, hidden: !onDelete },
                ]} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
              {t.target_date && <span className="text-[10px] text-slate-500">Due {t.target_date}</span>}
            </div>
            {assigneeNames(t) && <p className="text-[10px] text-slate-500 mt-1">{assigneeNames(t)}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
