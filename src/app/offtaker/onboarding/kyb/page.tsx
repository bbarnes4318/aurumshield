"use client";

/* ================================================================
   OFFTAKER KYB COMMAND CONSOLE
   ================================================================
   Step 2 of 3 — Identity & AML Perimeter. Deterministic
   verification ladder: Entity Verification → UBO Biometric Scans
   → Source of Funds Review. Marketplace access is gated until
   all checks clear.
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
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
  ExternalLink,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { useDemoTour, DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";
import { serverLaunchIdentityScan, serverPollVerificationStatus, serverResetForRetry } from "@/lib/actions/onboarding-actions";

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

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function KYBConsolePage() {
  const [steps, setSteps] = useState<VerificationStep[]>(INITIAL_STEPS);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [declineReasons, setDeclineReasons] = useState<string[]>([]);
  const [scanProvider, setScanProvider] = useState<string | null>(null);
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const [caseFile] = useState(() => getCaseFileFromSession());
  const router = useRouter();
  const { isDemoActive } = useDemoTour();
  const demoParam = isDemoActive ? "?demo=active" : "";

  const allCleared = steps.every(s => s.status === "COMPLETE");
  const clearedCount = steps.filter(s => s.status === "COMPLETE").length;

  const handleLaunchIdentityScan = useCallback(async () => {
    if (scanLoading) return;

    console.log("[KYB-UI] 🔵 Button clicked. isDemoActive=", isDemoActive, "caseId=", caseFile.caseId);

    // Demo mode: run local animation instead of hitting real API
    if (isDemoActive) {
      console.log("[KYB-UI] 🟡 Demo mode — running animation");
      setScanLoading(true);
      const stepDelay = 1200;
      INITIAL_STEPS.forEach((_, idx) => {
        setTimeout(() => {
          setSteps(prev => prev.map((s, i) => {
            if (i === idx) return { ...s, status: "COMPLETE" as StepStatus };
            if (i === idx + 1) return { ...s, status: "ACTIVE" as StepStatus };
            return s;
          }));
          if (idx === INITIAL_STEPS.length - 1) {
            setScanLoading(false);
          }
        }, stepDelay * (idx + 1));
      });
      return;
    }

    // Production: call iDenfy via compliance engine
    setScanLoading(true);
    setScanError(null);
    console.log("[KYB-UI] 🔵 Calling serverLaunchIdentityScan...");

    try {
      // Timeout wrapper — never hang longer than 30 seconds
      const result = await Promise.race([
        serverLaunchIdentityScan(caseFile.caseId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(
            "Identity scan request timed out after 30 seconds. " +
            "This usually means the server cannot connect to the database or iDenfy. " +
            "Check server logs for the root cause."
          )), 30_000)
        ),
      ]);

      console.log("[KYB-UI] 🟢 Server action returned:", JSON.stringify(result));

      switch (result.status) {
        case "REDIRECT":
          console.log("[KYB-UI] 🟢 REDIRECT → opening iDenfy:", result.redirectUrl);
          setScanProvider(result.provider ?? null);
          setScanSessionId(result.sessionId ?? null);
          if (result.redirectUrl) {
            window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
          }
          setSteps(prev => prev.map((s, i) => {
            if (i === 0) return { ...s, status: "COMPLETE" as StepStatus };
            if (i === 1) return { ...s, status: "ACTIVE" as StepStatus };
            return s;
          }));
          break;

        case "ALREADY_CLEARED":
          console.log("[KYB-UI] 🟢 User is already cleared");
          setScanProvider("CLEARED");
          setSteps(prev => prev.map(s => ({ ...s, status: "COMPLETE" as StepStatus })));
          break;

        case "IN_PROGRESS":
          console.log("[KYB-UI] 🟡 Verification already in progress");
          setScanProvider("PENDING");
          setSteps(prev => prev.map((s, i) => {
            if (i === 0) return { ...s, status: "COMPLETE" as StepStatus };
            if (i === 1) return { ...s, status: "ACTIVE" as StepStatus };
            return s;
          }));
          break;

        case "ERROR":
          console.error("[KYB-UI] 🔴 Server returned ERROR:", result.error);
          setScanError(result.error ?? "Unknown server error — check server logs.");
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[KYB-UI] 🔴 EXCEPTION during identity scan launch:", msg, err);
      setScanError(msg);
    } finally {
      setScanLoading(false);
    }
  }, [scanLoading, isDemoActive, caseFile.caseId]);

  /* ── Auto-poll for verification result after redirect ── */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!scanSessionId || isDemoActive) return;

    const POLL_INTERVAL_MS = 5000;
    const MAX_POLLS = 120;
    let pollCount = 0;

    pollRef.current = setInterval(async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setScanError("Verification timeout — please refresh the page and try again.");
        return;
      }

      try {
        const result = await serverPollVerificationStatus(caseFile.caseId);

        switch (result.status) {
          case "APPROVED":
            if (pollRef.current) clearInterval(pollRef.current);
            setScanProvider("CLEARED");
            setScanSessionId(null);
            setSteps(prev => prev.map(s => ({ ...s, status: "COMPLETE" as StepStatus })));
            break;

          case "DECLINED":
            if (pollRef.current) clearInterval(pollRef.current);
            setScanSessionId(null);
            setDeclineReasons(result.declineReasons ?? []);
            setScanError(`Identity verification DECLINED`);
            break;

          case "REVIEWING":
            setScanProvider("REVIEWING");
            break;

          case "PENDING":
            break;

          case "ERROR":
            console.warn("[KYB-POLL] Error:", result.error);
            break;
        }
      } catch (err) {
        console.warn("[KYB-POLL] Exception:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scanSessionId, isDemoActive, caseFile.caseId]);

  const handleRetry = useCallback(async () => {
    setScanLoading(true);
    setScanError(null);
    setDeclineReasons([]);
    setScanProvider(null);
    setScanSessionId(null);
    setSteps(INITIAL_STEPS.map((s, i) => i === 0 ? { ...s, status: "ACTIVE" as StepStatus } : { ...s, status: "LOCKED" as StepStatus }));

    try {
      const resetResult = await serverResetForRetry(caseFile.caseId);
      if (!resetResult.success) {
        setScanError(resetResult.error ?? "Failed to reset verification state.");
        setScanLoading(false);
        return;
      }
      const result = await serverLaunchIdentityScan(caseFile.caseId);
      if (result.status === "REDIRECT" && result.redirectUrl) {
        setScanProvider(result.provider ?? null);
        setScanSessionId(result.sessionId ?? null);
        window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
        setSteps(prev => prev.map((s, i) => {
          if (i === 0) return { ...s, status: "COMPLETE" as StepStatus };
          if (i === 1) return { ...s, status: "ACTIVE" as StepStatus };
          return s;
        }));
      } else if (result.status === "ALREADY_CLEARED") {
        setScanProvider("CLEARED");
        setSteps(prev => prev.map(s => ({ ...s, status: "COMPLETE" as StepStatus })));
      } else if (result.status === "ERROR") {
        setScanError(result.error ?? "Unknown error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setScanError(msg);
    } finally {
      setScanLoading(false);
    }
  }, [caseFile.caseId]);

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
    <div className="flex flex-col overflow-hidden bg-slate-950 -mx-6 -my-6 lg:-mx-8 h-[calc(100%+3rem)]">
      {/* ── PROMINENT ERROR BANNER — impossible to miss ── */}
      {scanError && (
        <div className="shrink-0 bg-red-950/80 border-b-2 border-red-500 px-6 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-mono text-sm font-bold text-red-300 uppercase tracking-wider mb-1">Identity Scan Failed</p>
            <p className="font-mono text-xs text-red-200/80 leading-relaxed">{scanError}</p>
            {declineReasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {declineReasons.map((reason, idx) => (
                  <li key={idx} className="font-mono text-xs text-red-300">→ {reason}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => { setScanError(null); setDeclineReasons([]); }}
            className="text-red-400 hover:text-red-300 font-mono text-xs uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-slate-800/60 bg-black/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-[10px] tracking-[0.3em] uppercase font-bold">
              Step 2 of 3 — Identity &amp; AML Perimeter
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-600 tracking-wider">
            {clearedCount} / {steps.length} CLEARED
          </span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white mt-1.5">
          Offtaker Verification Console
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
          To unlock marketplace access, we are legally required to verify your corporate identity and beneficial owners.
          Please review your case file on the left, then click <strong className="text-white">&quot;Launch Secure Identity Scan&quot;</strong> in the active step below to begin.
        </p>
      </div>

      {/* ── 2-Column Main Content — Locked Frame: only inner columns scroll ── */}
      <div className="flex-1 min-h-0 flex gap-6 px-6 overflow-hidden">

        {/* ═══════════════════════════════════════════════════════════
           LEFT COLUMN — Case Summary + Verification Ladder (3/5)
           ═══════════════════════════════════════════════════════════ */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-6">

          {/* ── Case File Summary (compact horizontal strip) ── */}
          <div className="shrink-0 bg-slate-900/50 border border-slate-800/50 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase">
                Case File Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DataRow label="Legal Entity" value={caseFile.legalEntityName} />
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  LEI
                </span>
                <span className="font-mono text-xs text-gold-primary bg-black/40 border border-slate-800/50 px-2 py-0.5 inline-block">
                  {caseFile.lei}
                </span>
              </div>
              <DataRow label="Jurisdiction" value={caseFile.jurisdiction} />
              <DataRow label="Registration" value={caseFile.registrationDate} mono />
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/40">
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  Case ID
                </span>
                <span className="font-mono text-[11px] text-gold-primary bg-black/40 border border-slate-800/50 px-2 py-0.5 inline-block">
                  {caseFile.caseId}
                </span>
              </div>
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  Risk Tier
                </span>
                <StatusBadge status={caseFile.riskTier} />
              </div>
              <div>
                <span className="font-mono text-slate-600 text-[10px] tracking-[0.15em] uppercase block mb-1">
                  Submitted
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {new Date(caseFile.submittedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* ── Verification Ladder — FOCAL ELEMENT ── */}
          <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800/50 rounded-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-gold-primary" />
                <h2 className="font-mono text-white text-xs tracking-[0.15em] uppercase font-semibold">
                  Verification Sequence
                </h2>
              </div>
              {steps.every(s => s.status === "COMPLETE") ? (
                <span className="font-mono text-[10px] text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-1 rounded-sm">
                  ALL CHECKS CLEARED
                </span>
              ) : (
                <span className="font-mono text-[10px] text-gold-primary tracking-wider bg-gold-primary/10 px-2 py-1 rounded-sm animate-pulse">
                  ACTION REQUIRED: STEP {steps.findIndex(s => s.status === "ACTIVE") + 1}
                </span>
              )}
            </div>

            {/* The Ladder */}
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isActive = step.status === "ACTIVE";
                const isLocked = step.status === "LOCKED";
                const isComplete = step.status === "COMPLETE";

                return (
                  <div key={step.id} className="flex gap-4">
                    {/* ── Vertical connector line + icon ── */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-10 w-10 rounded-sm flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isActive
                            ? "bg-gold-primary/15 text-gold-primary border border-gold-primary/40 shadow-[0_0_12px_rgba(198,168,107,0.15)]"
                            : isComplete
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800/50 text-slate-600 border border-slate-700/50"
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-px flex-1 min-h-6 transition-colors duration-300 ${
                            isComplete
                              ? "bg-emerald-500/20"
                              : isActive
                                ? "bg-gold-primary/20"
                                : "bg-slate-800/30"
                          }`}
                        />
                      )}
                    </div>

                    {/* ── Step content ── */}
                    <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-mono text-sm transition-colors duration-300 ${
                            isActive
                              ? "text-gold-primary font-semibold"
                              : isComplete
                                ? "text-emerald-400"
                                : "text-slate-600"
                          }`}
                        >
                          {step.label}
                        </span>
                        <StatusBadge status={step.status} />
                      </div>
                      <p
                        className={`text-xs leading-relaxed transition-colors duration-300 ${
                          isActive
                            ? "text-slate-400"
                            : isComplete
                              ? "text-slate-500"
                              : "text-slate-700"
                        }`}
                      >
                        {step.description}
                      </p>

                      {/* Action button — only on ACTIVE step */}
                      {isActive && (
                        <div className="mt-4 p-3 bg-gold-primary/5 border border-gold-primary/20 rounded-md">
                          <p className="text-white text-xs mb-3 font-medium">
                            Ready to begin? You will be securely redirected to our identity partner.
                          </p>
                          <button
                            data-tour="cinematic-kyb-launch-scan"
                            onClick={handleLaunchIdentityScan}
                            disabled={scanLoading}
                            className={`w-full justify-center bg-gold-primary text-slate-950 font-bold text-sm tracking-wide px-5 py-3 rounded-sm hover:bg-gold-hover transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(198,168,107,0.3)] hover:shadow-[0_0_25px_rgba(198,168,107,0.5)] disabled:opacity-60 disabled:cursor-wait disabled:shadow-none ${scanLoading ? 'animate-pulse' : ''}`}
                          >
                            {scanLoading ? 'Initiating Secure Session…' : 'Launch Secure Identity Scan'}
                            {scanLoading ? <Clock className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                          </button>
                          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-3 text-center block">
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

        {/* ═══════════════════════════════════════════════════════════
           RIGHT COLUMN — Evidence + Terminal (2/5)
           ═══════════════════════════════════════════════════════════ */}
        <div className="w-2/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-6">

          {/* ── Document Upload Zone ── */}
          <div className="shrink-0 bg-slate-900/50 border border-slate-800/50 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase">
                Evidence Upload
              </h2>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-sm p-5 text-center transition-colors ${
                isDragOver
                  ? "border-gold-primary/50 bg-gold-primary/5"
                  : "border-slate-700/50 bg-slate-950/50"
              }`}
            >
              <Upload
                className={`h-5 w-5 mx-auto mb-2 ${
                  isDragOver ? "text-gold-primary" : "text-slate-600"
                }`}
              />
              <p className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-0.5">
                Registry Extracts &amp; Incorporation Docs
              </p>
              <p className="font-mono text-[10px] text-slate-700">
                Drag files or click to browse
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="font-mono text-[9px] text-slate-600">
                PDF, PNG, JPG · Max 25MB
              </p>
              <p className="font-mono text-[9px] text-slate-600">
                {uploadedFiles.length} uploaded
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/30 border border-slate-800/40 px-2.5 py-1.5 rounded-sm">
                    <span className="font-mono text-[10px] text-slate-400 truncate">{f.name}</span>
                    <span className="font-mono text-[9px] text-slate-600 ml-2 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Status Readout (Terminal) ── */}
          <div
            data-tour="cinematic-kyb-terminal"
            className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800/50 rounded-sm p-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Terminal className="h-3.5 w-3.5 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase">
                System Readout
              </h2>
            </div>

            <div className="flex-1 min-h-0 bg-black/40 border border-slate-800/40 rounded-sm p-3 space-y-1.5 overflow-y-auto">
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
              {scanError ? (
                <>
                  <TerminalLine
                    prefix="ERR"
                    text={scanError}
                    color="text-red-400"
                  />
                  {declineReasons.length > 0 && declineReasons.map((reason, idx) => (
                    <TerminalLine
                      key={idx}
                      prefix="ERR"
                      text={`  → ${reason}`}
                      color="text-red-300"
                    />
                  ))}
                  <div className="mt-2">
                    <button
                      onClick={handleRetry}
                      disabled={scanLoading}
                      className="bg-gold-primary text-slate-950 font-bold text-xs tracking-wide px-4 py-2 rounded-sm hover:bg-gold-hover transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    >
                      {scanLoading ? 'Resetting...' : 'Retry Verification'}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[9px] text-slate-600 mt-1 block">
                      A new identity scan session will be created.
                    </span>
                  </div>
                </>
              ) : scanProvider === "CLEARED" ? (
                <TerminalLine
                  prefix="VRF"
                  text="Identity perimeter CLEARED — all checks passed."
                  color="text-emerald-400"
                />
              ) : scanProvider === "REVIEWING" ? (
                <TerminalLine
                  prefix="VRF"
                  text="Manual review in progress — awaiting analyst decision..."
                  color="text-amber-400"
                  blink
                />
              ) : scanProvider && scanSessionId ? (
                <>
                  <TerminalLine
                    prefix="VRF"
                    text={`${scanProvider} session initiated: ${scanSessionId}`}
                    color="text-gold-primary"
                  />
                  <TerminalLine
                    prefix="VRF"
                    text="Verification opened in new tab. Complete scan to proceed."
                    color="text-gold-primary"
                    blink
                  />
                  <TerminalLine
                    prefix="POLL"
                    text="Auto-polling for result every 5s..."
                    color="text-slate-600"
                  />
                </>
              ) : (
                <TerminalLine
                  prefix="VRF"
                  text={scanLoading ? "Connecting to identity provider..." : "Awaiting identity scan launch..."}
                  color="text-gold-primary"
                  blink
                />
              )}
            </div>

            {/* Cinematic tour sentinel */}
            {allCleared && (
              <div data-tour="cinematic-kyb-checks-complete" className="hidden" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      {/* ── Marketplace Gate — Anchored Footer ── */}
      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950 flex flex-col">
        {isDemoActive ? (
          <div className="relative">
            <DemoTooltip text="Verify Corporate Identity to access the Marketplace →" position="top" />
            <button
              data-tour="cinematic-kyb-enter"
              onClick={() => router.push(`/offtaker/marketplace${demoParam}`)}
              className={`w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide py-3.5 rounded-sm hover:bg-gold-hover transition-colors flex items-center justify-center gap-2 font-mono cursor-pointer ${DEMO_SPOTLIGHT_CLASSES}`}
            >
              <ChevronRight className="h-4 w-4" />
              Proceed to Marketplace
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : allCleared ? (
          <button
            onClick={() => router.push(`/offtaker/marketplace${demoParam}`)}
            className="w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide py-3.5 rounded-sm hover:bg-gold-hover transition-all duration-300 flex items-center justify-center gap-2 font-mono cursor-pointer shadow-[0_0_20px_rgba(198,168,107,0.2)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Enter AurumShield Marketplace
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-3 w-3 text-red-400/60" />
              <span className="font-mono text-[10px] text-red-400/60 tracking-[0.15em] uppercase">
                Marketplace Access Restricted Until Identity Perimeter Is Cleared
              </span>
            </div>
            <button
              disabled
              className="w-full bg-slate-800/60 text-slate-500 font-bold text-sm tracking-wide py-3.5 rounded-sm cursor-not-allowed flex items-center justify-center gap-2 font-mono"
            >
              <Lock className="h-4 w-4" />
              Enter AurumShield Marketplace
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Telemetry ── */}
      <div className="shrink-0 px-6 py-1.5">
        <TelemetryFooter />
      </div>
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

/* ── Inline Helper: Status Badge ── */
function StatusBadge({ status }: { status: StepStatus | string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: {
      bg: "bg-gold-primary/10",
      text: "text-gold-primary",
      label: "ACTIVE",
    },
    PENDING: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      label: "PENDING",
    },
    LOCKED: {
      bg: "bg-slate-800/50",
      text: "text-slate-600",
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[9px] tracking-[0.15em] uppercase ${c.bg} ${c.text}`}
    >
      {status === "LOCKED" && <Lock className="h-2.5 w-2.5" />}
      {status === "ACTIVE" && <Clock className="h-2.5 w-2.5" />}
      {status === "COMPLETE" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "PENDING" && <AlertTriangle className="h-2.5 w-2.5" />}
      {c.label}
    </span>
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
