"use client";

/* ================================================================
   PRODUCER ORIGIN DOSSIER — Chain of Custody Intake Gateway
   ================================================================
   Mines produce unrefined Doré / Scrap, NOT LBMA bars.
   This page captures the mine-level origin data and Chain of
   Custody documentation. On submission, navigates to inventory.

   NOTE: Producers land on /producer (SCADA terminal) by default.
   This page is accessed via sidebar when a producer needs to
   submit or update their origin credentials.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import LbmaVerificationPanel, {
  type LbmaAccreditationData,
} from "@/components/compliance/LbmaVerificationPanel";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

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
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-4xl w-full mx-auto px-6 py-3">
        {/* ── Header ── */}
        <div className="mb-2 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Producer Origin Dossier
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Mine Origin & Chain of Custody
          </h1>

          <p className="font-mono text-slate-500 text-sm leading-relaxed max-w-2xl">
            Submit your mine identification, origin country, and Chain of
            Custody documentation. All Doré intake is verified for provenance
            and OECD conflict-mineral compliance before transport dispatch.
          </p>
        </div>

        {/* ── Origin Dossier Form (reusable component) ── */}
        <LbmaVerificationPanel
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <p className="mt-4 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Origin Provenance Engine · Producer Perimeter
          Enforcement
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
