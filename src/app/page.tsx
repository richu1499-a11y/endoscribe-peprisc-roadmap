"use client";

import { useEffect, useState } from "react";
import { getWorkstreams, getTasks } from "@/lib/roadmapStore";
import type { RoadmapTask, Workstream } from "@/lib/roadmapTypes";
import { summarizeRoadmapHealth } from "@/lib/validation";
import { tasksDueSoon } from "@/lib/roadmapUtils";
import ComplianceBanner from "@/components/ComplianceBanner";
import MetricCard from "@/components/MetricCard";
import WorkstreamSummary from "@/components/WorkstreamSummary";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

export default function HomePage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);

  useEffect(() => {
    (async () => {
      setWorkstreams(await getWorkstreams());
      setTasks(await getTasks());
    })();
  }, []);

  const health = summarizeRoadmapHealth(tasks);
  const dueSoon = tasksDueSoon(tasks, 30);
  const criticalTasks = tasks.filter(t => t.priority === "Critical");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EndoScribe + PEPRisc Roadmap OS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Shared GSD execution dashboard for future directions, validation, FDA/IRB strategy, and translation
        </p>
      </div>

      <ComplianceBanner />

      {!isSupabaseConfigured && isDev && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Running in local demo mode. Changes are not persisted. <Link href="/setup" className="underline">Configure Supabase</Link> to enable database mode.
        </div>
      )}

      {!isSupabaseConfigured && !isDev && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Configuration required.</strong> Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Vercel dashboard and redeploy. <Link href="/setup" className="underline">View setup diagnostics</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Tasks" value={health.total} />
        <MetricCard label="Blocked" value={health.blocked} accent={health.blocked > 0 ? "red" : "default"} />
        <MetricCard label="Critical" value={health.critical} accent={health.critical > 0 ? "amber" : "default"} />
        <MetricCard label="High FDA" value={health.highFda} accent={health.highFda > 0 ? "amber" : "default"} />
        <MetricCard label="High HIPAA" value={health.highHipaa} accent={health.highHipaa > 0 ? "red" : "default"} />
        <MetricCard label="Due (30d)" value={dueSoon.length} accent="blue" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Workstreams</h2>
        <WorkstreamSummary workstreams={workstreams} tasks={tasks} />
      </section>

      {criticalTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Critical Next Actions</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {criticalTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                  <span className="text-sm font-medium text-slate-800">{t.title}</span>
                  <p className="mt-0.5 text-xs text-slate-500">Next: {t.next_action || "--"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
