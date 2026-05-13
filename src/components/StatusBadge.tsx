"use client";

import { clsx } from "clsx";
import type { TaskStatus } from "@/lib/roadmapTypes";

const colors: Record<string, string> = {
  "Not started": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  "In progress": "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200",
  "Blocked":     "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
  "Complete":    "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-200",
  "Deferred":    "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200",
};

export default function StatusBadge({ status }: { status: TaskStatus | string }) {
  return (
    <span className={clsx("inline-block rounded px-2 py-0.5 text-xs font-medium", colors[status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
      {status}
    </span>
  );
}
