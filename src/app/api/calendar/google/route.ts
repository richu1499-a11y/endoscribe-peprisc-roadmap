import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Google Calendar sync requires secure OAuth token storage and Google Calendar API scopes. Use .ics export for now." },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { status: "not_implemented", message: "Google Calendar sync will be available in a future update." },
    { status: 501 }
  );
}
