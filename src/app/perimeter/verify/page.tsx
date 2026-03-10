"use client";

/* ================================================================
   VERIFICATION PORTAL — Compliance Perimeter Phase 1
   ================================================================
   Veriff integration mock: Identity upload, KYB fields, AML screen.
   Three glassmorphism compliance cards. No backend logic yet.
   ================================================================ */

import { useState, useCallback } from "react";
import {
  Upload,
  Building2,
  ShieldAlert,
  Lock,
  FileText,
  Globe,
  Hash,
} from "lucide-react";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";

export default function VerifyPortalPage() {
  /* ── KYB Form State ── */
  const [entityName, setEntityName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [lei, setLei] = useState("");

  /* ── Upload State ── */
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadedFile(file.name);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(() => {
    // Simulate file selection
    setUploadedFile("passport_scan.pdf");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* ── Header ── */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/40">
            <ShieldAlert className="h-7 w-7" style={{ color: BRAND_GOLD }} />
          </div>
          <div className="text-center">
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: BRAND_GOLD }}
            >
              Institutional Onboarding // AML & KYC
            </p>
            <p className="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-slate-500">
              Complete all three verification modules to gain marketplace
              access. Data is encrypted at rest and in transit.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-1.5">
            <Lock className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              0 / 3 Modules Complete
            </span>
          </div>
        </div>

        {/* ── Compliance Cards Grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ════════════════════════════════════════════
               CARD 1 — Identity Document Upload
             ════════════════════════════════════════════ */}
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            {/* Card header */}
            <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <FileText className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  Module 01
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Identity Document
                </h3>
              </div>
            </div>

            {/* Card body */}
            <div className="flex flex-1 flex-col p-5">
              <p className="mb-4 font-mono text-[10px] leading-relaxed text-slate-500">
                Upload a government-issued photo ID. Accepted: Passport,
                National ID, or Driver&apos;s License.
              </p>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleFileSelect}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 transition-all ${
                  uploadedFile
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : isDragOver
                      ? "border-[#c6a86b]/50 bg-[#c6a86b]/5"
                      : "border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950/80"
                }`}
                role="button"
                tabIndex={0}
                aria-label="Upload identity document"
              >
                {uploadedFile ? (
                  <>
                    <FileText className="mb-2 h-6 w-6 text-emerald-400" />
                    <p className="font-mono text-xs font-semibold text-emerald-400">
                      {uploadedFile}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-emerald-500/60">
                      UPLOADED — PENDING REVIEW
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-6 w-6 text-slate-600" />
                    <p className="font-mono text-[11px] font-semibold text-slate-400">
                      Drop file or click to select
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-slate-600">
                      PDF, JPG, PNG · Max 10 MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════
               CARD 2 — Corporate Identity (KYB)
             ════════════════════════════════════════════ */}
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            {/* Card header */}
            <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <Building2 className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  Module 02
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Corporate Identity (KYB)
                </h3>
              </div>
            </div>

            {/* Card body */}
            <div className="flex flex-1 flex-col gap-4 p-5">
              <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                Provide your corporate registration details. LEI must be a valid
                20-character GLEIF identifier.
              </p>

              {/* Entity Name */}
              <div>
                <label
                  htmlFor="entity-name"
                  className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500"
                >
                  <Building2 className="h-3 w-3" />
                  Entity Name
                </label>
                <input
                  id="entity-name"
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Meridian Sovereign Capital Ltd."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-700 transition-all focus:border-[#c6a86b]/40 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/20"
                />
              </div>

              {/* Jurisdiction */}
              <div>
                <label
                  htmlFor="jurisdiction"
                  className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500"
                >
                  <Globe className="h-3 w-3" />
                  Jurisdiction
                </label>
                <input
                  id="jurisdiction"
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="England & Wales"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-700 transition-all focus:border-[#c6a86b]/40 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/20"
                />
              </div>

              {/* LEI */}
              <div>
                <label
                  htmlFor="lei"
                  className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500"
                >
                  <Hash className="h-3 w-3" />
                  Legal Entity Identifier (LEI)
                </label>
                <input
                  id="lei"
                  type="text"
                  value={lei}
                  onChange={(e) => setLei(e.target.value)}
                  placeholder="549300MZUFH0KT7JLU16"
                  maxLength={20}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs tracking-wider text-slate-200 placeholder:text-slate-700 transition-all focus:border-[#c6a86b]/40 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/20"
                />
                <p className="mt-1 font-mono text-[9px] text-slate-600">
                  20-character GLEIF-issued identifier
                </p>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════
               CARD 3 — AML/OFAC Screening
             ════════════════════════════════════════════ */}
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            {/* Card header */}
            <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <ShieldAlert className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  Module 03
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  AML / OFAC Screening
                </h3>
              </div>
            </div>

            {/* Card body — Terminal Output */}
            <div className="flex flex-1 flex-col p-5">
              <p className="mb-4 font-mono text-[10px] leading-relaxed text-slate-500">
                Automated sanctions screening against OFAC SDN, EU Consolidated
                List, and UN Security Council registries.
              </p>

              {/* Terminal window */}
              <div className="flex-1 rounded-lg border border-slate-800/60 bg-slate-950/80 p-4">
                {/* Terminal dots */}
                <div className="mb-3 flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500/40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500/40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" />
                  <span className="ml-2 font-mono text-[7px] uppercase tracking-wider text-slate-700">
                    aml-gateway
                  </span>
                </div>

                {/* Terminal output lines */}
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-700">$</span>
                    <span>Connecting to sanctions registry...</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-700">$</span>
                    <span>OFAC SDN List — standby</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-700">$</span>
                    <span>EU Consolidated List — standby</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-700">$</span>
                    <span>UN Security Council — standby</span>
                  </div>

                  {/* Pulsing status */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500" />
                    </span>
                    <span className="animate-pulse text-slate-500">
                      AWAITING CLEARANCE...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Locked Proceed Button ── */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled
            className="flex w-full max-w-xl cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-8 py-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-600 transition-all"
          >
            <Lock className="h-4 w-4 text-slate-700" />
            [ PROCEED TO MARKETPLACE (AWAITING CLEARANCE) ]
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
              End-to-End Encrypted
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-800">|</span>
          <span className="font-mono text-[9px] text-slate-700">
            Perimeter v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
