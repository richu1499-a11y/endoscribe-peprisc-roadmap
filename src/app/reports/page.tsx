"use client";

import Link from "next/link";
import { BarChart3, GanttChart, Network, Shield, Lock, FlaskConical, FileText, Download } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";

const REPORTS = [
  { title: "Weekly Summary", description: "Team progress, completed tasks, and upcoming deadlines.", icon: FileText, href: "#", coming: true },
  { title: "Project Status", description: "Overall roadmap health, milestones, and risk overview.", icon: BarChart3, href: "#", coming: true },
  { title: "Export Center", description: "Download reports as HTML, Excel, or Markdown.", icon: Download, href: "#", coming: true },
];

const ADVANCED = [
  { title: "Timeline / Gantt", description: "Interactive Gantt chart with filters, grouping, and date windows.", icon: GanttChart, href: "/timeline" },
  { title: "Network Map", description: "2D dependency network of workstreams, tasks, risks, and decisions.", icon: Network, href: "/network" },
  { title: "FDA / Regulatory", description: "Regulatory strategy, CDS/SaMD assessment, intended use matrix.", icon: Shield, href: "/regulatory" },
  { title: "IRB / Compliance", description: "Data governance, IRB amendments, institutional review.", icon: Lock, href: "/governance" },
  { title: "Validation Science", description: "Evidence ladder, metrics matrix, failure-mode taxonomy.", icon: FlaskConical, href: "/validation" },
];

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Summaries, exports, and advanced analysis views.</p>
      </div>

      <ComplianceBanner />

      {/* Reports */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Reports</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map(r => (
            <div key={r.title} className="rounded-lg border border-slate-200 bg-white p-4 opacity-60">
              <r.icon className="h-5 w-5 text-slate-400 mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">{r.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{r.description}</p>
              <p className="mt-2 text-[10px] text-slate-400 italic">Coming soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Advanced</h2>
        <p className="text-xs text-slate-500 mb-3">Deep analysis dashboards. Use after workspaces and tasks are established.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANCED.map(r => (
            <Link key={r.title} href={r.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
              <r.icon className="h-5 w-5 text-indigo-500 mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">{r.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{r.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
