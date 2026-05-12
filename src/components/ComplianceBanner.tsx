"use client";

import { Info } from "lucide-react";

export default function ComplianceBanner({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] text-slate-400">
        Internal workspace only. Do not upload patient identifiers or confidential clinical data.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <p>Internal workspace only. Do not upload patient identifiers, procedure notes, raw transcripts, or confidential clinical data.</p>
    </div>
  );
}
