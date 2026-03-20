"use client";

/* ================================================================
   PRODUCER ACCREDITATION — LBMA Regulatory Gateway
   ================================================================
   Uses the extracted LbmaVerificationPanel component for the
   accreditation form. On successful submission, persists data
   to sessionStorage and navigates to inventory ingestion.

   NOTE: Producers now land on /producer (SCADA terminal) by
   default. This page is accessed via sidebar navigation when
   a producer needs to submit or update their LBMA credentials.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import LbmaVerificationPanel, {
  type LbmaAccreditationData,
} from "@/components/compliance/LbmaVerificationPanel";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

export default function ProducerAccreditationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: LbmaAccreditationData) => {
    setIsSubmitting(true);

    // Persist accreditation data client-side
    sessionStorage.setItem(
      "aurumshield:producer-accreditation",
      JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
    );

    // TODO: POST to /api/producer/accreditation for DB persistence
    // Defined interface: { refinerName, refinerCode, annualProduction }

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
            <Landmark className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Producer Accreditation
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Refiner Credential Submission
          </h1>

          <p className="font-mono text-slate-500 text-sm leading-relaxed max-w-2xl">
            Submit your registered refiner credentials for automated
            verification against the Axedras Integrity Ledger. Marketplace
            access is gated until accreditation is confirmed.
          </p>
        </div>

        {/* ── LBMA Verification Form (reusable component) ── */}
        <LbmaVerificationPanel
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <p className="mt-4 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Axedras Integrity Ledger · Producer Perimeter
          Enforcement
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
