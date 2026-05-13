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
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--muted)]">{emptyMessage ?? "No tasks yet."}</p>
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2">
          <span className="text-xs font-medium text-[var(--accent-strong)]">{selected.size} selected</span>
          <select value={bulkAction} onChange={e => { setBulkAction(e.target.value); if (e.target.value) applyBulk(e.target.value); }} className="app-field rounded px-2 py-1 text-xs">
            <option value="">Bulk actions...</option>
            <optgroup label="Status">{TASK_STATUSES.map(s => <option key={s} value={`status::${s}`}>{s}</option>)}</optgroup>
            <optgroup label="Priority">{PRIORITIES.map(p => <option key={p} value={`priority::${p}`}>{p}</option>)}</optgroup>
            <optgroup label="Move to workspace">{WORKSPACES.map(w => <option key={w.slug} value={`workspace::${w.slug}`}>{w.title}</option>)}</optgroup>
            {isAdmin && <optgroup label="Admin"><option value="archive::true">Archive selected</option></optgroup>}
          </select>
          <button onClick={clearSelection} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Clear</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]">
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
          <tbody className="divide-y divide-[var(--border)]">
            {tasks.map(t => (
              <tr key={t.id} className={clsx("group cursor-pointer transition-colors hover:bg-[var(--surface-soft)]", selected.has(t.id) && "bg-[var(--accent-soft)]")} onClick={() => onSelect(t)}>
                {onBulkUpdate && <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="rounded" /></td>}
                <td className="px-3 py-2.5">
                  <p className="max-w-[280px] truncate font-medium text-[var(--text)]">{t.title}</p>
                  {t.workspace && <p className="mt-0.5 text-[10px] text-[var(--subtle)]">{t.workspace}</p>}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2.5 text-xs text-[var(--muted)]">{assigneeNames(t) || <span className="text-[var(--subtle)]">--</span>}</td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  {onUpdate ? (
                    <select value={t.priority} onChange={e => onUpdate(t.id, { priority: e.target.value as RoadmapTask["priority"] })} className="-ml-1 cursor-pointer rounded border-0 bg-transparent py-0.5 text-xs font-medium text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]">
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  ) : <PriorityBadge priority={t.priority} />}
                </td>
                {!compact && (
                  <td className="whitespace-nowrap px-3 py-2.5 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                    {onUpdate ? (
                      <input type="date" value={t.target_date ?? ""} onChange={e => onUpdate(t.id, { target_date: e.target.value || null })} className="-ml-1 cursor-pointer rounded border-0 bg-transparent py-0.5 text-xs text-[var(--muted)] focus:ring-1 focus:ring-[var(--accent)]" />
                    ) : <span className="text-xs text-[var(--muted)]">{t.target_date ?? "--"}</span>}
                  </td>
                )}
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  {onUpdate ? (
                    <select value={t.status} onChange={e => onUpdate(t.id, { status: e.target.value as RoadmapTask["status"] })} className="-ml-1 cursor-pointer rounded border-0 bg-transparent py-0.5 text-xs font-medium text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]">
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
          <div key={t.id} className={clsx("rounded-lg border bg-[var(--surface)] p-3 active:bg-[var(--surface-soft)]", selected.has(t.id) ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]")} onClick={() => onSelect(t)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0 mr-2">
                {onBulkUpdate && <input type="checkbox" checked={selected.has(t.id)} onChange={e => { e.stopPropagation(); toggle(t.id); }} className="rounded mt-0.5 shrink-0" onClick={e => e.stopPropagation()} />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{t.title}</p>
                  {t.workspace && <p className="mt-0.5 text-[10px] text-[var(--subtle)]">{t.workspace}</p>}
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
              {t.target_date && <span className="text-[10px] text-[var(--muted)]">Due {t.target_date}</span>}
            </div>
            {assigneeNames(t) && <p className="mt-1 text-[10px] text-[var(--muted)]">{assigneeNames(t)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
