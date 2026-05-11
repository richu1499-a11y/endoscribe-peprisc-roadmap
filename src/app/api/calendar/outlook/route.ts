import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Outlook Calendar sync requires Microsoft OAuth and Calendars.ReadWrite scope. Use .ics export for now." },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { status: "not_implemented", message: "Outlook Calendar sync will be available in a future update." },
    { status: 501 }
  );
}
