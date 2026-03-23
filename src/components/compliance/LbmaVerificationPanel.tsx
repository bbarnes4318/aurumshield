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

   ZERO-SCROLL: 2-column grid form + inline status strip.
   Must fit within the remaining viewport below the page header.

   Props:
     onSubmit(data) — Called when the form is valid and submitted.
     isSubmitting   — External loading state control.
   ================================================================ */

import { useState } from "react";
import { Shield, ChevronRight, MapPin, Terminal } from "lucide-react";

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

  /* ── Shared classes ── */
  const inputCls =
    "w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50";
  const labelCls =
    "font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      {/* ── Form Panel — 2-Column Dense Grid ── */}
      <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-3 flex-1 min-h-0 flex flex-col">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800 shrink-0">
          <MapPin className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
            Mine Origin — Chain of Custody Dossier
          </span>
        </div>

        {/* ── 2-Column Grid: 5 fields ── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 min-h-0">
          {/* Input 1: Mine / Site Name */}
          <div>
            <label htmlFor="origin-mineName" className={labelCls}>
              Mine / Site Name
            </label>
            <input
              id="origin-mineName"
              type="text"
              value={mineName}
              onChange={(e) => setMineName(e.target.value)}
              placeholder="Kibali Gold Mine"
              disabled={isSubmitting}
              className={inputCls}
            />
          </div>

          {/* Input 2: Origin Country */}
          <div>
            <label htmlFor="origin-country" className={labelCls}>
              Origin Country
            </label>
            <input
              id="origin-country"
              type="text"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              placeholder="Democratic Republic of Congo"
              disabled={isSubmitting}
              className={inputCls}
            />
          </div>

          {/* Input 3: Site GPS Coordinates */}
          <div>
            <label htmlFor="origin-coords" className={labelCls}>
              Site Coordinates (Optional)
            </label>
            <input
              id="origin-coords"
              type="text"
              value={siteCoordinates}
              onChange={(e) => setSiteCoordinates(e.target.value)}
              placeholder="3.5833° N, 29.5833° E"
              disabled={isSubmitting}
              className={`${inputCls} tabular-nums`}
            />
          </div>

          {/* Input 4: Annual Doré Output */}
          <div>
            <label htmlFor="origin-output" className={labelCls}>
              Annual Doré Output (Tonnes)
            </label>
            <input
              id="origin-output"
              type="text"
              value={annualDoreOutput}
              onChange={(e) => setAnnualDoreOutput(e.target.value)}
              placeholder="12.5"
              disabled={isSubmitting}
              className={`${inputCls} tabular-nums`}
            />
          </div>

          {/* Input 5: Chain of Custody Document Reference — full width */}
          <div className="col-span-2">
            <label htmlFor="origin-coc" className={labelCls}>
              Chain of Custody Document Ref
            </label>
            <input
              id="origin-coc"
              type="text"
              value={cocDocumentRef}
              onChange={(e) => setCocDocumentRef(e.target.value.toUpperCase())}
              placeholder="COC-2026-KBL-0041"
              disabled={isSubmitting}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>
      </div>

      {/* ── Inline Status Strip ── */}
      <div className="bg-black border border-slate-800 border-t-0 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] px-3 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              System Readout
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-600">
            CHAIN_OF_CUSTODY: <span className={canSubmit ? "text-emerald-400" : "text-slate-700"}>
              {canSubmit ? "READY" : "AWAITING"}
            </span>
          </span>
          <span className="font-mono text-[9px] text-slate-600">
            ORIGIN_PROVENANCE: <span className="text-slate-700">STANDBY</span>
          </span>
          <span className="font-mono text-[9px] text-slate-600">
            OECD_CONFLICT_SCREEN: <span className="text-slate-700">STANDBY</span>
          </span>
          <span className="font-mono text-[9px] text-slate-700 flex items-center gap-1 ml-auto">
            DORÉ_INTAKE: READY
            <span className="inline-block w-1.5 h-3 bg-gold-primary animate-pulse" />
          </span>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mt-3 shrink-0">
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className={`w-full font-bold text-sm tracking-wide py-2.5 flex items-center justify-center gap-2 transition-colors font-mono ${
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
        <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wide mt-1.5 text-center block">
          SUBMISSION CONSTITUTES A LEGAL DECLARATION OF MINERAL ORIGIN &amp; CHAIN OF CUSTODY.
        </span>
      </div>
    </form>
  );
}
