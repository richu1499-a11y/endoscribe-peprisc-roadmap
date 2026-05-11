"use client";

import { useEffect, useState, useCallback } from "react";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import { getCurrentRole, canEdit as checkCanEdit } from "@/lib/auth";
import ComplianceBanner from "@/components/ComplianceBanner";
import { Plus, X, CalendarDays, Download } from "lucide-react";

interface Meeting { id: string; title: string; description: string; start_time: string | null; end_time: string | null; status: string; location: string; meeting_link: string; related_workspace_slug: string; attendee_emails: string[] }

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

  async function handleAdd(form: Partial<Meeting>) {
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error("Not connected");
      const { data: { user } } = await sb.auth.getUser();
      const { error: err } = await sb.from("meetings").insert({ ...form, organizer_id: user?.id ?? null, created_by: user?.id ?? null });
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
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <CalendarDays className="h-4 w-4 inline mr-1" />
        Download .ics files to add meetings to Google Calendar, Outlook, or Apple Calendar. Direct sync requires OAuth and will be available in a future update.
      </div>

      <ComplianceBanner />

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
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.start_time ? new Date(m.start_time).toLocaleString() : "No time set"}
                    {m.location && ` | ${m.location}`}
                    {m.meeting_link && ` | Link`}
                  </p>
                  {m.description && <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>}
                </div>
                <a href={`/api/meetings/${m.id}/ics`} download className="flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" /> .ics
                </a>
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
              <div key={m.id} className="px-4 py-2.5 flex items-center justify-between opacity-60">
                <div>
                  <p className="text-sm text-slate-700">{m.title}</p>
                  <p className="text-xs text-slate-400">{m.start_time ? new Date(m.start_time).toLocaleString() : "--"}</p>
                </div>
                <a href={`/api/meetings/${m.id}/ics`} download className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-50">
                  <Download className="h-3 w-3" /> .ics
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAdd && <MeetingForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />}
    </div>
  );
}

function MeetingForm({ onSave, onCancel }: { onSave: (form: Partial<Meeting>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [attendeeEmails, setAttendeeEmails] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startDt = startDate && startTime ? `${startDate}T${startTime}` : startDate ? `${startDate}T09:00` : null;
    const endDt = startDate && endTime ? `${startDate}T${endTime}` : startDt ? new Date(new Date(startDt).getTime() + 3600000).toISOString() : null;
    const emails = attendeeEmails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    onSave({ title, description, start_time: startDt, end_time: endDt, location, meeting_link: meetingLink, attendee_emails: emails, status: "planned" } as Partial<Meeting>);
  }

  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  const l = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">Schedule Meeting</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className={l}>Title *</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} placeholder="PI Weekly Review" autoFocus required /></div>
          <div><label className={l}>Description / Agenda</label><textarea className={c + " h-16"} value={description} onChange={e => setDescription(e.target.value)} placeholder="Meeting agenda..." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={l}>Date</label><input type="date" className={c} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label className={l}>Start time</label><input type="time" className={c} value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div><label className={l}>End time</label><input type="time" className={c} value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={l}>Location</label><input className={c} value={location} onChange={e => setLocation(e.target.value)} placeholder="Room / building" /></div>
            <div><label className={l}>Meeting link</label><input className={c} value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://..." /></div>
          </div>
          <div><label className={l}>Attendee emails (comma-separated)</label><input className={c} value={attendeeEmails} onChange={e => setAttendeeEmails(e.target.value)} placeholder="name@jh.edu, name2@jh.edu" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Create Meeting</button>
          </div>
        </form>
      </div>
    </div>
  );
}
