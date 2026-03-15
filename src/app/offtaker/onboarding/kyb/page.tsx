"use client";

/* ================================================================
   OFFTAKER KYB COMMAND CONSOLE
   ================================================================
   Step 2 of 3 — Identity & AML Perimeter. Deterministic
   verification ladder: Entity Verification → UBO Biometric Scans
   → Source of Funds Review. Marketplace access is gated until
   all checks clear.
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  Lock,
  Clock,
  Upload,
  Terminal,
  AlertTriangle,
  ChevronRight,
  FileText,
  Fingerprint,
  Banknote,
  Building2,
  ShieldAlert,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { useDemoTour, DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

/* ----------------------------------------------------------------
   CASE FILE — reads from sessionStorage (populated by intake form)
   Falls back to placeholder values if no intake data found.
   ---------------------------------------------------------------- */
function getCaseFileFromSession(): {
  legalEntityName: string;
  lei: string;
  jurisdiction: string;
  registrationDate: string;
  riskTier: "PENDING";
  caseId: string;
  submittedAt: string;
} {
  if (typeof window === "undefined") {
    return {
      legalEntityName: "—",
      lei: "—",
      jurisdiction: "—",
      registrationDate: "—",
      riskTier: "PENDING",
      caseId: "PENDING",
      submittedAt: new Date().toISOString(),
    };
  }

  const raw = sessionStorage.getItem("aurumshield:intake-dossier");
  const caseId = sessionStorage.getItem("aurumshield:case-id") || "PENDING";

  if (raw) {
    try {
      const data = JSON.parse(raw) as {
        legalEntityName: string;
        legalEntityIdentifier: string;
        jurisdictionOfIncorporation: string;
        registrationDate: string;
      };
      return {
        legalEntityName: data.legalEntityName || "—",
        lei: data.legalEntityIdentifier || "—",
        jurisdiction: data.jurisdictionOfIncorporation || "—",
        registrationDate: data.registrationDate || "—",
        riskTier: "PENDING",
        caseId,
        submittedAt: new Date().toISOString(),
      };
    } catch {
      // Corrupt data — fall through to defaults
    }
  }

  return {
    legalEntityName: "No intake dossier submitted",
    lei: "—",
    jurisdiction: "—",
    registrationDate: "—",
    riskTier: "PENDING",
    caseId,
    submittedAt: new Date().toISOString(),
  };
}

/* ----------------------------------------------------------------
   VERIFICATION STEPS — deterministic ladder
   ---------------------------------------------------------------- */
type StepStatus = "ACTIVE" | "PENDING" | "LOCKED" | "COMPLETE";

interface VerificationStep {
  id: number;
  label: string;
  description: string;
  status: StepStatus;
  icon: React.ReactNode;
}

const INITIAL_STEPS: VerificationStep[] = [
  {
    id: 1,
    label: "Entity Verification",
    description:
      "Corporate registry check against GLEIF and local registrar databases.",
    status: "ACTIVE",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: 2,
    label: "UBO #1 Biometric Scan",
    description:
      "Liveness detection and document verification for primary beneficial owner.",
    status: "LOCKED",
    icon: <Fingerprint className="h-4 w-4" />,
  },
  {
    id: 3,
    label: "UBO #2 Biometric Scan",
    description:
      "Liveness detection and document verification for secondary beneficial owner.",
    status: "LOCKED",
    icon: <Fingerprint className="h-4 w-4" />,
  },
  {
    id: 4,
    label: "Source of Funds Review",
    description:
      "Automated narrative analysis and sanctions screening of declared capital origin.",
    status: "LOCKED",
    icon: <Banknote className="h-4 w-4" />,
  },
];

/* ----------------------------------------------------------------
   REUSABLE COMPONENTS
   ---------------------------------------------------------------- */

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

/* ── Status Badge ── */
function StatusBadge({ status }: { status: StepStatus | string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: {
      bg: "bg-gold-primary/15",
      text: "text-gold-primary",
      label: "ACTIVE",
    },
    PENDING: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      label: "PENDING",
    },
    LOCKED: {
      bg: "bg-slate-800",
      text: "text-slate-500",
      label: "LOCKED",
    },
    COMPLETE: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      label: "COMPLETE",
    },
  };
  const c = config[status] ?? config.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-[0.15em] uppercase ${c.bg} ${c.text}`}
    >
      {status === "LOCKED" && <Lock className="h-2.5 w-2.5" />}
      {status === "ACTIVE" && <Clock className="h-2.5 w-2.5" />}
      {status === "COMPLETE" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "PENDING" && <AlertTriangle className="h-2.5 w-2.5" />}
      {c.label}
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function KYBConsolePage() {
  const [steps, setSteps] = useState<VerificationStep[]>(INITIAL_STEPS);
  const [veriffRunning, setVeriffRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const [caseFile] = useState(() => getCaseFileFromSession());
  const router = useRouter();
  const { isDemoActive } = useDemoTour();
  const demoParam = isDemoActive ? "?demo=active" : "";

  const handleLaunchVeriff = useCallback(() => {
    if (veriffRunning) return;
    setVeriffRunning(true);
    // Simulate Veriff session — advance each step from ACTIVE → COMPLETE
    const stepDelay = 1200;
    INITIAL_STEPS.forEach((_, idx) => {
      setTimeout(() => {
        setSteps(prev => prev.map((s, i) => {
          if (i === idx) return { ...s, status: "COMPLETE" as StepStatus };
          if (i === idx + 1) return { ...s, status: "ACTIVE" as StepStatus };
          return s;
        }));
        if (idx === INITIAL_STEPS.length - 1) {
          setVeriffRunning(false);
        }
      }, stepDelay * (idx + 1));
    });
  }, [veriffRunning]);

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
    const fileInfos = files.map(f => ({ name: f.name, size: f.size }));
    setUploadedFiles(prev => [...prev, ...fileInfos]);
    // TODO: Upload files to S3 via presigned URL for production
  }, []);

  return (
    <div className="h-full bg-slate-950 p-4 md:p-5 flex flex-col overflow-auto">
      {/* ── Header ── */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Step 2 of 3: Identity &amp; AML Perimeter
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Offtaker Verification Console
        </h1>
      </div>

      {/* ── 3-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* ─────────────────────────────────────────────────────────
           COLUMN 1 — Case File Summary (col-span-3)
           ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                Case File Summary
              </h2>
            </div>

            <div className="space-y-3">
              {/* Case ID — Hash Badge */}
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  Case ID
                </span>
                <HashBadge value={caseFile.caseId} />
              </div>
              <DataRow
                label="Legal Entity"
                value={caseFile.legalEntityName}
              />
              {/* LEI — Hash Badge */}
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  LEI
                </span>
                <HashBadge value={caseFile.lei} />
              </div>
              <DataRow
                label="Jurisdiction"
                value={caseFile.jurisdiction}
              />
              <DataRow
                label="Registration"
                value={caseFile.registrationDate}
                mono
              />

              {/* Risk Tier Badge */}
              <div className="pt-3 border-t border-slate-800">
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-2">
                  Risk Assessment
                </span>
                <StatusBadge status={caseFile.riskTier} />
              </div>

              {/* Timestamp */}
              <div className="pt-3 border-t border-slate-800">
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  Dossier Submitted
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {new Date(caseFile.submittedAt).toLocaleString(
                    "en-US",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
           COLUMN 2 — Verification Ladder (col-span-6)
           ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-gold-primary" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Verification Sequence
                </h2>
              </div>
              <span className="font-mono text-[10px] text-slate-600 tracking-wider">
                0 / {steps.length} CLEARED
              </span>
            </div>

            {/* The Ladder */}
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isActive = step.status === "ACTIVE";
                const isLocked = step.status === "LOCKED";

                return (
                  <div key={step.id} className="flex gap-4">
                    {/* ── Vertical connector line + icon ── */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-9 w-9 rounded-sm flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-gold-primary/15 text-gold-primary border border-gold-primary/30"
                            : isLocked
                              ? "bg-slate-800 text-slate-600 border border-slate-700"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-px flex-1 min-h-6 ${
                            isActive
                              ? "bg-gold-primary/20"
                              : "bg-slate-800"
                          }`}
                        />
                      )}
                    </div>

                    {/* ── Step content ── */}
                    <div
                      className={`pb-6 flex-1 ${isLast ? "pb-0" : ""} ${
                        isLocked
                          ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-mono text-sm ${
                            isLocked ? "text-slate-600" : "text-white"
                          }`}
                        >
                          {step.label}
                        </span>
                        <StatusBadge status={step.status} />
                      </div>
                      <p
                        className={`text-xs leading-relaxed mb-3 ${
                          isLocked ? "text-slate-700" : "text-slate-500"
                        }`}
                      >
                        {step.description}
                      </p>

                      {/* Action button — only on ACTIVE step */}
                      {isActive && (
                        <div>
                          <button
                            onClick={handleLaunchVeriff}
                            disabled={veriffRunning}
                            className={`bg-gold-primary text-slate-950 font-bold text-xs tracking-wide px-5 py-2.5 rounded-sm hover:bg-gold-hover transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${veriffRunning ? 'animate-pulse' : ''}`}
                          >
                            Launch Veriff Secure Session
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
                            EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
           COLUMN 3 — Decision & Evidence Panel (col-span-3)
           ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* ── Document Upload Zone ── */}
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                Evidence Upload
              </h2>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${
                isDragOver
                  ? "border-gold-primary/50 bg-gold-primary/5"
                  : "border-slate-700 bg-slate-950"
              }`}
            >
              <Upload
                className={`h-6 w-6 mx-auto mb-3 ${
                  isDragOver ? "text-gold-primary" : "text-slate-600"
                }`}
              />
              <p className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-1">
                Registry Extracts &amp; Incorporation Docs
              </p>
              <p className="font-mono text-[10px] text-slate-700">
                Drag files or click to browse
              </p>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="font-mono text-[10px] text-slate-600">
                Accepted: PDF, PNG, JPG · Max 25MB per file
              </p>
              <p className="font-mono text-[10px] text-slate-700">
                {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} uploaded
              </p>
              {uploadedFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-sm">
                      <span className="font-mono text-[10px] text-slate-400 truncate">{f.name}</span>
                      <span className="font-mono text-[9px] text-slate-600 ml-2 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Status Readout (Terminal) ── */}
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                System Readout
              </h2>
            </div>

            <div className="bg-slate-950 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4 space-y-2">
              <TerminalLine
                prefix="SYS"
                text="Dossier ingested. Case ID assigned."
                color="text-slate-400"
              />
              <TerminalLine
                prefix="KYB"
                text="GLEIF registry lookup queued..."
                color="text-slate-500"
              />
              <TerminalLine
                prefix="AML"
                text="Sanctions screening: STANDBY"
                color="text-slate-600"
              />
              <TerminalLine
                prefix="VRF"
                text="Awaiting Veriff webhook..."
                color="text-gold-primary"
                blink
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Marketplace Gate (Bottom Footer) ── */}
      <div className="mt-4 shrink-0">
        {isDemoActive ? (
          /* Demo mode: enabled button to proceed */
          <div className="relative">
            <DemoTooltip text="Verify Corporate Identity to access the Marketplace →" position="top" />
            <button
              onClick={() => router.push(`/offtaker/marketplace${demoParam}`)}
              className={`w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide py-4 rounded-sm hover:bg-gold-hover transition-colors flex items-center justify-center gap-2 font-mono cursor-pointer ${DEMO_SPOTLIGHT_CLASSES}`}
            >
              <ChevronRight className="h-4 w-4" />
              Proceed to Marketplace
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Normal mode: marketplace gated */
          <>
            {steps.every(s => s.status === "COMPLETE") ? (
              /* All steps complete — unlock marketplace */
              <button
                onClick={() => router.push(`/offtaker/marketplace${demoParam}`)}
                className="w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide py-4 rounded-sm hover:bg-gold-hover transition-colors flex items-center justify-center gap-2 font-mono cursor-pointer demo-cta-glow"
              >
                <CheckCircle2 className="h-4 w-4" />
                Enter AurumShield Marketplace
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              /* Steps incomplete — gate locked */
              <>
                <div className="text-center mb-2">
                  <span className="font-mono text-xs text-red-400/70 tracking-[0.15em] uppercase flex items-center justify-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Marketplace Access Restricted Until Identity Perimeter Is Cleared
                  </span>
                </div>
                <button
                  disabled
                  className="w-full bg-slate-800 text-slate-500 font-bold text-sm tracking-wide py-4 rounded-sm cursor-not-allowed opacity-50 flex items-center justify-center gap-2 font-mono"
                >
                  <Lock className="h-4 w-4" />
                  Enter AurumShield Marketplace
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer trust line ── */}
      <p className="mt-3 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
        AurumShield Clearing · Identity Perimeter Enforcement · Veriff ·
        GLEIF · OFAC / EU Sanctions
      </p>

      <TelemetryFooter />
    </div>
  );
}

/* ── Inline Helper: Data Row ── */
function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
        {label}
      </span>
      <span
        className={`text-sm text-white block ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Inline Helper: Terminal Line ── */
function TerminalLine({
  prefix,
  text,
  color,
  blink = false,
}: {
  prefix: string;
  text: string;
  color: string;
  blink?: boolean;
}) {
  return (
    <div className="flex gap-2 items-start">
      <span className="font-mono text-[10px] text-slate-600 select-none shrink-0">
        &gt;
      </span>
      <span className="font-mono text-[10px] text-gold-primary/60 shrink-0">
        [{prefix}]
      </span>
      <span className={`font-mono text-[10px] ${color} leading-relaxed`}>
        {text}
        {blink && (
          <span className="inline-block w-1.5 h-3 bg-gold-primary ml-1 animate-pulse align-middle" />
        )}
      </span>
    </div>
  );
}
