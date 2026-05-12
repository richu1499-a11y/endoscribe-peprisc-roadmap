"use client";

import { clsx } from "clsx";

interface Props {
  label: string;
  value: number | string;
  accent?: "default" | "red" | "amber" | "green" | "blue";
}

const accentMap = {
  default: "border-slate-200",
  red: "border-red-400 bg-red-50/30",
  amber: "border-amber-400 bg-amber-50/30",
  green: "border-green-400 bg-green-50/30",
  blue: "border-blue-400 bg-blue-50/30",
};

export default function MetricCard({ label, value, accent = "default" }: Props) {
  return (
    <div className={clsx("rounded-xl border-l-4 bg-white p-5 shadow-sm", accentMap[accent])}>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
