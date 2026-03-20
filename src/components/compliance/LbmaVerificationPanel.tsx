"use client";

/* ================================================================
   LBMA VERIFICATION PANEL — Reusable Good Delivery Accreditation
   ================================================================
   Extracted from producer/accreditation/page.tsx for reuse in
   Broker and Refinery portals. Self-contained client component.

   Props:
     onSubmit(data) — Called when the form is valid and submitted.
     isSubmitting   — External loading state control.
   ================================================================ */

import { useState } from "react";
import { Shield, ChevronRight, Terminal } from "lucide-react";

/* ----------------------------------------------------------------
   TYPES
   ---------------------------------------------------------------- */
export interface LbmaAccreditationData {
  refinerName: string;
  refinerCode: string;
  annualProduction: string;
}

interface LbmaVerificationPanelProps {
  onSubmit: (data: LbmaAccreditationData) => void | Promise<void>;
  isSubmitting?: boolean;
}

/* ================================================================
   COMPONENT
   ================================================================ */
export default function LbmaVerificationPanel({
  onSubmit,
  isSubmitting = false,
}: LbmaVerificationPanelProps) {
  const [refinerName, setRefinerName] = useState("");
  const [refinerCode, setRefinerCode] = useState("");
  const [annualProduction, setAnnualProduction] = useState("");

  const canSubmit =
    refinerName.trim().length > 0 &&
    refinerCode.trim().length > 0 &&
    annualProduction.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    await onSubmit({
      refinerName: refinerName.trim(),
      refinerCode: refinerCode.trim(),
      annualProduction: annualProduction.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* ── Form Panel ── */}
      <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-3 mb-2">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <Shield className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
            Refiner Identification — Regulatory Dossier
          </span>
        </div>

        <div className="space-y-3">
          {/* Input 1: Registered Refiner Name */}
          <div>
            <label
              htmlFor="lbma-refinerName"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Registered Refiner Name
            </label>
            <input
              id="lbma-refinerName"
              type="text"
              value={refinerName}
              onChange={(e) => setRefinerName(e.target.value)}
              placeholder="Valcambi SA"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Input 2: LBMA Refiner Code */}
          <div>
            <label
              htmlFor="lbma-refinerCode"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              LBMA Refiner Code
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">
                $
              </span>
              <input
                id="lbma-refinerCode"
                type="text"
                value={refinerCode}
                onChange={(e) => setRefinerCode(e.target.value.toUpperCase())}
                placeholder="VCB-CH"
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm pl-8 pr-3 py-2 font-mono text-sm text-white uppercase placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Input 3: Annual Refining Production */}
          <div>
            <label
              htmlFor="lbma-annualProduction"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Annual Refining Production (Tonnes)
            </label>
            <input
              id="lbma-annualProduction"
              type="text"
              value={annualProduction}
              onChange={(e) => setAnnualProduction(e.target.value)}
              placeholder="45.0"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* ── Status Readout Terminal ── */}
      <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-2.5 mb-2">
        <div className="flex items-center gap-2 mb-2">
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
          disabled={isSubmitting || !canSubmit}
          className={`w-full font-bold text-sm tracking-wide py-3 flex items-center justify-center gap-2 transition-colors font-mono ${
            isSubmitting || !canSubmit
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
  );
}
