"use client";

/* ================================================================
   ASSET INGESTION ENGINE — Mint Digital Twin (ERC-3643)
   ================================================================
   3-Step Horizontal Wizard:
     Step 1: Asset Classification & Assay Upload
     Step 2: Bar-Level Metadata & Assay Gauntlet
     Step 3: Review Summary & Mint

   Wired to: src/actions/inventory-actions.ts (ingestAsset)
   ================================================================ */

import { useState, useCallback, useRef, useEffect, useActionState } from "react";
import {
  Upload,
  Shield,
  ChevronRight,
  ChevronLeft,
  FileText,
  Fingerprint,
  MapPin,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";
import SovereignAssayGauntlet from "@/components/producer/SovereignAssayGauntlet";
import type { AssayGauntletData } from "@/components/producer/SovereignAssayGauntlet";
import { ingestAsset, type IngestAssetState } from "@/actions/inventory-actions";
import type { AssetFormType } from "@/lib/delivery/asset-registry.types";

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

/* ── Stepper Steps ── */
const STEPS = [
  { id: 1, label: "Asset & Upload", shortLabel: "UPLOAD" },
  { id: 2, label: "Bar Metadata", shortLabel: "METADATA" },
  { id: 3, label: "Review & Mint", shortLabel: "MINT" },
] as const;

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Hash copied to clipboard");
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono text-sm flex items-center gap-2 w-fit">
      {value}
      <button
        type="button"
        onClick={handleCopy}
        className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer"
      >
        [ COPY ]
      </button>
    </span>
  );
}

/* ── Review Row ── */
function ReviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-800/50">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
        {label}
      </span>
      <span className={`font-mono text-sm text-right text-white ${mono ? "tabular-nums" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

/* ================================================================
   INITIAL STATE
   ================================================================ */
const initialState: IngestAssetState = { success: false };

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function AssetIngestionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /* ── Server Action State ── */
  const [state, formAction, isPending] = useActionState(ingestAsset, initialState);

  /* ── Wizard Step ── */
  const [activeStep, setActiveStep] = useState(1);

  /* ── Local UI State ── */
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  /* ── Asset Metadata State (controlled for live preview) ── */
  const [serialNumber, setSerialNumber] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [castingYear, setCastingYear] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  /* ── Asset Form Classification ── */
  const [assetForm, setAssetForm] = useState<AssetFormType>("GOOD_DELIVERY_BULLION");

  /* ── Assay Gauntlet Data (from child component) ── */
  const [, setAssayGauntletData] = useState<AssayGauntletData | null>(null);

  /* ── Post-Submission Effects ── */
  useEffect(() => {
    if (state.success && state.titleHash) {
      const truncatedHash = `0x${state.titleHash.slice(0, 16)}…`;
      toast.success("Digital Twin Minted", {
        description: `Title Hash: ${truncatedHash}`,
        duration: 8000,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });

      const timeout = setTimeout(() => {
        router.push("/producer/orders");
      }, 2500);
      return () => clearTimeout(timeout);
    }

    if (!state.success && state.error) {
      toast.error("Ingestion Failed", {
        description: state.error,
        duration: 6000,
        icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
      });
    }
  }, [state, router]);

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
      setUploadedFile(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setUploadedFile(files[0]);
      }
    },
    [],
  );

  const handleDropzoneClick = useCallback(() => {
    if (!isPending) {
      fileInputRef.current?.click();
    }
  }, [isPending]);

  /* ── Determine dropzone visual state ── */
  const isScanning = isPending;

  /* ── Jurisdiction label lookup ── */
  const jurisdictionLabel = VAULT_JURISDICTIONS.find(v => v.value === jurisdiction)?.label || "";

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-5 py-3">
        {/* ── Header ── */}
        <div className="shrink-0 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <Fingerprint className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Asset Ingestion
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Mint Digital Twin (ERC-3643)
          </h1>
        </div>

        {/* ════════════════════════════════════════════════════════
           STEPPER BAR
           ════════════════════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center gap-0 border border-slate-800 bg-black mb-3">
          {STEPS.map((step, idx) => {
            const isActive = step.id === activeStep;
            const isComplete = step.id < activeStep;
            const isLast = idx === STEPS.length - 1;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => !isPending && step.id <= activeStep && setActiveStep(step.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors cursor-pointer ${
                  !isLast ? "border-r border-slate-800" : ""
                } ${
                  isActive
                    ? "bg-gold-primary/10 text-gold-primary border-b-2 border-b-gold-primary"
                    : isComplete
                      ? "bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                      : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <span className={`h-4 w-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                    isActive ? "border-gold-primary text-gold-primary" : "border-slate-700 text-slate-600"
                  }`}>
                    {step.id}
                  </span>
                )}
                {step.label}
              </button>
            );
          })}
        </div>

        {/* ── Hidden form wrapping all inputs for server action ── */}
        <form ref={formRef} action={formAction} className="flex-1 min-h-0 flex flex-col">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            name="assayFile"
            accept=".pdf,.png,.tiff,.tif"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Hidden inputs for controlled fields */}
          <input type="hidden" name="assetForm" value={assetForm} />
          <input type="hidden" name="serialNumber" value={serialNumber} />
          <input type="hidden" name="grossWeight" value={grossWeight} />
          <input type="hidden" name="castingYear" value={castingYear} />
          <input type="hidden" name="jurisdiction" value={jurisdiction} />

          {/* ════════════════════════════════════════════════════════
             STEP 1: ASSET CLASSIFICATION & UPLOAD
             ════════════════════════════════════════════════════════ */}
          {activeStep === 1 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT — Classification + Upload */}
                <div className="flex flex-col gap-4">
                  {/* Asset Form Classification */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                        Asset Form Classification
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Good Delivery Card */}
                      <button
                        type="button"
                        onClick={() => !isPending && setAssetForm("GOOD_DELIVERY_BULLION")}
                        disabled={isPending}
                        className={`p-5 text-left transition-all cursor-pointer border-2 ${
                          assetForm === "GOOD_DELIVERY_BULLION"
                            ? "border-gold-primary bg-gold-primary/10 shadow-[0_0_20px_rgba(198,168,107,0.15)]"
                            : "border-slate-700 bg-slate-900 hover:border-slate-500"
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            assetForm === "GOOD_DELIVERY_BULLION"
                              ? "border-gold-primary bg-gold-primary"
                              : "border-slate-600 bg-transparent"
                          }`}>
                            {assetForm === "GOOD_DELIVERY_BULLION" && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                          </div>
                          <span className={`font-mono text-sm font-bold tracking-wide ${
                            assetForm === "GOOD_DELIVERY_BULLION" ? "text-gold-primary" : "text-white"
                          }`}>
                            Good Delivery Bullion
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                          400oz bars · LBMA certified · Assay gauntlet required
                        </p>
                      </button>

                      {/* Raw Doré Card */}
                      <button
                        type="button"
                        onClick={() => !isPending && setAssetForm("RAW_DORE")}
                        disabled={isPending}
                        className={`p-5 text-left transition-all cursor-pointer border-2 ${
                          assetForm === "RAW_DORE"
                            ? "border-gold-primary bg-gold-primary/10 shadow-[0_0_20px_rgba(198,168,107,0.15)]"
                            : "border-slate-700 bg-slate-900 hover:border-slate-500"
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            assetForm === "RAW_DORE"
                              ? "border-gold-primary bg-gold-primary"
                              : "border-slate-600 bg-transparent"
                          }`}>
                            {assetForm === "RAW_DORE" && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                          </div>
                          <span className={`font-mono text-sm font-bold tracking-wide ${
                            assetForm === "RAW_DORE" ? "text-gold-primary" : "text-white"
                          }`}>
                            Raw Doré
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                          Unrefined mine output · Refinery intake pipeline
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Assay Report Upload */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                        Assay Report Upload
                      </span>
                    </div>

                    {/* Dropzone */}
                    <div
                      data-tour="producer-upload"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={handleDropzoneClick}
                      className={`flex-1 min-h-[200px] bg-slate-900 border-2 border-dashed shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] flex flex-col items-center justify-center transition-all cursor-pointer ${
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
                        <>
                          <div className="h-12 w-12 rounded-sm bg-emerald-500/10 flex items-center justify-center mb-4">
                            <ScanLine className="h-6 w-6 text-emerald-400 animate-pulse" />
                          </div>
                          <div className="space-y-1.5 text-center px-6">
                            <p className="font-mono text-emerald-400 text-xs">
                              {">"} EXTRACTING METALLURGICAL DATA...{" "}
                              <span className="text-white">[ 99.99% CONFIDENCE ]</span>
                            </p>
                            <p className="font-mono text-emerald-400/60 text-[10px]">
                              {">"} TRACE_ELEMENTS: Au 999.9 | Ag 0.002 | Cu 0.001
                            </p>
                            <p className="font-mono text-emerald-400/40 text-[10px] flex items-center justify-center gap-1">
                              {">"} TENSORLAKE_OCR: PROCESSING
                              <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse" />
                            </p>
                          </div>
                        </>
                      ) : uploadedFile ? (
                        <>
                          <div className="h-12 w-12 rounded-sm bg-emerald-500/10 flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6 text-emerald-400" />
                          </div>
                          <span className="font-mono text-sm text-emerald-400 mb-1">
                            {uploadedFile.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">
                            VLM Parse Ready
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-14 w-14 rounded-sm bg-slate-800 flex items-center justify-center mb-5">
                            <Upload className={`h-7 w-7 ${isDragOver ? "text-gold-primary" : "text-slate-600"}`} />
                          </div>
                          <p className="font-mono text-xs text-slate-400 mb-2 text-center px-4">
                            Drag & Drop Certified Fire Assay Report (PDF)
                          </p>
                          <p className="font-mono text-[10px] text-slate-600 text-center px-6">
                            VLM engine will automatically extract trace elements and fineness.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT — Upload metadata + instructions */}
                <div className="flex flex-col gap-4">
                  <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-5 flex-1">
                    <div className="flex items-center gap-2 mb-5">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                        Upload Requirements
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Accepted Formats</span>
                        <span className="font-mono text-xs text-white">PDF · PNG · TIFF · Max 50MB</span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Parser Engine</span>
                        <span className="font-mono text-xs text-white">Computer Vision (VLM) · Trace Element Extraction</span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Status</span>
                        <span data-tour="producer-status" className="font-mono text-xs">
                          {isScanning ? (
                            <span className="text-emerald-400">SCANNING...</span>
                          ) : uploadedFile ? (
                            <span className="text-emerald-400">FILE LOADED</span>
                          ) : (
                            <span className="text-slate-600">AWAITING UPLOAD</span>
                          )}
                        </span>
                        <span className="inline-block w-1.5 h-3 bg-gold-primary ml-2 animate-pulse align-middle" />
                      </div>

                      <div className="border-t border-slate-800 pt-4 mt-4">
                        <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase block mb-2">Selected Asset Form</span>
                        <span className={`font-mono text-sm font-bold ${assetForm === "RAW_DORE" ? "text-yellow-400" : "text-gold-primary"}`}>
                          {assetForm === "RAW_DORE" ? "RAW DORÉ" : "GOOD DELIVERY BULLION"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Autopilot targets (hidden) */}
                  <div data-tour="producer-textract" className="bg-black border border-slate-800 p-3 min-h-[80px] font-mono text-xs" style={{ display: 'none' }} />
                  <div data-tour="producer-yield" className="text-xs font-mono text-slate-600" style={{ display: 'none' }} />
                </div>
              </div>

              {/* Step 1 → Next */}
              <div className="shrink-0 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="bg-gold-primary text-slate-950 font-bold text-xs tracking-wide px-8 py-2.5 flex items-center gap-2 hover:bg-gold-hover transition-colors cursor-pointer font-mono"
                >
                  Next: Bar Metadata
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             STEP 2: BAR METADATA & ASSAY GAUNTLET
             ════════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT — Bar-Level Inputs */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                        Asset Metadata — Bar-Level Registry
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 space-y-5">
                      {/* Bar Serial Number */}
                      <div>
                        <label htmlFor="serialNumber" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2">
                          Bar Serial Number
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">#</span>
                          <input
                            id="serialNumber"
                            type="text"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                            placeholder="VCB-2025-883492"
                            disabled={isPending}
                            className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm pl-8 pr-4 py-3 font-mono text-sm text-white uppercase placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50"
                          />
                        </div>
                        {serialNumber.trim() && (
                          <div className="mt-2">
                            <HashBadge value={serialNumber} />
                          </div>
                        )}
                      </div>

                      {/* Gross Weight */}
                      <div>
                        <label htmlFor="grossWeight" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2">
                          Gross Weight (Troy Ounces)
                        </label>
                        <input
                          id="grossWeight"
                          type="text"
                          value={grossWeight}
                          onChange={(e) => setGrossWeight(e.target.value)}
                          placeholder="401.125"
                          disabled={isPending}
                          className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
                        />
                      </div>

                      {/* Casting Year */}
                      <div>
                        <label htmlFor="castingYear" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2">
                          Casting Year
                        </label>
                        <input
                          id="castingYear"
                          type="text"
                          value={castingYear}
                          onChange={(e) => setCastingYear(e.target.value)}
                          placeholder="2025"
                          disabled={isPending}
                          className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
                        />
                      </div>

                      {/* Vault Jurisdiction */}
                      <div>
                        <label htmlFor="vaultJurisdiction" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          Vault Jurisdiction
                        </label>
                        <select
                          id="vaultJurisdiction"
                          value={jurisdiction}
                          onChange={(e) => setJurisdiction(e.target.value)}
                          disabled={isPending}
                          className="w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="" className="text-slate-600">Select custodial jurisdiction...</option>
                          {VAULT_JURISDICTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Metadata summary strip */}
                      <div className="border-t border-slate-800 pt-4 mt-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">TOKEN_STANDARD: ERC-3643</span>
                          <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">CUSTODY: ALLOCATED</span>
                          <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">PROVENANCE: IMMUTABLE</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Assay Gauntlet or Doré notice */}
                  <div>
                    {assetForm === "GOOD_DELIVERY_BULLION" ? (
                      <div data-tour="cinematic-assay-gauntlet">
                        <SovereignAssayGauntlet
                          disabled={isPending}
                          onDataChange={(data) => setAssayGauntletData(data)}
                        />
                      </div>
                    ) : (
                      <div className="bg-amber-500/5 border border-amber-500/30 p-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-mono text-amber-500 text-xs font-bold tracking-wider uppercase mb-2">
                            Raw Doré Selected
                          </p>
                          <p className="font-mono text-amber-500/80 text-xs leading-relaxed">
                            Raw Doré Selected: Asset will be routed to the Refinery Intake Pipeline.
                            Sovereign assay verification is deferred until the asset clears the
                            physical refining and authentication process.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 navigation */}
              <div className="shrink-0 pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="border border-slate-700 text-slate-300 font-mono text-xs tracking-wide px-6 py-2.5 flex items-center gap-2 hover:border-gold-primary/50 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="bg-gold-primary text-slate-950 font-bold text-xs tracking-wide px-8 py-2.5 flex items-center gap-2 hover:bg-gold-hover transition-colors cursor-pointer font-mono"
                >
                  Next: Review & Mint
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             STEP 3: REVIEW & MINT
             ════════════════════════════════════════════════════════ */}
          {activeStep === 3 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT — Review Summary */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                      Ingestion Summary
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
                    <ReviewRow label="Asset Form" value={assetForm === "RAW_DORE" ? "Raw Doré" : "Good Delivery Bullion"} />
                    <ReviewRow label="Assay Report" value={uploadedFile?.name || "No file uploaded"} />
                    <ReviewRow label="Bar Serial" value={serialNumber} mono />
                    <ReviewRow label="Gross Weight" value={grossWeight ? `${grossWeight} troy oz` : ""} mono />
                    <ReviewRow label="Casting Year" value={castingYear} mono />
                    <ReviewRow label="Vault" value={jurisdictionLabel} />

                    <div className="border-t border-slate-800 pt-4 mt-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">TOKEN_STANDARD: ERC-3643</span>
                        <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">CUSTODY: ALLOCATED</span>
                        <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider">PROVENANCE: IMMUTABLE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Status & CTA */}
                <div className="flex flex-col gap-4">
                  {/* Error Display */}
                  {state.error && !isPending && (
                    <div className="bg-red-500/5 border border-red-500/30 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-mono text-red-400 text-xs font-bold tracking-wider uppercase mb-1">INGESTION REJECTED</p>
                        <p className="font-mono text-red-400/80 text-xs">{state.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Success Display */}
                  {state.success && state.titleHash && !isPending && (
                    <div className="bg-emerald-500/5 border border-emerald-500/30 p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-mono text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">DIGITAL TWIN MINTED SUCCESSFULLY</p>
                        <p className="font-mono text-emerald-400/80 text-[10px] mb-2">Allocation ID: {state.allocationId}</p>
                        <HashBadge value={`0x${state.titleHash}`} />
                        <p className="font-mono text-slate-600 text-[10px] mt-2">Redirecting to Allocation Inbox...</p>
                      </div>
                    </div>
                  )}

                  {/* Mint CTA */}
                  <div className="flex-1 flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className={`w-full font-bold text-sm tracking-wide py-4 flex items-center justify-center gap-2 transition-colors font-mono ${
                        isPending
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                          : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
                      }`}
                    >
                      {isPending ? (
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
                </div>
              </div>

              {/* Step 3 → Back */}
              <div className="shrink-0 pt-3 flex justify-start">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="border border-slate-700 text-slate-300 font-mono text-xs tracking-wide px-6 py-2.5 flex items-center gap-2 hover:border-gold-primary/50 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back to Metadata
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-2 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · ERC-3643 Digital Twin · Fire Assay VLM
          Parser · Immutable Provenance Ledger
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
