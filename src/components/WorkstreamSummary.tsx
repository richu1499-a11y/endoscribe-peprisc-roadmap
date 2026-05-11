"use client";

import type { Workstream, RoadmapTask } from "@/lib/roadmapTypes";
import { countWhere } from "@/lib/roadmapUtils";

interface Props {
  workstreams: Workstream[];
  tasks: RoadmapTask[];
}

export default function WorkstreamSummary({ workstreams, tasks }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workstreams.map(ws => {
        const wsTasks = tasks.filter(t => t.workstream_id === ws.id);
        const total = wsTasks.length;
        const blocked = countWhere(wsTasks, t => t.status === "Blocked");
        const critical = countWhere(wsTasks, t => t.priority === "Critical");
        const complete = countWhere(wsTasks, t => t.status === "Complete");

        return (
          <div key={ws.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800">{ws.label}</h4>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ws.purpose}</p>
            <div className="mt-3 flex gap-4 text-xs text-slate-600">
              <span>{total} tasks</span>
              <span className="text-green-600">{complete} done</span>
              {blocked > 0 && <span className="text-red-600">{blocked} blocked</span>}
              {critical > 0 && <span className="font-semibold text-red-700">{critical} critical</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
