"use client";

import { useEffect, useState, useCallback } from "react";
import { getTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentAppRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import { clsx } from "clsx";

const WS_COLORS: Record<string, string> = {
  "endoscribe-core-template-engine": "#0d9488",
  "voice-asr-room-workflow": "#f59e0b",
  "peprisc-prediction-models": "#8b5cf6",
  "recommendation-engine": "#ec4899",
  "analytics-quality": "#14b8a6",
  "infrastructure-deployment-strategy": "#06b6d4",
  "validation-regulatory-translation": "#ef4444",
};

const WS_SCOPE: Record<string, string[]> = {
  "endoscribe-core-template-engine": [
    "ERCP, EUS, and colonoscopy template refinement",
    "Template coverage expansion",
    "Multi-agentic / adaptive template framework",
    "Clinician dictation and note workflow",
    "Patient-identifier masking and transcript safety",
  ],
  "voice-asr-room-workflow": [
    "Med ASR evaluation and model comparison",
    "Phone vs operating-room microphone testing",
    "Multi-speaker / diarization handling",
    "Relevant-speech capture",
    "ASR hosting and latency considerations",
  ],
  "peprisc-prediction-models": [
    "Hands-free PEPRisc calculation",
    "Real-time or trigger-based workflow",
    "PEPRisc ground-truth comparison",
    "Prediction-model drift monitoring",
    "Future prediction models beyond PEPRisc",
  ],
  "recommendation-engine": [
    "Refine existing recommendation logics",
    "Recommendation engine expansion",
    "Guideline-update strategy",
    "Recommendation validation",
    "MVP recommendation set",
  ],
  "analytics-quality": [
    "EndoScribe KPIs and quality metrics",
    "Provider-level analytics framework",
    "Facility-level analytics framework",
    "Dashboard/reporting requirements",
    "Future benchmarking concepts",
  ],
  "infrastructure-deployment-strategy": [
    "Systems architecture and data-flow diagram",
    "MVP and long-term deployment strategy",
    "Hopkins/DSAI compute and GPU strategy",
    "Database and queue architecture",
    "CI/CD pipeline and federated learning",
  ],
  "validation-regulatory-translation": [
    "EndoScribe and PEPRisc prospective validation",
    "IRB amendment and ASGE protocol alignment",
    "Non-interventional / shadow-mode study design",
    "FDA Pre-Sub preparation",
    "Regulatory question list",
  ],
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setTasks(enriched);
    setWorkspaces(ws.filter(w => w.is_visible));
    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id ?? null);
    }
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  const [now] = useState(() => new Date().toISOString().slice(0, 10));
  const activeTasks = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workspaces</h1>
        <p className="text-base text-slate-500 mt-2">
          {workspaces.length} strategic verticals &middot; {activeTasks.length} active tasks
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {workspaces.map(ws => {
          const wt = activeTasks.filter(t => t.workspace === ws.slug);
          const high = wt.filter(t => t.priority === "Critical" || t.priority === "High").length;
          const dueSoon = wt.filter(t => t.target_date && t.target_date >= now && t.target_date <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)).length;
          const color = WS_COLORS[ws.slug] ?? "#64748b";
          const scope = WS_SCOPE[ws.slug] ?? [];

          return (
            <div key={ws.slug} className="rounded-2xl border border-slate-200 bg-white p-7 hover:shadow-lg transition-all">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="h-3 w-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{ws.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{ws.description}</p>
                </div>
              </div>

              {/* Scope */}
              {scope.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  {scope.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-300 mt-0.5 shrink-0">&#x2022;</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-5 text-sm">
                <div>
                  <span className="text-2xl font-bold text-slate-900">{wt.length}</span>
                  <span className="text-slate-500 ml-1.5">active</span>
                </div>
                {high > 0 && (
                  <div>
                    <span className="text-2xl font-bold text-amber-600">{high}</span>
                    <span className="text-slate-500 ml-1.5">high priority</span>
                  </div>
                )}
                {dueSoon > 0 && (
                  <div>
                    <span className="text-2xl font-bold text-teal-600">{dueSoon}</span>
                    <span className="text-slate-500 ml-1.5">due soon</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <p className="text-lg text-slate-500">No workspaces configured.</p>
        </div>
      )}
    </div>
  );
}
