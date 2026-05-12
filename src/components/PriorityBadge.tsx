"use client";

import { clsx } from "clsx";

const colors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  High:     "bg-amber-100 text-amber-800 border-amber-200",
  Medium:   "bg-blue-50 text-blue-700 border-blue-200",
  Low:      "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={clsx("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", colors[priority] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
      {priority}
    </span>
  );
}
