"use client";

import { clsx } from "clsx";

const colors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
  High:     "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200",
  Medium:   "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-200",
  Low:      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={clsx("inline-block rounded px-2 py-0.5 text-xs font-medium", colors[priority] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200")}>
      {priority}
    </span>
  );
}
