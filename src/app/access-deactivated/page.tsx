"use client";

import Image from "next/image";
import { signOut } from "@/lib/auth";
import { UserX } from "lucide-react";

export default function AccessDeactivatedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <Image src="/endoscribe-mark.svg" alt="" width={40} height={40} className="mb-4 opacity-40" />
      <UserX className="h-10 w-10 text-slate-300 mb-4" />
      <h1 className="text-xl font-semibold text-slate-800">Access deactivated</h1>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">Your access to EndoScribe has been deactivated. Please contact an administrator to restore access.</p>
      <button onClick={async () => { await signOut(); window.location.href = "/login"; }} className="mt-6 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Sign out</button>
    </div>
  );
}
