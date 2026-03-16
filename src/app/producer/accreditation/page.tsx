"use client";

/* ================================================================
   PRODUCER ACCREDITATION — LBMA Regulatory Gateway
   ================================================================
   Phase 2, Step 1. The Producer (refinery) must submit their
   LBMA Good Delivery credentials for automated verification
   against the Axedras Integrity Ledger before accessing
   inventory ingestion.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ChevronRight, Landmark, Terminal } from "lucide-react";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function ProducerAccreditationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [refinerName, setRefinerName] = useState("");
  const [refinerCode, setRefinerCode] = useState("");
  const [annualProduction, setAnnualProduction] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinerName.trim() || !refinerCode.trim() || !annualProduction.trim())
      return;

    setIsSubmitting(true);

    // Persist accreditation data client-side
    const accreditationData = {
      refinerName: refinerName.trim(),
      refinerCode: refinerCode.trim(),
      annualProduction: annualProduction.trim(),
      submittedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(
      "aurumshield:producer-accreditation",
      JSON.stringify(accreditationData),
    );

    // TODO: POST to /api/producer/accreditation for DB persistence
    // Server action for producer accreditation not yet created —
    // defined interface: { refinerName, refinerCode, annualProduction }

    setTimeout(() => {
      router.push("/producer/inventory/new");
    }, 800);
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-4xl w-full mx-auto px-6 py-4">
        {/* ── Header ── */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center gap-3 mb-5">
            <Landmark className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Producer Accreditation
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            LBMA Good Delivery Verification
          </h1>

          <p className="font-mono text-slate-500 text-sm leading-relaxed max-w-2xl">
            Submit your registered refiner credentials for automated
            verification against the LBMA Good Delivery List and Axedras
            Integrity Ledger. Marketplace access is gated until accreditation
            is confirmed.
          </p>
        </div>

        {/* ── Form Panel ── */}
        <form onSubmit={handleSubmit}>
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-5 mb-4">
            {/* Section Title */}
            <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-800">
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                Refiner Identification — Regulatory Dossier
              </span>
            </div>

            <div className="space-y-6">
              {/* Input 1: Registered Refiner Name */}
              <div>
                <label
                  htmlFor="refinerName"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  Registered Refiner Name
                </label>
                <input
                  id="refinerName"
                  type="text"
                  value={refinerName}
                  onChange={(e) => setRefinerName(e.target.value)}
                  placeholder="Valcambi SA"
                  className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                />
              </div>

              {/* Input 2: LBMA Refiner Code */}
              <div>
                <label
                  htmlFor="refinerCode"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  LBMA Refiner Code
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">
                    $
                  </span>
                  <input
                    id="refinerCode"
                    type="text"
                    value={refinerCode}
                    onChange={(e) => setRefinerCode(e.target.value.toUpperCase())}
                    placeholder="VCB-CH"
                    className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm pl-8 pr-4 py-3 font-mono text-sm text-white uppercase placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Input 3: Annual Refining Production */}
              <div>
                <label
                  htmlFor="annualProduction"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  Annual Refining Production (Tonnes)
                </label>
                <input
                  id="annualProduction"
                  type="text"
                  value={annualProduction}
                  onChange={(e) => setAnnualProduction(e.target.value)}
                  placeholder="45.0"
                  className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* ── Status Readout Terminal ── */}
          <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-3 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-3 w-3 text-slate-600" />
              <span className="font-mono text-slate-600 text-[9px] tracking-wider uppercase">
                System Readout
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-slate-500">
                <span className="text-slate-600 select-none">{"> "}</span>
                AWAITING AXEDRAS INTEGRITY LEDGER QUERY...
              </p>
              <p className="font-mono text-xs text-slate-600">
                <span className="text-slate-700 select-none">{"> "}</span>
                LBMA_GOOD_DELIVERY_LIST: STANDBY
              </p>
              <p className="font-mono text-xs text-slate-700 flex items-center gap-1">
                <span className="text-slate-700 select-none">{"> "}</span>
                VERIFICATION_ENGINE: READY
                <span className="inline-block w-1.5 h-3 bg-gold-primary ml-1 animate-pulse" />
              </p>
            </div>
          </div>

          {/* ── CTA ── */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-bold text-sm tracking-wide py-4 flex items-center justify-center gap-2 transition-colors font-mono ${
                isSubmitting
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Querying Axedras Ledger...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Submit for Automated Verification
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
              SUBMISSION CONSTITUTES A LEGAL DECLARATION OF LBMA GOOD DELIVERY STATUS.
            </span>
          </div>
        </form>

        <p className="mt-4 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · LBMA Good Delivery List · Axedras Integrity
          Ledger · Producer Perimeter Enforcement
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
