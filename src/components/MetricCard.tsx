"use client";

import { clsx } from "clsx";

interface Props {
  label: string;
  value: number | string;
  accent?: "default" | "red" | "amber" | "green" | "blue";
}

const accentMap = {
  default: "border-slate-200",
  red: "border-red-400",
  amber: "border-amber-400",
  green: "border-green-400",
  blue: "border-blue-400",
};

export default function MetricCard({ label, value, accent = "default" }: Props) {
  return (
    <div className={clsx("rounded-lg border-l-4 bg-white p-4 shadow-sm", accentMap[accent])}>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
