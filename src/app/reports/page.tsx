"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, GanttChart, Network, Shield, Lock, FlaskConical, FileText, Download, ChevronDown, ChevronRight } from "lucide-react";

const REPORTS = [
  { title: "Weekly Summary", description: "Team progress, completed tasks, and upcoming deadlines.", icon: FileText, coming: true },
  { title: "Project Status", description: "Overall roadmap health, milestones, and risk overview.", icon: BarChart3, coming: true },
  { title: "Export Center", description: "Download reports as HTML, Excel, or Markdown.", icon: Download, coming: true },
];

const ADVANCED = [
  { title: "Timeline / Gantt", description: "Interactive Gantt chart with filters and grouping.", icon: GanttChart, href: "/timeline" },
  { title: "Roadmap Map", description: "Interactive 2D/3D dependency network of tasks and workstreams.", icon: Network, href: "/network" },
  { title: "FDA / Regulatory", description: "Regulatory strategy and intended use matrix.", icon: Shield, href: "/regulatory" },
  { title: "IRB / Compliance", description: "Data governance and institutional review.", icon: Lock, href: "/governance" },
  { title: "Validation Science", description: "Evidence ladder and metrics matrix.", icon: FlaskConical, href: "/validation" },
];

export default function ReportsPage() {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Summaries, exports, and analysis.</p>
      </div>

      {/* Roadmap Map prominent entry */}
      <Link href="/network" className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5 hover:shadow-md transition-all">
        <Network className="h-8 w-8 text-indigo-600 shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-slate-900">Roadmap Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">Interactive 2D/3D dependency network showing workspaces, tasks, milestones, and relationships.</p>
        </div>
      </Link>

      <section>
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

      <section>
        <button onClick={() => setAdvancedOpen(!advancedOpen)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 mb-3">
          {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Advanced Analysis
        </button>
        {advancedOpen && (
          <>
            <p className="text-xs text-slate-500 mb-3">Deep analysis dashboards for established projects.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ADVANCED.map(r => (
                <Link key={r.title} href={r.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <r.icon className="h-5 w-5 text-indigo-500 mb-2" />
                  <h3 className="text-sm font-semibold text-slate-800">{r.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{r.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
