"use client";

import { useEffect, useState } from "react";
import { getTasks, getDecisions, getRisks, getTaskAssignments } from "@/lib/roadmapStore";
import type { RoadmapTask, DecisionItem, RiskItem, TaskAssignment } from "@/lib/roadmapTypes";
import { countWhere } from "@/lib/roadmapUtils";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import StatusBadge from "@/components/StatusBadge";

export default function GsdPage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [myTaskIds, setMyTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [t, d, r] = await Promise.all([getTasks(), getDecisions(), getRisks()]);
      setTasks(t);
      setDecisions(d);
      setRisks(r);
      if (isSupabaseConfigured) {
        const [user, assigns] = await Promise.all([getCurrentUser(), getTaskAssignments()]);
        if (user) setMyTaskIds(new Set(assigns.filter((a: TaskAssignment) => a.user_id === user.id).map((a: TaskAssignment) => a.task_id)));
      }
    })();
  }, []);

  const goals = [...new Set(tasks.map(t => t.gsd_goal).filter(Boolean))];
  const blocked = tasks.filter(t => t.status === "Blocked");
  const critical = tasks.filter(t => t.priority === "Critical");
  const myTasks = tasks.filter(t => myTaskIds.has(t.id));
  const myBlocked = myTasks.filter(t => t.status === "Blocked");
  const myNextActions = myTasks.filter(t => t.next_action && t.status !== "Complete");

  const ownerMap = new Map<string, { total: number; blocked: number; critical: number }>();
  for (const t of tasks) {
    const o = t.owner || "Unassigned";
    const entry = ownerMap.get(o) ?? { total: 0, blocked: 0, critical: 0 };
    entry.total++;
    if (t.status === "Blocked") entry.blocked++;
    if (t.priority === "Critical") entry.critical++;
    ownerMap.set(o, entry);
  }

  const sectionCls = "rounded-lg border border-slate-200 bg-white";
  const headCls = "text-lg font-semibold text-slate-800 mb-3";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">GSD Execution View</h1>
      <p className="text-sm text-slate-500">Goals -- Strategy -- Deliverables -- Execution</p>

      {/* My next actions */}
      {myNextActions.length > 0 && (
        <section>
          <h2 className={headCls}>My Next Actions</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {myNextActions.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                  <span className="text-sm text-slate-800">{t.title}</span>
                  <p className="text-xs text-slate-500">Next: {t.next_action}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My blockers */}
      {myBlocked.length > 0 && (
        <section>
          <h2 className={headCls}>Blockers Affecting My Tasks</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {myBlocked.map(t => (
              <div key={t.id} className="px-4 py-2.5">
                <span className="mr-2 font-mono text-xs text-red-500">{t.id}</span>
                <span className="text-sm text-slate-800">{t.title}</span>
                <span className="ml-2 text-xs text-slate-500">{t.blockers?.join(", ") || "not specified"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strategic goals */}
      <section>
        <h2 className={headCls}>Strategic Goals</h2>
        <div className={sectionCls + " divide-y divide-slate-100"}>
          {goals.map((g, i) => {
            const count = countWhere(tasks, t => t.gsd_goal === g);
            return <div key={i} className="px-4 py-2.5 text-sm text-slate-700">{i + 1}. <strong>{g}</strong> <span className="text-slate-400">({count} tasks)</span></div>;
          })}
        </div>
      </section>

      {critical.length > 0 && (
        <section>
          <h2 className={headCls}>Critical Next Actions</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {critical.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                  <span className="text-sm text-slate-800">{t.title}</span>
                  <p className="text-xs text-slate-500">Owner: {t.owner} | Next: {t.next_action || "--"}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {decisions.length > 0 && (
        <section>
          <h2 className={headCls}>Decisions Needed</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {decisions.map(d => (
              <div key={d.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{d.id}</span>
                  <span className="text-sm font-medium text-slate-800">{d.title}</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{d.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Owner: {d.owner} | {d.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {blocked.length > 0 && (
        <section>
          <h2 className={headCls}>All Blockers</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {blocked.map(t => (
              <div key={t.id} className="px-4 py-2.5">
                <span className="mr-2 font-mono text-xs text-red-500">{t.id}</span>
                <span className="text-sm text-slate-800">{t.title}</span>
                <span className="ml-2 text-xs text-slate-500">{t.blockers?.join(", ") || "not specified"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={headCls}>Owner Summary</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2">Owner</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Blocked</th><th className="px-4 py-2">Critical</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...ownerMap.entries()].map(([owner, c]) => (
                <tr key={owner}>
                  <td className="px-4 py-2 text-slate-800">{owner}</td>
                  <td className="px-4 py-2">{c.total}</td>
                  <td className="px-4 py-2">{c.blocked > 0 ? <span className="text-red-600">{c.blocked}</span> : 0}</td>
                  <td className="px-4 py-2">{c.critical > 0 ? <span className="font-semibold text-amber-700">{c.critical}</span> : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {risks.length > 0 && (
        <section>
          <h2 className={headCls}>Key Risks</h2>
          <div className={sectionCls + " divide-y divide-slate-100"}>
            {risks.map(r => (
              <div key={r.id} className="px-4 py-2.5">
                <span className="mr-2 font-mono text-xs text-slate-500">{r.id}</span>
                <span className="text-sm font-medium text-slate-800">{r.title}</span>
                <span className="ml-2 text-xs text-slate-500">Severity: {r.severity} | Mitigation: {r.mitigation}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
