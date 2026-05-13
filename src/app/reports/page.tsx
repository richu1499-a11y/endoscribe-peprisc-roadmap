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
  { title: "FDA / Regulatory", description: "Regulatory strategy and intended use matrix.", icon: Shield, href: "/regulatory" },
  { title: "IRB / Compliance", description: "Data governance and institutional review.", icon: Lock, href: "/governance" },
  { title: "Validation Science", description: "Evidence ladder and metrics matrix.", icon: FlaskConical, href: "/validation" },
];

export default function ReportsPage() {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Summaries, exports, and analysis.</p>
      </div>

      {/* Roadmap prominent entry */}
      <Link href="/roadmap" className="flex items-center gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-6 hover:shadow-lg transition-all">
        <Network className="h-8 w-8 text-indigo-600 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Roadmap</h2>
          <p className="text-sm text-slate-500 mt-0.5">Executive overview, workspace board, and interactive dependency map.</p>
        </div>
      </Link>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map(r => (
            <div key={r.title} className="rounded-2xl border border-slate-200 bg-white p-6 opacity-60">
              <r.icon className="h-6 w-6 text-slate-400 mb-3" />
              <h3 className="text-base font-semibold text-slate-700">{r.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{r.description}</p>
              <p className="mt-3 text-xs text-slate-400 italic">Coming soon</p>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ADVANCED.map(r => (
                <Link key={r.title} href={r.href} className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all">
                  <r.icon className="h-6 w-6 text-indigo-500 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800">{r.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{r.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
