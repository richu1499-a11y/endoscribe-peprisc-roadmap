"use client";

import { ShieldAlert } from "lucide-react";

export default function ComplianceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <p>
        <strong>Roadmap metadata only.</strong> Do not enter PHI, patient audio,
        transcripts, notes, MRNs, DOBs, accession numbers, or patient
        identifiers.
      </p>
    </div>
  );
}
