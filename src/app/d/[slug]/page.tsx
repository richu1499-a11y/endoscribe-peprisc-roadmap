"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getDashboardRegistry, getDashboardWidgets, getDashboardTaskLinks, getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getDecisions } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { DashboardRegistryItem, DashboardWidget, DashboardTaskLink, TaskWithAssignees, DecisionItem } from "@/lib/roadmapTypes";
import { summarizeRoadmapHealth } from "@/lib/validation";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import Link from "next/link";

const ROLE_RANK: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };

export default function DynamicDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [dashboard, setDashboard] = useState<DashboardRegistryItem | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(new Set());
  const [allTasks, setAllTasks] = useState<TaskWithAssignees[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    const registry = await getDashboardRegistry();
    const dash = registry.find(d => d.slug === slug);
    if (!dash) { setLoading(false); return; }

    // Check role
    const role = isSupabaseConfigured ? await getCurrentRole() : "viewer";
    setUserRole(role);
    if (ROLE_RANK[dash.required_role] > ROLE_RANK[role ?? "viewer"]) { setDenied(true); setLoading(false); return; }

    setDashboard(dash);

    const [w, links, rawTasks, profs, assigns, decs] = await Promise.all([
      getDashboardWidgets(dash.id),
      getDashboardTaskLinks(dash.id),
      getTasks(), getProfiles(), getTaskAssignments(), getDecisions(),
    ]);
    setWidgets(w.filter(wg => wg.is_visible).sort((a, b) => a.order_index - b.order_index));
    setLinkedTaskIds(new Set(links.map((l: DashboardTaskLink) => l.task_id)));
    setAllTasks(await getTasksWithAssignees(rawTasks, assigns, profs));
    setDecisions(decs);

    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id ?? null);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-500">Loading dashboard...</div>;
  if (denied) return <div className="mx-auto max-w-md pt-12"><h1 className="text-xl font-bold text-slate-900">Access Denied</h1><p className="mt-2 text-sm text-slate-600">You need {dashboard?.required_role ?? "higher"} role.</p><Link href="/" className="text-sm text-indigo-600 hover:underline">Back</Link></div>;
  if (!dashboard) return <div className="mx-auto max-w-md pt-12"><h1 className="text-xl font-bold text-slate-900">Dashboard Not Found</h1><p className="mt-2 text-sm text-slate-500">No dashboard with slug &ldquo;{slug}&rdquo;.</p><Link href="/" className="text-sm text-indigo-600 hover:underline">Back</Link></div>;

  const linkedTasks = allTasks.filter(t => linkedTaskIds.has(t.id));
  const myTasks = allTasks.filter(t => currentUserId && t.assignees.some(a => a.id === currentUserId));
  const health = summarizeRoadmapHealth(linkedTasks.length > 0 ? linkedTasks : allTasks);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{dashboard.title}</h1>
        {dashboard.description && <p className="text-xs text-slate-500 mt-0.5">{dashboard.description}</p>}
      </div>

      <ComplianceBanner />

      {widgets.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">This dashboard has no widgets configured yet.</p>
          {userRole === "admin" && <Link href="/admin/dashboards" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Open Dashboard Manager</Link>}
        </div>
      )}

      {widgets.map(w => (
        <WidgetRenderer key={w.id} widget={w} allTasks={allTasks} linkedTasks={linkedTasks} myTasks={myTasks} decisions={decisions} health={health} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget renderer
// ---------------------------------------------------------------------------
function WidgetRenderer({ widget, allTasks, linkedTasks, myTasks, decisions, health }: {
  widget: DashboardWidget;
  allTasks: TaskWithAssignees[];
  linkedTasks: TaskWithAssignees[];
  myTasks: TaskWithAssignees[];
  decisions: DecisionItem[];
  health: ReturnType<typeof summarizeRoadmapHealth>;
}) {
  const tasks = linkedTasks.length > 0 ? linkedTasks : allTasks;

  switch (widget.widget_type) {
    case "metric_cards":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total" value={health.total} />
            <MetricCard label="Blocked" value={health.blocked} accent={health.blocked > 0 ? "red" : "default"} />
            <MetricCard label="Critical" value={health.critical} accent={health.critical > 0 ? "amber" : "default"} />
            <MetricCard label="High FDA" value={health.highFda} accent="amber" />
            <MetricCard label="Compliance" value={health.highHipaa} accent="red" />
            <MetricCard label="Missing Dates" value={health.missingDates} />
          </div>
        </section>
      );

    case "task_table":
    case "linked_tasks":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title} ({tasks.length})</h2>
          <TaskMiniTable tasks={tasks} />
        </section>
      );

    case "my_week":
    case "assigned_tasks":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title} ({myTasks.length})</h2>
          {myTasks.length > 0 ? <TaskMiniTable tasks={myTasks} /> : <p className="text-sm text-slate-500 py-4 text-center">No tasks assigned to you.</p>}
        </section>
      );

    case "decision_log":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {decisions.length === 0 && <p className="px-4 py-4 text-sm text-slate-500 text-center">No decisions.</p>}
            {decisions.map(d => (
              <div key={d.id} className="px-4 py-2.5 text-xs"><span className="font-mono text-slate-500 mr-2">{d.id}</span><span className="text-slate-800 font-medium">{d.title}</span> <span className="text-slate-400">Owner: {d.owner}</span></div>
            ))}
          </div>
        </section>
      );

    case "workload_summary":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <p className="text-xs text-slate-500">{tasks.length} tasks across owners.</p>
        </section>
      );

    case "health_warnings":
      return null; // Health warnings handled per-dashboard page

    case "static_text":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <p className="text-sm text-slate-600">{widget.description || "Content placeholder."}</p>
        </section>
      );

    case "gantt":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <Link href="/timeline" className="text-sm text-indigo-600 hover:underline">Open full Timeline view</Link>
        </section>
      );

    case "network":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <Link href="/network" className="text-sm text-indigo-600 hover:underline">Open full Network Map</Link>
        </section>
      );

    case "regulatory_items":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <Link href="/regulatory" className="text-sm text-indigo-600 hover:underline">Open full Regulatory dashboard</Link>
        </section>
      );

    case "governance_items":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <Link href="/governance" className="text-sm text-indigo-600 hover:underline">Open full Governance dashboard</Link>
        </section>
      );

    case "validation_items":
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <Link href="/validation" className="text-sm text-indigo-600 hover:underline">Open full Validation dashboard</Link>
        </section>
      );

    default:
      return (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">{widget.title}</h2>
          <p className="text-xs text-slate-500">Widget type: {widget.widget_type}</p>
        </section>
      );
  }
}

function TaskMiniTable({ tasks }: { tasks: TaskWithAssignees[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Target</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.slice(0, 25).map(t => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-mono text-xs text-slate-600">{t.id}</td>
              <td className="px-3 py-2 text-xs font-medium text-slate-800 max-w-[200px] truncate">{t.title}</td>
              <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
              <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
              <td className="px-3 py-2 text-xs text-slate-600">{t.owner}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{t.target_date ?? "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
