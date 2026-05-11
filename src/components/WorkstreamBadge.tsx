"use client";

export default function WorkstreamBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {label}
    </span>
  );
}
