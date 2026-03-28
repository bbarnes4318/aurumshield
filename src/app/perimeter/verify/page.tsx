"use client";

/* ================================================================
   IDENTITY VERIFICATION — Veriff Integration (Mock)
   ================================================================
   3-step sequential verification:
     Step 1 → ID Document Upload (Veriff mock)
     Step 2 → Corporate Identity (KYB form)
     Step 3 → AML/OFAC Screening (simulated)
   On completion → navigates to /institutional/marketplace
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { INSTITUTIONAL_ROUTES } from "@/lib/routing/institutional-routes";
import {
  Upload,
  Building2,
  ShieldCheck,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";

type Step = 1 | 2 | 3;

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const [step, setStep] = useState<Step>(1);
  const [processing, setProcessing] = useState(false);

  /* ── Step 1: Document Upload ── */
  const [uploadedFile, setUploadedFile] = useState<string | null>(isDemoActive ? "passport_scan_demo.pdf" : null);
  const [isDragOver, setIsDragOver] = useState(false);

  /* ── Step 2: Corporate Identity ── */
  const [entityName, setEntityName] = useState(isDemoActive ? "Meridian Sovereign Capital Ltd." : "");
  const [regNumber, setRegNumber] = useState(isDemoActive ? "12345678" : "");
  const [jurisdiction, setJurisdiction] = useState(isDemoActive ? "United States" : "");

  /* ── Step 3: AML ── */
  const [amlComplete, setAmlComplete] = useState(false);

  /* ── Handlers ── */
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

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleFileSelect = useCallback(() => {
    // Open a real file picker
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setUploadedFile(file.name);
    };
    input.click();
  }, []);

  const handleStep1Submit = useCallback(() => {
    if (!uploadedFile) return;
    setStep(2);
  }, [uploadedFile]);

  const handleStep2Submit = useCallback(() => {
    if (!entityName.trim() || !regNumber.trim() || !jurisdiction.trim()) return;
    setStep(3);
    // Simulate AML screening
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setAmlComplete(true);
    }, 2500);
  }, [entityName, regNumber, jurisdiction]);

  const handleComplete = useCallback(() => {
    const demoParam = isDemoActive ? "?demo=active" : "";
    router.push(`${INSTITUTIONAL_ROUTES.MARKETPLACE}${demoParam}`);
  }, [router, isDemoActive]);

  /* ── Step Progress ── */
  const steps = [
    { num: 1, label: "Identity Document" },
    { num: 2, label: "Corporate Identity" },
    { num: 3, label: "AML / OFAC Screening" },
  ];

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Verify Your Identity
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Complete all three steps to unlock the marketplace. Your data is
          encrypted end-to-end.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step > s.num
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : step === s.num
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "bg-surface-2 text-slate-600 border border-border"
              }`}
            >
              {step > s.num ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s.num
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 transition-colors ${
                  step > s.num ? "bg-emerald-500/30" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ═══ Step 1: ID Upload ═══ */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-surface-1 p-6">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-gold" />
            <h2 className="text-base font-bold text-white">
              Upload Identity Document
            </h2>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Upload a government-issued photo ID. Accepted formats: Passport,
            National ID, or Driver&apos;s License.
          </p>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleFileSelect}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-12 transition-all ${
              uploadedFile
                ? "border-emerald-500/30 bg-emerald-500/5"
                : isDragOver
                  ? "border-gold/50 bg-gold/5"
                  : "border-border bg-surface-2/50 hover:border-slate-600"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload identity document"
          >
            {uploadedFile ? (
              <>
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">
                  {uploadedFile}
                </p>
                <p className="mt-1 text-xs text-emerald-500/60">
                  Uploaded — Click to replace
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">
                  Drop file here or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPG, PNG · Max 10 MB
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleStep1Submit}
            disabled={!uploadedFile}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-bg transition-all hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40 ${isDemoActive && uploadedFile ? DEMO_SPOTLIGHT_CLASSES : ""}`}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ Step 2: Corporate Identity (KYB) ═══ */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-surface-1 p-6">
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gold" />
            <h2 className="text-base font-bold text-white">
              Corporate Identity
            </h2>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Provide your corporate registration details for KYB verification.
          </p>

          <div className="space-y-4">
            {/* Entity Name */}
            <div>
              <label
                htmlFor="entity-name"
                className="mb-1.5 block text-xs font-semibold text-slate-400"
              >
                Entity Name
              </label>
              <input
                id="entity-name"
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Meridian Sovereign Capital Ltd."
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-all focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>

            {/* Registration Number */}
            <div>
              <label
                htmlFor="reg-number"
                className="mb-1.5 block text-xs font-semibold text-slate-400"
              >
                Registration Number
              </label>
              <input
                id="reg-number"
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="12345678"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-all focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>

            {/* Jurisdiction */}
            <div>
              <label
                htmlFor="jurisdiction"
                className="mb-1.5 block text-xs font-semibold text-slate-400"
              >
                Jurisdiction
              </label>
              <input
                id="jurisdiction"
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="United States"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-all focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleStep2Submit}
            disabled={
              !entityName.trim() || !regNumber.trim() || !jurisdiction.trim()
            }
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-bg transition-all hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40 ${isDemoActive && entityName.trim() && regNumber.trim() && jurisdiction.trim() ? DEMO_SPOTLIGHT_CLASSES : ""}`}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ Step 3: AML/OFAC Screening ═══ */}
      {step === 3 && (
        <div className="rounded-xl border border-border bg-surface-1 p-6">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-gold" />
            <h2 className="text-base font-bold text-white">
              AML / OFAC Screening
            </h2>
          </div>
          <p className="mb-6 text-sm text-slate-400">
            Automated screening against OFAC SDN, EU Consolidated List, and UN
            Security Council registries.
          </p>

          {/* Screening Status */}
          <div className="space-y-3 rounded-lg border border-border bg-surface-2/50 p-5">
            {[
              { label: "OFAC SDN List", done: amlComplete },
              { label: "EU Consolidated List", done: amlComplete },
              { label: "UN Security Council", done: amlComplete },
              { label: "PEP Database", done: amlComplete },
            ].map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-300">{check.label}</span>
                {check.done ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Clear
                  </span>
                ) : processing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                ) : (
                  <span className="text-xs text-slate-600">Pending</span>
                )}
              </div>
            ))}
          </div>

          {amlComplete && (
            <button
              type="button"
              onClick={handleComplete}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-bg transition-all hover:bg-gold-hover ${isDemoActive ? DEMO_SPOTLIGHT_CLASSES : ""}`}
            >
              Go to Marketplace
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {processing && (
            <div className="mt-6 flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running compliance checks…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
