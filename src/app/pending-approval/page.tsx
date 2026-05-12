"use client";

import Image from "next/image";
import { signOut } from "@/lib/auth";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <Image src="/endoscribe-mark.svg" alt="" width={40} height={40} className="mb-4 opacity-40" />
      <Clock className="h-10 w-10 text-amber-400 mb-4" />
      <h1 className="text-xl font-semibold text-slate-800">Pending approval</h1>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">Your account is pending administrator approval. You will be able to access EndoScribe once an admin activates your account.</p>
      <button onClick={async () => { await signOut(); window.location.href = "/login"; }} className="mt-6 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Sign out</button>
    </div>
  );
}
