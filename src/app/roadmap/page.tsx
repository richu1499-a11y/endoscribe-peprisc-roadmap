"use client";

import { useEffect, useState } from "react";
import { getWorkstreams, getTasks } from "@/lib/roadmapStore";
import { MOCK_MILESTONES } from "@/lib/mockData";
import type { RoadmapTask, Workstream, Milestone } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const milestones: Milestone[] = MOCK_MILESTONES;

  useEffect(() => {
    (async () => {
      setWorkstreams(await getWorkstreams());
      setTasks(await getTasks());
    })();
  }, []);

  // Group tasks by workstream
  const grouped = new Map<string, RoadmapTask[]>();
  for (const t of tasks) {
    const list = grouped.get(t.workstream_id) ?? [];
    list.push(t);
    grouped.set(t.workstream_id, list);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Roadmap</h1>
      <p className="text-sm text-slate-500">Strategic timeline view organized by workstream</p>

      {/* Milestones */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Milestones</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {milestones.map(ms => (
            <div key={ms.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">{ms.id}</span>
                <StatusBadge status={ms.status} />
              </div>
              <h4 className="mt-2 text-sm font-semibold text-slate-800">{ms.title}</h4>
              <p className="mt-1 text-xs text-slate-500">{ms.description}</p>
              <p className="mt-2 text-xs font-medium text-indigo-600">{ms.target_date ?? "TBD"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workstream task lists */}
      {workstreams.map(ws => {
        const wsTasks = grouped.get(ws.id) ?? [];
        if (wsTasks.length === 0) return null;
        const sorted = [...wsTasks].sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));

        return (
          <section key={ws.id}>
            <h2 className="mb-2 text-base font-semibold text-slate-800">{ws.label}</h2>
            <p className="mb-2 text-xs text-slate-500">{ws.purpose}</p>
            <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {sorted.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                    <span className="text-sm text-slate-800">{t.title}</span>
                    <div className="mt-0.5 flex gap-2 text-xs text-slate-500">
                      <span>{t.start_date ?? "?"} -- {t.target_date ?? "?"}</span>
                      <span>Owner: {t.owner}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
