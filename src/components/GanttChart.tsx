"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import type { TaskWithAssignees, Workstream } from "@/lib/roadmapTypes";
import {
  getTimelineBounds, computeTaskBarPosition, groupTasksForTimeline,
  fmtDate, daysBetween, type GroupByKey,
} from "@/lib/timelineUtils";

type ColorByKey = "status" | "priority" | "regulatory_relevance" | "hipaa_relevance";

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-slate-300", "In progress": "bg-blue-500",
  "Blocked": "bg-red-500", "Complete": "bg-green-500", "Deferred": "bg-purple-400",
};
const PRIORITY_COLORS: Record<string, string> = {
  "Critical": "bg-red-500", "High": "bg-amber-500", "Medium": "bg-blue-400", "Low": "bg-slate-300",
};
const LEVEL_COLORS: Record<string, string> = {
  "High": "bg-red-500", "Moderate": "bg-amber-400", "Low": "bg-blue-300", "None": "bg-slate-200",
};

function getBarColor(task: TaskWithAssignees, colorBy: ColorByKey): string {
  switch (colorBy) {
    case "status": return STATUS_COLORS[task.status] ?? "bg-slate-300";
    case "priority": return PRIORITY_COLORS[task.priority] ?? "bg-slate-300";
    case "regulatory_relevance": return LEVEL_COLORS[task.regulatory_relevance] ?? "bg-slate-200";
    case "hipaa_relevance": return LEVEL_COLORS[task.hipaa_relevance] ?? "bg-slate-200";
  }
}

interface Props {
  tasks: TaskWithAssignees[];
  workstreams: Workstream[];
  groupBy: GroupByKey;
  colorBy: ColorByKey;
  onSelect: (task: TaskWithAssignees) => void;
}

export default function GanttChart({ tasks, workstreams, groupBy, colorBy, onSelect }: Props) {
  const datedTasks = tasks.filter(t => t.start_date || t.target_date);
  const bounds = useMemo(() => getTimelineBounds(datedTasks), [datedTasks]);
  const groups = useMemo(() => groupTasksForTimeline(datedTasks, groupBy, workstreams), [datedTasks, groupBy, workstreams]);
  const totalDays = daysBetween(bounds.start, bounds.end) || 1;

  // Month markers
  const months: { label: string; leftPct: number }[] = useMemo(() => {
    const result: { label: string; leftPct: number }[] = [];
    const d = new Date(bounds.start);
    d.setDate(1);
    if (d < bounds.start) d.setMonth(d.getMonth() + 1);
    while (d <= bounds.end) {
      const pct = (daysBetween(bounds.start, d) / totalDays) * 100;
      result.push({ label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), leftPct: pct });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [bounds, totalDays]);

  // Today marker
  const today = new Date();
  const todayPct = today >= bounds.start && today <= bounds.end
    ? (daysBetween(bounds.start, today) / totalDays) * 100 : -1;

  if (datedTasks.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No tasks with dates to display. Add start_date and target_date to tasks.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-[900px]">
        {/* Header row with month markers */}
        <div className="relative h-7 border-b border-slate-200 bg-slate-50">
          {months.map((m, i) => (
            <div key={i} className="absolute top-0 h-full border-l border-slate-300 text-[10px] text-slate-500 pl-1 pt-1" style={{ left: `${Math.max(0, m.leftPct)}%` }}>
              {m.label}
            </div>
          ))}
          {todayPct >= 0 && (
            <div className="absolute top-0 h-full w-px bg-indigo-500" style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-0 -translate-x-1/2 rounded bg-indigo-500 px-1 text-[9px] font-medium text-white">Today</span>
            </div>
          )}
        </div>

        {/* Groups */}
        {groups.map((group) => (
          <div key={group.label}>
            {/* Group header */}
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {group.label} <span className="font-normal text-slate-400">({group.tasks.length})</span>
            </div>
            {/* Task rows */}
            {group.tasks.map((task) => {
              const { leftPct, widthPct, hasDate } = computeTaskBarPosition(task, bounds.start, bounds.end);
              if (!hasDate) return null;
              const assigneeStr = task.assignees.length > 0
                ? task.assignees.map(a => a.full_name || a.email).join(", ")
                : "";

              return (
                <div key={task.id} className="relative flex items-center border-b border-slate-50 h-8 group cursor-pointer hover:bg-slate-50" onClick={() => onSelect(task)}>
                  {/* Today line extending through rows */}
                  {todayPct >= 0 && <div className="absolute top-0 h-full w-px bg-indigo-200" style={{ left: `${todayPct}%` }} />}
                  {/* Bar */}
                  <div
                    className={clsx("absolute h-5 rounded-sm transition-opacity", getBarColor(task, colorBy), "opacity-80 group-hover:opacity-100")}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: "4px" }}
                    title={`${task.id}: ${task.title}\n${task.start_date ?? "?"} - ${task.target_date ?? "?"}\nOwner: ${task.owner}\nAssignees: ${assigneeStr || "none"}\nStatus: ${task.status} | Priority: ${task.priority}`}
                  >
                    <span className="absolute inset-0 flex items-center px-1.5 overflow-hidden">
                      <span className="truncate text-[10px] font-medium text-white drop-shadow-sm">
                        {task.id} {task.title}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-600">
          <span className="font-medium">Color: {colorBy === "regulatory_relevance" ? "FDA" : colorBy === "hipaa_relevance" ? "HIPAA" : colorBy}</span>
          {Object.entries(
            colorBy === "status" ? STATUS_COLORS
            : colorBy === "priority" ? PRIORITY_COLORS
            : LEVEL_COLORS
          ).map(([label, cls]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={clsx("inline-block h-2.5 w-2.5 rounded-sm", cls)} />{label}
            </span>
          ))}
        </div>

        {/* Date range footer */}
        <div className="border-t border-slate-100 px-3 py-1 text-[10px] text-slate-400">
          {fmtDate(bounds.start)} to {fmtDate(bounds.end)} | {datedTasks.length} tasks with dates
        </div>
      </div>
    </div>
  );
}
