"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";
import type { RoadmapTask } from "./roadmapTypes";
import { getTasks } from "./roadmapStore";

/**
 * Subscribe to real-time task changes via Supabase Realtime.
 * Returns a cleanup function. No-ops gracefully in mock mode.
 */
export function subscribeToTaskChanges(
  onChange: (tasks: RoadmapTask[]) => void
): { unsubscribe: () => void } {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };
  const client = getSupabaseBrowser();
  if (!client) return { unsubscribe: () => {} };

  const channel = client
    .channel("realtime-tasks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      async () => {
        const fresh = await getTasks();
        onChange(fresh);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to changes across multiple roadmap tables.
 * Fires the callback when any of tasks, milestones, risks, or decisions change.
 */
export function subscribeToRoadmapChanges(
  onChange: () => void
): { unsubscribe: () => void } {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };
  const client = getSupabaseBrowser();
  if (!client) return { unsubscribe: () => {} };

  const tables = ["tasks", "milestones", "risks", "decisions"] as const;
  const channel = client.channel("realtime-roadmap");

  for (const table of tables) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onChange()
    );
  }

  channel.subscribe();

  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}
