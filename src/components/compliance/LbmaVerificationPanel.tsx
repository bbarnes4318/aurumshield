"use client";

/* ================================================================
   PRODUCER ORIGIN DOSSIER — Chain of Custody Intake
   ================================================================
   Mines produce unrefined Doré or Scrap — NOT LBMA bars.
   LBMA Good Delivery status is generated downstream at the
   Partner Refinery after assay and minting.

   This panel captures the mine-level origin data:
     · Mine / Site identification
     · Origin country & coordinates
     · Estimated annual Doré output
     · Chain of Custody documentation reference

   Props:
     onSubmit(data) — Called when the form is valid and submitted.
     isSubmitting   — External loading state control.
   ================================================================ */

import { useState } from "react";
import { Shield, ChevronRight, Terminal, MapPin } from "lucide-react";

/* ----------------------------------------------------------------
   TYPES
   ---------------------------------------------------------------- */
export interface ProducerOriginData {
  mineName: string;
  originCountry: string;
  siteCoordinates: string;
  annualDoreOutput: string;
  cocDocumentRef: string;
}

/** @deprecated Use ProducerOriginData — kept for backward compat */
export type LbmaAccreditationData = ProducerOriginData;

interface LbmaVerificationPanelProps {
  onSubmit: (data: ProducerOriginData) => void | Promise<void>;
  isSubmitting?: boolean;
}

/* ================================================================
   COMPONENT
   ================================================================ */
export default function LbmaVerificationPanel({
  onSubmit,
  isSubmitting = false,
}: LbmaVerificationPanelProps) {
  const [mineName, setMineName] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [siteCoordinates, setSiteCoordinates] = useState("");
  const [annualDoreOutput, setAnnualDoreOutput] = useState("");
  const [cocDocumentRef, setCocDocumentRef] = useState("");

  const canSubmit =
    mineName.trim().length > 0 &&
    originCountry.trim().length > 0 &&
    annualDoreOutput.trim().length > 0 &&
    cocDocumentRef.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    await onSubmit({
      mineName: mineName.trim(),
      originCountry: originCountry.trim(),
      siteCoordinates: siteCoordinates.trim(),
      annualDoreOutput: annualDoreOutput.trim(),
      cocDocumentRef: cocDocumentRef.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* ── Form Panel ── */}
      <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-3 mb-2">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <MapPin className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
            Mine Origin — Chain of Custody Dossier
          </span>
        </div>

        <div className="space-y-3">
          {/* Input 1: Mine / Site Name */}
          <div>
            <label
              htmlFor="origin-mineName"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Mine / Site Name
            </label>
            <input
              id="origin-mineName"
              type="text"
              value={mineName}
              onChange={(e) => setMineName(e.target.value)}
              placeholder="Kibali Gold Mine"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Input 2: Origin Country */}
          <div>
            <label
              htmlFor="origin-country"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Origin Country
            </label>
            <input
              id="origin-country"
              type="text"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              placeholder="Democratic Republic of Congo"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Input 3: Site GPS Coordinates */}
          <div>
            <label
              htmlFor="origin-coords"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Site Coordinates (Optional)
            </label>
            <input
              id="origin-coords"
              type="text"
              value={siteCoordinates}
              onChange={(e) => setSiteCoordinates(e.target.value)}
              placeholder="3.5833° N, 29.5833° E"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
            />
          </div>

          {/* Input 4: Annual Doré Output */}
          <div>
            <label
              htmlFor="origin-output"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Annual Doré Output (Tonnes)
            </label>
            <input
              id="origin-output"
              type="text"
              value={annualDoreOutput}
              onChange={(e) => setAnnualDoreOutput(e.target.value)}
              placeholder="12.5"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
            />
          </div>

          {/* Input 5: Chain of Custody Document Reference */}
          <div>
            <label
              htmlFor="origin-coc"
              className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1"
            >
              Chain of Custody Document Ref
            </label>
            <input
              id="origin-coc"
              type="text"
              value={cocDocumentRef}
              onChange={(e) => setCocDocumentRef(e.target.value.toUpperCase())}
              placeholder="COC-2026-KBL-0041"
              disabled={isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm pl-3 pr-3 py-2 font-mono text-sm text-white uppercase placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
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
            AWAITING CHAIN OF CUSTODY VERIFICATION...
          </p>
          <p className="font-mono text-xs text-slate-600">
            <span className="text-slate-700 select-none">{"> "}</span>
            ORIGIN_PROVENANCE_ENGINE: STANDBY
          </p>
          <p className="font-mono text-xs text-slate-600">
            <span className="text-slate-700 select-none">{"> "}</span>
            OECD_CONFLICT_SCREEN: STANDBY
          </p>
          <p className="font-mono text-xs text-slate-700 flex items-center gap-1">
            <span className="text-slate-700 select-none">{"> "}</span>
            DORÉ_INTAKE_ENGINE: READY
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
              Verifying Origin Provenance...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Submit Origin Dossier
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
          SUBMISSION CONSTITUTES A LEGAL DECLARATION OF MINERAL ORIGIN &amp; CHAIN OF CUSTODY.
        </span>
      </div>
    </form>
  );
}
