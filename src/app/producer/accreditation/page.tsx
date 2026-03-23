"use client";

/* ================================================================
   PRODUCER ORIGIN DOSSIER — Chain of Custody Intake Gateway
   ================================================================
   Mines produce unrefined Doré / Scrap, NOT LBMA bars.
   This page captures the mine-level origin data and Chain of
   Custody documentation. On submission, navigates to inventory.

   ZERO-SCROLL: absolute inset-0 layout — everything fits in one
   viewport with no scrollbars. Compressed header + grid form.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import LbmaVerificationPanel, {
  type LbmaAccreditationData,
} from "@/components/compliance/LbmaVerificationPanel";

export default function ProducerAccreditationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: LbmaAccreditationData) => {
    setIsSubmitting(true);

    // Persist origin dossier client-side
    sessionStorage.setItem(
      "aurumshield:producer-origin-dossier",
      JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
    );

    // TODO: POST to /api/producer/origin-dossier for DB persistence
    // Defined interface: { mineName, originCountry, siteCoordinates, annualDoreOutput, cocDocumentRef }

    setTimeout(() => {
      router.push("/producer/inventory/new");
    }, 800);
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">
      {/* ── Compact Header ── */}
      <div className="shrink-0 border-b border-slate-800 px-5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-primary/10">
              <MapPin className="h-3.5 w-3.5 text-gold-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Mine Origin &amp; Chain of Custody
              </h1>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">
                Producer Origin Dossier · Provenance Verification · OECD Compliance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form fills remaining viewport ── */}
      <div className="flex-1 min-h-0 flex flex-col px-5 py-3">
        <LbmaVerificationPanel
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-5 py-1.5 flex items-center justify-between">
        <p className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
          AurumShield Clearing · Origin Provenance Engine · Producer Perimeter Enforcement
        </p>
        <div className="flex items-center gap-1.5">
          <span className="bg-emerald-500 animate-pulse w-1.5 h-1.5 rounded-full shrink-0" />
          <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
            DORÉ INTAKE: ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
