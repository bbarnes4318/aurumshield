"use client";

/* ================================================================
   SOVEREIGN ASSAY GAUNTLET — Producer Physical Asset Proof
   ================================================================
   Mandatory intake form for Good Delivery bullion. Requires:
     1. Ultrasonic Thickness measurement (mm)
     2. 4-Point Conductivity (% IACS)
     3. Certified Assay Report PDF upload → AUTO-PARSED by Textract
     4. Sovereign Carrier handoff (Brink's / Malca-Amit)
     5. Legal attestation under penalty of perjury

   Forgery Defense:
     On PDF upload, the component immediately calls parseAssayDocument()
     to extract scientific data via AWS Textract. The extracted values
     are displayed in a terminal-style output and cross-checked against
     the Producer's manual input in real-time. Mismatches are highlighted
     in blazing red with PROVENANCE MISMATCH errors.

   This component does NOT submit independently — it exposes its
   data via the onDataChange callback. The parent page collects
   this data and submits it as part of the full asset ingestion flow.
   ================================================================ */

import { useState, useCallback, useRef } from "react";
import {
  Shield,
  Upload,
  FileText,
  Truck,
  Scale,
  Zap,
  AlertTriangle,
  Terminal,
  Loader2,
} from "lucide-react";
import type { SovereignCarrier } from "@/lib/delivery/asset-registry.types";
import type { AssayFieldExtractionResult } from "@/lib/services/textract-service";
import {
  parseAssayDocument,
  type TextractAssayParseResult,
} from "@/actions/inventory-actions";

/* ================================================================
   TYPES
   ================================================================ */

export interface AssayGauntletData {
  ultrasonicThicknessMm: number | null;
  conductivityIacs: number | null;
  assayerName: string;
  assayFile: File | null;
  carrier: SovereignCarrier | "";
  trackingReference: string;
  tarmacPickupAt: string;
  destinationVault: string;
  legalAttestationAccepted: boolean;
  /** Textract extraction result for server-side cross-check. */
  textractResult: TextractAssayParseResult | null;
}

interface SovereignAssayGauntletProps {
  disabled?: boolean;
  onDataChange: (data: AssayGauntletData) => void;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const CERTIFIED_ASSAYERS = [
  "Argor-Heraeus",
  "Valcambi",
  "PAMP SA",
  "Metalor Technologies",
  "Royal Canadian Mint",
  "Perth Mint",
  "Other (Specify)",
];

const DESTINATION_VAULTS = [
  { value: "zurich-ftz", label: "Zurich Free Trade Zone" },
  { value: "london-lbma", label: "London LBMA Vault" },
  { value: "singapore-freeport", label: "Singapore FTZ (Le Freeport)" },
  { value: "dubai-dmcc", label: "Dubai DMCC Vault" },
  { value: "hong-kong-malca", label: "Hong Kong (Malca-Amit)" },
  { value: "new-york-hsbc", label: "New York HSBC Vault" },
];

const ATTESTATION_TEXT =
  "I declare under penalty of perjury that this asset has undergone independent ultrasonic and conductivity testing, confirming zero subsurface tungsten or base-metal anomalies.";

/** Tolerance for mismatch detection (0.1 matches server-side gate). */
const MISMATCH_TOLERANCE = 0.1;

/* ================================================================
   HELPERS
   ================================================================ */

/** Check if a user input value mismatches a Textract-extracted value. */
function hasMismatch(
  userValue: string,
  textractValue: number | null | undefined,
): boolean {
  if (textractValue == null || !userValue) return false;
  const parsed = parseFloat(userValue);
  if (isNaN(parsed)) return false;
  return Math.abs(parsed - textractValue) > MISMATCH_TOLERANCE;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function SovereignAssayGauntlet({
  disabled = false,
  onDataChange,
}: SovereignAssayGauntletProps) {
  /* ── Local State ── */
  const [ultrasonicThickness, setUltrasonicThickness] = useState("");
  const [conductivity, setConductivity] = useState("");
  const [assayerName, setAssayerName] = useState("");
  const [assayFile, setAssayFile] = useState<File | null>(null);
  const [carrier, setCarrier] = useState<SovereignCarrier | "">("");
  const [trackingReference, setTrackingReference] = useState("");
  const [tarmacPickupAt, setTarmacPickupAt] = useState("");
  const [destinationVault, setDestinationVault] = useState("");
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  /* ── Textract State ── */
  const [isParsingDocument, setIsParsingDocument] = useState(false);
  const [textractResult, setTextractResult] =
    useState<TextractAssayParseResult | null>(null);
  const [textractError, setTextractError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Derived: extract assay fields for mismatch comparison ── */
  const extractedFields: AssayFieldExtractionResult | null =
    textractResult?.assayFields ?? null;

  /** Whether the ultrasonic thickness input has a provenance mismatch. */
  const thicknessMismatch = hasMismatch(
    ultrasonicThickness,
    extractedFields?.ultrasonicThicknessMm,
  );
  /** Whether the conductivity input has a provenance mismatch. */
  const conductivityMismatch = hasMismatch(
    conductivity,
    extractedFields?.conductivityIacs,
  );

  /* ── Emit data upstream on every change ── */
  const emitChange = useCallback(
    (overrides: Partial<AssayGauntletData> = {}) => {
      const base: AssayGauntletData = {
        ultrasonicThicknessMm: ultrasonicThickness
          ? parseFloat(ultrasonicThickness)
          : null,
        conductivityIacs: conductivity ? parseFloat(conductivity) : null,
        assayerName,
        assayFile,
        carrier,
        trackingReference,
        tarmacPickupAt,
        destinationVault,
        legalAttestationAccepted: attestationAccepted,
        textractResult,
      };
      onDataChange({ ...base, ...overrides });
    },
    [
      ultrasonicThickness,
      conductivity,
      assayerName,
      assayFile,
      carrier,
      trackingReference,
      tarmacPickupAt,
      destinationVault,
      attestationAccepted,
      textractResult,
      onDataChange,
    ],
  );

  /* ── Textract Auto-Parse ── */
  const triggerTextractParse = useCallback(
    async (file: File) => {
      setIsParsingDocument(true);
      setTextractError(null);
      setTextractResult(null);

      try {
        const fd = new FormData();
        fd.append("assayFile", file);
        const result = await parseAssayDocument(fd);

        setTextractResult(result);
        if (!result.success && result.error) {
          setTextractError(result.error);
        }

        // Push the Textract result upstream immediately
        emitChange({ textractResult: result, assayFile: file });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Textract parsing failed.";
        setTextractError(message);
      } finally {
        setIsParsingDocument(false);
      }
    },
    [emitChange],
  );

  /* ── File Handling (triggers auto-parse) ── */
  const handleFileAccepted = useCallback(
    (file: File) => {
      setAssayFile(file);
      emitChange({ assayFile: file });
      triggerTextractParse(file);
    },
    [emitChange, triggerTextractParse],
  );

  /* ── Drag & Drop Handlers ── */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDragOver) setIsDragOver(true);
    },
    [isDragOver],
  );

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      const pdf = files.find((f) => f.type === "application/pdf");
      if (pdf) {
        handleFileAccepted(pdf);
      }
    },
    [handleFileAccepted],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (file) {
        handleFileAccepted(file);
      }
    },
    [handleFileAccepted],
  );

  /* ── Shared input classes ── */
  const inputCls =
    "w-full bg-slate-950 border border-slate-700 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50";
  const inputMismatchCls =
    "w-full bg-slate-950 border-2 border-red-500 shadow-[inset_0_1px_0_0_rgba(220,38,38,0.25)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50";
  const labelCls =
    "font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2";

  return (
    <div className="space-y-8">
      {/* ── Section Header ── */}
      <div className="flex items-center gap-3">
        <Shield className="h-4 w-4 text-gold-primary" />
        <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
          Sovereign Assay Gauntlet
        </span>
      </div>

      <p className="font-mono text-slate-500 text-xs leading-relaxed max-w-3xl">
        All Good Delivery bullion must pass independent ultrasonic thickness
        gauging and 4-point conductivity testing before a cryptographic title
        can be minted. Upload the certified assay report and log the armored
        transit handoff.
      </p>

      {/* ── 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─────────────────────────────────────────────────
           LEFT: Scientific Measurements + Assay Upload
           ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Sub-header */}
          <div className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Metallurgical Proof
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 space-y-5">
            {/* Ultrasonic Thickness */}
            <div>
              <label htmlFor="ultrasonicThickness" className={labelCls}>
                Ultrasonic Thickness (mm)
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-slate-600 text-xs select-none">
                  mm
                </span>
                <input
                  id="ultrasonicThickness"
                  name="ultrasonicThickness"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="25.400"
                  disabled={disabled}
                  value={ultrasonicThickness}
                  onChange={(e) => {
                    setUltrasonicThickness(e.target.value);
                    emitChange({
                      ultrasonicThicknessMm: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    });
                  }}
                  className={thicknessMismatch ? inputMismatchCls : inputCls}
                />
              </div>
              {thicknessMismatch && (
                <p className="font-mono text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  PROVENANCE MISMATCH: Input does not match documented assay.
                  Textract read{" "}
                  <span className="text-white font-bold">
                    {extractedFields?.ultrasonicThicknessMm}mm
                  </span>
                </p>
              )}
            </div>

            {/* Conductivity */}
            <div>
              <label htmlFor="conductivityIacs" className={labelCls}>
                Conductivity (% IACS)
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-slate-600 text-xs select-none">
                  % IACS
                </span>
                <input
                  id="conductivityIacs"
                  name="conductivityIacs"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="72.50"
                  disabled={disabled}
                  value={conductivity}
                  onChange={(e) => {
                    setConductivity(e.target.value);
                    emitChange({
                      conductivityIacs: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    });
                  }}
                  className={conductivityMismatch ? inputMismatchCls : inputCls}
                />
              </div>
              {conductivityMismatch && (
                <p className="font-mono text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  PROVENANCE MISMATCH: Input does not match documented assay.
                  Textract read{" "}
                  <span className="text-white font-bold">
                    {extractedFields?.conductivityIacs}% IACS
                  </span>
                </p>
              )}
            </div>

            {/* Assayer Name */}
            <div>
              <label htmlFor="assayerName" className={labelCls}>
                Certified Assayer
              </label>
              <select
                id="assayerName"
                name="assayerName"
                disabled={disabled}
                value={assayerName}
                onChange={(e) => {
                  setAssayerName(e.target.value);
                  emitChange({ assayerName: e.target.value });
                }}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="" className="text-slate-600">
                  Select certified assayer...
                </option>
                {CERTIFIED_ASSAYERS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Assay PDF Dropzone ── */}
          <div className="flex items-center gap-2 mt-2">
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Assay Report Upload
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            name="assayReport"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`bg-slate-900 border-2 border-dashed shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] h-40 flex flex-col items-center justify-center transition-all cursor-pointer ${
              isParsingDocument
                ? "border-cyan-500/40 bg-cyan-500/5"
                : isDragOver
                  ? "border-gold-primary bg-gold-primary/5"
                  : assayFile
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-slate-700 hover:border-gold-primary"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            {isParsingDocument ? (
              <>
                <Loader2 className="h-6 w-6 text-cyan-400 mb-2 animate-spin" />
                <span className="font-mono text-sm text-cyan-400">
                  TEXTRACT ANALYZING...
                </span>
                <span className="font-mono text-[10px] text-cyan-400/60 mt-1">
                  Extracting metallurgical data from document
                </span>
              </>
            ) : assayFile ? (
              <>
                <FileText className="h-6 w-6 text-emerald-400 mb-2" />
                <span className="font-mono text-sm text-emerald-400">
                  {assayFile.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500 mt-1">
                  {(assayFile.size / 1024).toFixed(1)} KB · PDF LOADED
                </span>
              </>
            ) : (
              <>
                <Upload
                  className={`h-6 w-6 mb-2 ${isDragOver ? "text-gold-primary" : "text-slate-600"}`}
                />
                <p className="font-mono text-xs text-slate-400 text-center px-4">
                  Drop Certified Assay Report (PDF)
                </p>
                <p className="font-mono text-[10px] text-slate-600 mt-1">
                  Argor-Heraeus · Valcambi · PAMP · Perth Mint
                </p>
              </>
            )}
          </div>

          {/* ── TEXTRACT TERMINAL OUTPUT ── */}
          {(isParsingDocument || textractResult || textractError) && (
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4 font-mono text-[11px] space-y-1.5 overflow-x-auto">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-cyan-400 text-[10px] tracking-[0.2em] uppercase">
                  AWS Textract ML Extraction Engine
                </span>
              </div>

              {isParsingDocument && (
                <>
                  <p className="text-cyan-400">
                    [TEXTRACT] Analyzing document...{" "}
                    <span className="animate-pulse">████████</span>
                  </p>
                  <p className="text-slate-600">
                    [SYSTEM] Awaiting ML pipeline response...
                  </p>
                </>
              )}

              {textractError && !isParsingDocument && (
                <p className="text-red-400">
                  [ERROR] {textractError}
                </p>
              )}

              {textractResult && !isParsingDocument && (
                <>
                  <p className="text-emerald-400">
                    [TEXTRACT] Analysis COMPLETE ██████████
                  </p>

                  {/* Thickness */}
                  <p className={extractedFields?.ultrasonicThicknessMm != null ? "text-emerald-400" : "text-amber-500"}>
                    [SYSTEM] Extracted Thickness:{" "}
                    {extractedFields?.ultrasonicThicknessMm != null
                      ? `${extractedFields.ultrasonicThicknessMm}mm`
                      : "NOT FOUND"}
                  </p>

                  {/* Conductivity */}
                  <p className={extractedFields?.conductivityIacs != null ? "text-emerald-400" : "text-amber-500"}>
                    [SYSTEM] Extracted Conductivity:{" "}
                    {extractedFields?.conductivityIacs != null
                      ? `${extractedFields.conductivityIacs}% IACS`
                      : "NOT FOUND"}
                  </p>

                  {/* Assayer */}
                  <p className={extractedFields?.assayerName ? "text-emerald-400" : "text-amber-500"}>
                    [SYSTEM] Extracted Assayer:{" "}
                    {extractedFields?.assayerName ?? "NOT FOUND"}
                  </p>

                  {/* Serial */}
                  <p className={extractedFields?.serialNumber ? "text-emerald-400" : "text-amber-500"}>
                    [SYSTEM] Extracted Serial:{" "}
                    {extractedFields?.serialNumber ?? "NOT FOUND"}
                  </p>

                  {/* Purity (from existing textract-service) */}
                  {textractResult.extractedPurity && (
                    <p className="text-slate-500">
                      [SYSTEM] Extracted Purity: {textractResult.extractedPurity}
                    </p>
                  )}

                  {/* Weight (from existing textract-service) */}
                  {textractResult.extractedWeightOz != null && (
                    <p className="text-slate-500">
                      [SYSTEM] Extracted Weight: {textractResult.extractedWeightOz} oz
                    </p>
                  )}

                  {/* Mismatch warnings */}
                  {thicknessMismatch && (
                    <p className="text-red-400 mt-2 font-bold">
                      ⚠ THICKNESS MISMATCH: User={ultrasonicThickness}mm vs Textract={extractedFields?.ultrasonicThicknessMm}mm
                    </p>
                  )}
                  {conductivityMismatch && (
                    <p className="text-red-400 font-bold">
                      ⚠ CONDUCTIVITY MISMATCH: User={conductivity}% vs Textract={extractedFields?.conductivityIacs}%
                    </p>
                  )}

                  {/* Raw lines count */}
                  <p className="text-slate-700 mt-2">
                    [META] {textractResult.allExtractedLines.length} text lines extracted from document
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────
           RIGHT: Transit Handoff + Legal Attestation
           ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Sub-header */}
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Armored Transit Handoff
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 space-y-5">
            {/* Sovereign Carrier */}
            <div>
              <label htmlFor="sovereignCarrier" className={labelCls}>
                Sovereign Carrier
              </label>
              <select
                id="sovereignCarrier"
                name="carrier"
                disabled={disabled}
                value={carrier}
                onChange={(e) => {
                  const val = e.target.value as SovereignCarrier | "";
                  setCarrier(val);
                  emitChange({ carrier: val });
                }}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="" className="text-slate-600">
                  Select armored carrier...
                </option>
                <option value="BRINKS">Brink&apos;s Global Services</option>
                <option value="MALCA_AMIT">Malca-Amit</option>
              </select>
            </div>

            {/* Air Waybill / Tracking Reference */}
            <div>
              <label htmlFor="trackingReference" className={labelCls}>
                Air Waybill / Tracking Reference
              </label>
              <input
                id="trackingReference"
                name="trackingReference"
                type="text"
                placeholder="AWB-2026-0314-ZRH"
                disabled={disabled}
                value={trackingReference}
                onChange={(e) => {
                  setTrackingReference(e.target.value.toUpperCase());
                  emitChange({
                    trackingReference: e.target.value.toUpperCase(),
                  });
                }}
                className={inputCls}
              />
            </div>

            {/* Tarmac Pickup Timestamp */}
            <div>
              <label htmlFor="tarmacPickupAt" className={labelCls}>
                Tarmac Pickup (UTC)
              </label>
              <input
                id="tarmacPickupAt"
                name="tarmacPickupAt"
                type="datetime-local"
                disabled={disabled}
                value={tarmacPickupAt}
                onChange={(e) => {
                  setTarmacPickupAt(e.target.value);
                  emitChange({ tarmacPickupAt: e.target.value });
                }}
                className={inputCls}
              />
            </div>

            {/* Destination Vault */}
            <div>
              <label htmlFor="destinationVault" className={labelCls}>
                Destination Vault
              </label>
              <select
                id="destinationVault"
                name="destinationVault"
                disabled={disabled}
                value={destinationVault}
                onChange={(e) => {
                  setDestinationVault(e.target.value);
                  emitChange({ destinationVault: e.target.value });
                }}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="" className="text-slate-600">
                  Select destination vault...
                </option>
                {DESTINATION_VAULTS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Legal Attestation ── */}
          <div className="flex items-center gap-2 mt-2">
            <Zap className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Legal Attestation
            </span>
          </div>

          <div className="bg-slate-900 border border-red-900/30 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                name="legalAttestation"
                checked={attestationAccepted}
                disabled={disabled}
                onChange={(e) => {
                  setAttestationAccepted(e.target.checked);
                  emitChange({
                    legalAttestationAccepted: e.target.checked,
                  });
                }}
                className="mt-1 h-5 w-5 shrink-0 appearance-none border-2 border-slate-600 bg-slate-950 checked:bg-gold-primary checked:border-gold-primary transition-colors cursor-pointer"
              />
              <div>
                <p className="font-mono text-xs text-red-400/90 font-bold tracking-wider uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Mandatory Legal Declaration
                </p>
                <p className="font-mono text-[11px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {ATTESTATION_TEXT}
                </p>
              </div>
            </label>
          </div>

          {/* Status strip */}
          <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4">
            <div className="space-y-1 font-mono text-[10px]">
              <p className="text-slate-600 flex items-center gap-2">
                ULTRASONIC:{" "}
                <span
                  className={
                    thicknessMismatch
                      ? "text-red-400"
                      : ultrasonicThickness
                        ? "text-emerald-400"
                        : "text-slate-700"
                  }
                >
                  {thicknessMismatch
                    ? `${ultrasonicThickness} mm ✗ MISMATCH`
                    : ultrasonicThickness
                      ? `${ultrasonicThickness} mm ✓`
                      : "AWAITING"}
                </span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                CONDUCTIVITY:{" "}
                <span
                  className={
                    conductivityMismatch
                      ? "text-red-400"
                      : conductivity
                        ? "text-emerald-400"
                        : "text-slate-700"
                  }
                >
                  {conductivityMismatch
                    ? `${conductivity}% IACS ✗ MISMATCH`
                    : conductivity
                      ? `${conductivity}% IACS ✓`
                      : "AWAITING"}
                </span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                ASSAY REPORT:{" "}
                <span
                  className={
                    assayFile ? "text-emerald-400" : "text-slate-700"
                  }
                >
                  {assayFile ? "UPLOADED ✓" : "AWAITING"}
                </span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                TEXTRACT:{" "}
                <span
                  className={
                    isParsingDocument
                      ? "text-cyan-400"
                      : textractResult?.success
                        ? "text-emerald-400"
                        : textractError
                          ? "text-red-400"
                          : "text-slate-700"
                  }
                >
                  {isParsingDocument
                    ? "PARSING..."
                    : textractResult?.success
                      ? "EXTRACTED ✓"
                      : textractError
                        ? "FAILED ✗"
                        : "AWAITING"}
                </span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                CARRIER:{" "}
                <span
                  className={carrier ? "text-emerald-400" : "text-slate-700"}
                >
                  {carrier ? `${carrier} ✓` : "AWAITING"}
                </span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                ATTESTATION:{" "}
                <span
                  className={
                    attestationAccepted
                      ? "text-emerald-400"
                      : "text-red-400/60"
                  }
                >
                  {attestationAccepted ? "SIGNED ✓" : "NOT SIGNED"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
