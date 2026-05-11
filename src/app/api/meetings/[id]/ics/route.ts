import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function pad(n: number): string { return n.toString().padStart(2, "0"); }

function toIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escIcs(s: string): string {
  return (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) { try { for (const { name, value, options } of cookiesToSet) { cookieStore.set(name, value, options); } } catch { /* read-only context */ } },
    },
  });

  const { data: meeting, error } = await supabase.from("meetings").select("*").eq("id", id).single();
  if (error || !meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const uid = meeting.ics_uid || `meeting-${meeting.id}@endoscribe-os`;
  const seq = meeting.ics_sequence ?? 0;
  const now = new Date();
  const start = meeting.start_time ? new Date(meeting.start_time) : now;
  const end = meeting.end_time ? new Date(meeting.end_time) : new Date(start.getTime() + 60 * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EndoScribe Workspace OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escIcs(meeting.title)}`,
    meeting.description ? `DESCRIPTION:${escIcs(meeting.description)}` : null,
    meeting.location ? `LOCATION:${escIcs(meeting.location)}` : null,
    meeting.meeting_link ? `URL:${meeting.meeting_link}` : null,
    `SEQUENCE:${seq}`,
    `STATUS:CONFIRMED`,
  ];

  // Add attendees
  const emails: string[] = meeting.attendee_emails ?? [];
  for (const email of emails) {
    lines.push(`ATTENDEE;RSVP=TRUE:mailto:${email}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const icsContent = lines.filter(Boolean).join("\r\n");

  // Update ics metadata (best-effort)
  await supabase.from("meetings").update({
    ics_uid: uid,
    ics_sequence: seq,
    ics_last_generated_at: now.toISOString(),
  }).eq("id", id);

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
    },
  });
}
