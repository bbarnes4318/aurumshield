"use client";

/* ================================================================
   ASSET INGESTION ENGINE — Mint Digital Twin (ERC-3643)
   ================================================================
   Phase 2, Step 2. The accredited Producer uploads a certified
   Fire Assay Report and provides bar-level metadata. The VLM
   engine parses trace elements and fineness to mint an immutable
   cryptographic title (Digital Twin) for the physical asset.
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Shield,
  ChevronRight,
  FileText,
  Fingerprint,
  MapPin,
  ScanLine,
} from "lucide-react";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

/* ----------------------------------------------------------------
   VAULT JURISDICTIONS
   ---------------------------------------------------------------- */
const VAULT_JURISDICTIONS = [
  { value: "zurich-malca-amit", label: "Zurich Free Trade Zone (Malca-Amit)" },
  { value: "london-brinks", label: "London (Brink's LBMA Vault)" },
  { value: "singapore-sg", label: "Singapore FTZ (Le Freeport)" },
  { value: "dubai-dmcc", label: "Dubai (DMCC Vault)" },
  { value: "hong-kong-mt", label: "Hong Kong (Malca-Amit)" },
  { value: "new-york-hsbc", label: "New York (HSBC Vault)" },
];

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono text-sm flex items-center gap-2 w-fit">
      {value}
      <button
        onClick={handleCopy}
        className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer"
      >
        [ COPY ]
      </button>
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function AssetIngestionPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  /* ── Asset Metadata State ── */
  const [serialNumber, setSerialNumber] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [castingYear, setCastingYear] = useState("");
  const [vaultJurisdiction, setVaultJurisdiction] = useState("");

  /* ── VLM Scanning Simulation ── */
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => setIsScanning(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  /* ── Drag & Drop Handlers ── */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDragOver) setIsDragOver(true);
    },
    [isDragOver],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setIsScanning(true);
      // TODO: Upload to API / parse via VLM engine
      console.log("[Ingestion] File dropped:", files[0].name);
      setTimeout(() => {
        setUploadedFile(files[0].name);
      }, 3500);
    }
  }, []);

  /* ── Mint CTA ── */
  const handleMint = () => {
    setIsMinting(true);
    // TODO: Submit to minting engine
    console.log("[Ingestion] Minting digital twin:", {
      serialNumber,
      grossWeight,
      castingYear,
      vaultJurisdiction,
      assayReport: uploadedFile,
    });
    setTimeout(() => setIsMinting(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-6xl mx-auto p-8 pt-12">
        {/* ── Header ── */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-5">
            <Fingerprint className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Asset Ingestion
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Mint Digital Twin (ERC-3643)
          </h1>

          <p className="font-mono text-slate-500 text-sm leading-relaxed max-w-3xl">
            Upload a certified Fire Assay Report and provide bar-level custody
            metadata. The VLM engine will extract trace element profiles and
            fineness for cryptographic title minting.
          </p>
        </div>

        {/* ── 2-Column Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* ─────────────────────────────────────────────────────
             LEFT COLUMN — Document Upload
             ───────────────────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                Assay Report Upload
              </span>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-slate-900 border-2 border-dashed shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] h-64 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isScanning
                  ? "border-emerald-500/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]"
                  : isDragOver
                    ? "border-gold-primary bg-gold-primary/5"
                    : uploadedFile
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-slate-700 hover:border-gold-primary"
              }`}
            >
              {isScanning ? (
                /* ── Forensic VLM Scanning State ── */
                <>
                  <div className="h-12 w-12 rounded-sm bg-emerald-500/10 flex items-center justify-center mb-4">
                    <ScanLine className="h-6 w-6 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 text-center px-6">
                    <p className="font-mono text-emerald-400 text-xs">
                      {"> "}EXTRACTING METALLURGICAL DATA...{" "}
                      <span className="text-white">[ 99.99% CONFIDENCE ]</span>
                    </p>
                    <p className="font-mono text-emerald-400/60 text-[10px]">
                      {"> "}TRACE_ELEMENTS: Au 999.9 | Ag 0.002 | Cu 0.001
                    </p>
                    <p className="font-mono text-emerald-400/40 text-[10px] flex items-center justify-center gap-1">
                      {"> "}TENSORLAKE_OCR: PROCESSING
                      <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse" />
                    </p>
                  </div>
                </>
              ) : uploadedFile ? (
                /* ── File Uploaded State ── */
                <>
                  <div className="h-12 w-12 rounded-sm bg-emerald-500/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="font-mono text-sm text-emerald-400 mb-1">
                    {uploadedFile}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">
                    VLM Parse Complete — Ready for Minting
                  </span>
                </>
              ) : (
                /* ── Empty State ── */
                <>
                  <div className="h-14 w-14 rounded-sm bg-slate-800 flex items-center justify-center mb-5">
                    <Upload
                      className={`h-7 w-7 ${
                        isDragOver ? "text-gold-primary" : "text-slate-600"
                      }`}
                    />
                  </div>
                  <p className="font-mono text-xs text-slate-400 mb-2 text-center px-4">
                    Drag & Drop Certified Fire Assay Report (PDF)
                  </p>
                  <p className="font-mono text-[10px] text-slate-600 text-center px-6">
                    VLM engine will automatically extract trace elements and
                    fineness.
                  </p>
                </>
              )}
            </div>

            {/* Upload metadata */}
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4">
              <div className="space-y-1.5 font-mono text-[10px]">
                <p className="text-slate-600">
                  ACCEPTED: PDF · PNG · TIFF · Max 50MB
                </p>
                <p className="text-slate-700">
                  PARSER: Computer Vision (VLM) · Trace Element Extraction
                </p>
                <p className="text-slate-700 flex items-center gap-1">
                  STATUS:{" "}
                  {isScanning ? (
                    <span className="text-emerald-400">SCANNING...</span>
                  ) : uploadedFile ? (
                    <span className="text-emerald-400">PARSE COMPLETE</span>
                  ) : (
                    <span className="text-slate-600">AWAITING UPLOAD</span>
                  )}
                  <span className="inline-block w-1.5 h-3 bg-gold-primary ml-1 animate-pulse" />
                </p>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────
             RIGHT COLUMN — Asset Metadata
             ───────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                Asset Metadata — Bar-Level Registry
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 space-y-5">
              {/* Input 1: Bar Serial Number */}
              <div>
                <label
                  htmlFor="serialNumber"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  Bar Serial Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">
                    #
                  </span>
                  <input
                    id="serialNumber"
                    type="text"
                    value={serialNumber}
                    onChange={(e) =>
                      setSerialNumber(e.target.value.toUpperCase())
                    }
                    placeholder="VCB-2025-883492"
                    className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm pl-8 pr-4 py-3 font-mono text-sm text-white uppercase placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                  />
                </div>
                {/* Live Serial Badge Preview */}
                {serialNumber.trim() && (
                  <div className="mt-2">
                    <HashBadge value={serialNumber} />
                  </div>
                )}
              </div>

              {/* Input 2: Gross Weight */}
              <div>
                <label
                  htmlFor="grossWeight"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  Gross Weight (Troy Ounces)
                </label>
                <input
                  id="grossWeight"
                  type="text"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  placeholder="401.125"
                  className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums"
                />
              </div>

              {/* Input 3: Casting Year */}
              <div>
                <label
                  htmlFor="castingYear"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
                >
                  Casting Year
                </label>
                <input
                  id="castingYear"
                  type="text"
                  value={castingYear}
                  onChange={(e) => setCastingYear(e.target.value)}
                  placeholder="2025"
                  className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums"
                />
              </div>

              {/* Input 4: Vault Jurisdiction */}
              <div>
                <label
                  htmlFor="vaultJurisdiction"
                  className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5"
                >
                  <MapPin className="h-3 w-3" />
                  Vault Jurisdiction
                </label>
                <select
                  id="vaultJurisdiction"
                  value={vaultJurisdiction}
                  onChange={(e) => setVaultJurisdiction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="text-slate-600">
                    Select custodial jurisdiction...
                  </option>
                  {VAULT_JURISDICTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metadata summary strip */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">
                    TOKEN_STANDARD: ERC-3643
                  </span>
                  <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">
                    CUSTODY: ALLOCATED
                  </span>
                  <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">
                    PROVENANCE: IMMUTABLE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="mt-10">
          <button
            onClick={handleMint}
            disabled={isMinting}
            className={`w-full font-bold text-sm tracking-wide py-4 flex items-center justify-center gap-2 transition-colors font-mono ${
              isMinting
                ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
            }`}
          >
            {isMinting ? (
              <>
                <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Parsing Assay Report & Minting Title...
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4" />
                Parse Assay & Mint Cryptographic Title
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
            MINTING A DIGITAL TWIN CONSTITUTES A LEGAL ATTESTATION OF PROVENANCE AND PHYSICAL CUSTODY.
          </span>
        </div>

        {/* ── Footer trust line ── */}
        <p className="mt-12 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · ERC-3643 Digital Twin · Fire Assay VLM
          Parser · Immutable Provenance Ledger
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
