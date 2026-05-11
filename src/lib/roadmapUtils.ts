import { RoadmapTask, Workstream } from "./roadmapTypes";

/** Get the workstream label by ID */
export function wsLabel(workstreams: Workstream[], wsId: string): string {
  return workstreams.find(w => w.id === wsId)?.label ?? wsId;
}

/** Unique sorted values from a string field across tasks */
export function uniqueValues(tasks: RoadmapTask[], field: keyof RoadmapTask): string[] {
  const vals = new Set<string>();
  for (const t of tasks) {
    const v = t[field];
    if (typeof v === "string" && v) vals.add(v);
  }
  return Array.from(vals).sort();
}

/** Count tasks matching a filter */
export function countWhere(tasks: RoadmapTask[], pred: (t: RoadmapTask) => boolean): number {
  return tasks.filter(pred).length;
}

/** Tasks due within N days from today */
export function tasksDueSoon(tasks: RoadmapTask[], days: number): RoadmapTask[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return tasks.filter(t => {
    if (!t.target_date) return false;
    return new Date(t.target_date) <= cutoff;
  });
}
