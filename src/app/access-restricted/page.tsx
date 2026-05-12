"use client";

import Image from "next/image";
import { signOut } from "@/lib/auth";
import { ShieldOff } from "lucide-react";

export default function AccessRestrictedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <Image src="/endoscribe-mark.svg" alt="" width={40} height={40} className="mb-4 opacity-40" />
      <ShieldOff className="h-10 w-10 text-slate-300 mb-4" />
      <h1 className="text-xl font-semibold text-slate-800">Access restricted</h1>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">This section requires administrator access. Contact your team admin if you need access.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => { window.location.href = "/"; }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-white">Go to Home</button>
        <button onClick={async () => { await signOut(); window.location.href = "/login"; }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Sign out</button>
      </div>
    </div>
  );
}
