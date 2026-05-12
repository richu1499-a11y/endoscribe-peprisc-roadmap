"use client";

import { useState } from "react";
import type { RoadmapTask, Profile, TaskWithAssignees } from "@/lib/roadmapTypes";
import { TASK_STATUSES, PRIORITIES } from "@/lib/roadmapTypes";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import ActionMenu from "./ActionMenu";
import { clsx } from "clsx";

const WORKSPACES = [
  { slug: "endoscribe-core", title: "EndoScribe Core" },
  { slug: "peprisc", title: "PEPRisc" },
  { slug: "hardware-workflow", title: "Hardware / Workflow" },
  { slug: "irb-fda-translation", title: "IRB, FDA & Translation" },
  { slug: "research-study-trial", title: "Research Study" },
];

interface Props {
  tasks: (RoadmapTask | TaskWithAssignees)[];
  profiles?: Profile[];
  onSelect: (task: RoadmapTask) => void;
  onUpdate?: (id: string, updates: Partial<RoadmapTask>) => void;
  onBulkUpdate?: (ids: string[], updates: Partial<RoadmapTask>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (task: RoadmapTask) => void;
  onMoveWorkspace?: (id: string, workspace: string) => void;
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

export default function TaskTable({ tasks, onSelect, onUpdate, onBulkUpdate, onDelete, onDuplicate, onMoveWorkspace, isAdmin, compact, emptyMessage }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">{emptyMessage ?? "No tasks yet."}</p>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => prev.size === tasks.length ? new Set() : new Set(tasks.map(t => t.id)));
  }
  function clearSelection() { setSelected(new Set()); setBulkAction(""); }

  async function applyBulk(value: string) {
    if (!onBulkUpdate || selected.size === 0) return;
    const ids = [...selected];
    const [type, val] = value.split("::");
    if (type === "status") await onBulkUpdate(ids, { status: val as RoadmapTask["status"] });
    else if (type === "priority") await onBulkUpdate(ids, { priority: val as RoadmapTask["priority"] });
    else if (type === "workspace" && onMoveWorkspace) { for (const id of ids) { onMoveWorkspace(id, val); } }
    else if (type === "archive" && isAdmin && onDelete) { for (const id of ids) { onDelete(id); } }
    clearSelection();
  }

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {hasSelection && onBulkUpdate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs font-medium text-indigo-700">{selected.size} selected</span>
          <select value={bulkAction} onChange={e => { setBulkAction(e.target.value); if (e.target.value) applyBulk(e.target.value); }} className="rounded border border-indigo-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none">
            <option value="">Bulk actions...</option>
            <optgroup label="Status">{TASK_STATUSES.map(s => <option key={s} value={`status::${s}`}>{s}</option>)}</optgroup>
            <optgroup label="Priority">{PRIORITIES.map(p => <option key={p} value={`priority::${p}`}>{p}</option>)}</optgroup>
            <optgroup label="Move to workspace">{WORKSPACES.map(w => <option key={w.slug} value={`workspace::${w.slug}`}>{w.title}</option>)}</optgroup>
            {isAdmin && <optgroup label="Admin"><option value="archive::true">Archive selected</option></optgroup>}
          </select>
          <button onClick={clearSelection} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {onBulkUpdate && <th className="px-2 py-2.5 w-8"><input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleAll} className="rounded" /></th>}
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
              <tr key={t.id} className={clsx("hover:bg-slate-50 transition-colors cursor-pointer group", selected.has(t.id) && "bg-indigo-50/50")} onClick={() => onSelect(t)}>
                {onBulkUpdate && <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="rounded" /></td>}
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
                {!compact && (
                  <td className="whitespace-nowrap px-3 py-2.5 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                    {onUpdate ? (
                      <input type="date" value={t.target_date ?? ""} onChange={e => onUpdate(t.id, { target_date: e.target.value || null })} className="rounded border-0 bg-transparent text-xs text-slate-600 focus:ring-1 focus:ring-indigo-400 cursor-pointer py-0.5 -ml-1" />
                    ) : <span className="text-xs text-slate-500">{t.target_date ?? "--"}</span>}
                  </td>
                )}
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
                    ...(onMoveWorkspace ? WORKSPACES.map(w => ({ label: `Move to ${w.title}`, onClick: () => onMoveWorkspace(t.id, w.slug) })) : []),
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
          <div key={t.id} className={clsx("rounded-lg border bg-white p-3 active:bg-slate-50", selected.has(t.id) ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200")} onClick={() => onSelect(t)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0 mr-2">
                {onBulkUpdate && <input type="checkbox" checked={selected.has(t.id)} onChange={e => { e.stopPropagation(); toggle(t.id); }} className="rounded mt-0.5 shrink-0" onClick={e => e.stopPropagation()} />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  {t.workspace && <p className="text-[10px] text-slate-400 mt-0.5">{t.workspace}</p>}
                </div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <ActionMenu isAdmin={isAdmin} actions={[
                  { label: "View details", onClick: () => onSelect(t) },
                  { label: "Duplicate", onClick: () => onDuplicate?.(t), hidden: !onDuplicate },
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
    </div>
  );
}
