"use client";

import { useEffect, useState, useCallback } from "react";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import ComplianceBanner from "@/components/ComplianceBanner";
import { Plus, X, CalendarDays } from "lucide-react";

interface Meeting { id: string; title: string; start_time: string | null; end_time: string | null; status: string; location: string; related_workspace_slug: string }

export default function CalendarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { data } = await sb.from("meetings").select("*").order("start_time", { ascending: true });
    if (data) setMeetings(data as Meeting[]);
    const role = await getCurrentRole();
    setUserCanEdit(checkCanEdit(role));
  }, []);

  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  async function handleAdd(title: string, startTime: string) {
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error("Not connected");
      const { data: { user } } = await sb.auth.getUser();
      const { error: err } = await sb.from("meetings").insert({ title, start_time: startTime || null, organizer_id: user?.id ?? null, created_by: user?.id ?? null });
      if (err) throw err;
      setShowAdd(false);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const upcoming = meetings.filter(m => !m.start_time || new Date(m.start_time) >= new Date());
  const past = meetings.filter(m => m.start_time && new Date(m.start_time) < new Date());

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Meetings, schedule, and coordination.</p>
        </div>
        {userCanEdit && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <CalendarDays className="h-4 w-4 inline mr-1" />
        Calendar sync with Google/Outlook requires OAuth calendar permissions and will be enabled in a future update. Meetings created here are stored in the app.
      </div>

      <ComplianceBanner />

      {/* Upcoming */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-2">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No upcoming meetings.</p>
            {userCanEdit && <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-indigo-600 hover:underline">Schedule one</button>}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {upcoming.map(m => (
              <div key={m.id} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{m.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {m.start_time ? new Date(m.start_time).toLocaleString() : "No time set"}
                  {m.location && ` | ${m.location}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Past ({past.length})</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {past.map(m => (
              <div key={m.id} className="px-4 py-2.5 opacity-60">
                <p className="text-sm text-slate-700">{m.title}</p>
                <p className="text-xs text-slate-400">{m.start_time ? new Date(m.start_time).toLocaleString() : "--"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAdd && <MeetingAddModal onSave={handleAdd} onCancel={() => setShowAdd(false)} />}
    </div>
  );
}

function MeetingAddModal({ onSave, onCancel }: { onSave: (title: string, startTime: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const c = "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">Schedule Meeting</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) onSave(title.trim(), startTime); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Title</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="PI Weekly Review" autoFocus required /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label><input type="datetime-local" className={c} value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
