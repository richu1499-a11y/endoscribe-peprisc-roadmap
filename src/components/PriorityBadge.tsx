"use client";

import { clsx } from "clsx";

const colors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High:     "bg-amber-100 text-amber-800",
  Medium:   "bg-blue-100 text-blue-700",
  Low:      "bg-slate-100 text-slate-600",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={clsx("inline-block rounded px-2 py-0.5 text-xs font-medium", colors[priority] ?? "bg-slate-100 text-slate-600")}>
      {priority}
    </span>
  );
}
