"use client";

import { clsx } from "clsx";
import type { TaskStatus } from "@/lib/roadmapTypes";

const colors: Record<string, string> = {
  "Not started": "bg-slate-100 text-slate-700 border-slate-200",
  "In progress": "bg-blue-100 text-blue-800 border-blue-200",
  "Blocked":     "bg-red-100 text-red-800 border-red-200",
  "Complete":    "bg-green-100 text-green-800 border-green-200",
  "Deferred":    "bg-purple-100 text-purple-800 border-purple-200",
};

export default function StatusBadge({ status }: { status: TaskStatus | string }) {
  return (
    <span className={clsx("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", colors[status] ?? "bg-slate-100 text-slate-700 border-slate-200")}>
      {status}
    </span>
  );
}
