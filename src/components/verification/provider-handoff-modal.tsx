"use client";

import { useState, useEffect, useCallback } from "react";
import { STEP_PROVIDER_MAP } from "@/lib/verification-engine";
import {
  Shield,
  Lock,
  Upload,
  Camera,
  Search,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";

/* ---------- Processing Text Sequences ---------- */

const PROCESSING_TEXT_MAP: Record<string, string[]> = {
  id_document: [
    "Uploading document securely…",
    "Extracting document metadata…",
    "Verifying document authenticity…",
    "Running OCR on identity fields…",
    "Cross-referencing issuing authority…",
    "Checking for document tampering…",
    "Finalizing identity verification…",
  ],
  selfie_liveness: [
    "Initializing biometric scan…",
    "Capturing facial geometry…",
    "Running facial comparison…",
    "Detecting liveness markers…",
    "Analyzing micro-expressions…",
    "Verifying identity match…",
    "Finalizing liveness check…",
  ],
  sanctions_pep: [
    "Initializing screening engine…",
    "Searching OFAC SDN list…",
    "Searching EU sanctions registry…",
    "Checking PEP databases…",
    "Analyzing adverse media…",
    "Cross-referencing watchlists…",
    "Compiling screening report…",
  ],
  business_registration: [
    "Querying business registry…",
    "Verifying registration number…",
    "Checking corporate status…",
    "Validating registered agent…",
    "Cross-referencing jurisdictions…",
    "Retrieving filing history…",
    "Finalizing registration check…",
  ],
  ubo_capture: [
    "Processing ownership declaration…",
    "Analyzing ownership structure…",
    "Verifying beneficial owners…",
    "Checking control thresholds…",
    "Cross-referencing disclosures…",
    "Validating UBO identities…",
    "Finalizing ownership verification…",
  ],
  proof_of_address: [
    "Analyzing submitted document…",
    "Extracting address data…",
    "Verifying document recency…",
    "Validating address format…",
    "Cross-referencing postal records…",
    "Checking for discrepancies…",
    "Finalizing address verification…",
  ],
  source_of_funds: [
    "Analyzing financial declarations…",
    "Verifying fund sources…",
    "Checking transaction patterns…",
    "Running AML risk assessment…",
    "Validating documentation…",
    "Cross-referencing bank records…",
    "Compiling source-of-funds report…",
  ],
};

const DEFAULT_PROCESSING_TEXT = [
  "Initializing verification…",
  "Processing submitted data…",
  "Running compliance checks…",
  "Analyzing results…",
  "Finalizing verification…",
];

/* ---------- Step-specific icons ---------- */

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  id_document: Upload,
  selfie_liveness: Camera,
  sanctions_pep: Search,
  business_registration: FileText,
  ubo_capture: FileText,
  proof_of_address: FileText,
  source_of_funds: FileText,
};

/* ---------- Props ---------- */

interface ProviderHandoffModalProps {
  open: boolean;
  stepId: string;
  stepTitle: string;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  isProcessing: boolean;
}

/* ---------- Component ---------- */

export function ProviderHandoffModal({
  open,
  stepId,
  stepTitle,
  onSubmit,
  onClose,
  isSubmitting,
  isProcessing,
}: ProviderHandoffModalProps) {
  const [processingTextIdx, setProcessingTextIdx] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  const provider = STEP_PROVIDER_MAP[stepId];
  const providerName = provider?.name ?? "Identity Provider";
  const providerLabel = provider?.label ?? stepTitle;
  const StepIcon = STEP_ICONS[stepId] ?? FileText;
  const processingTexts = PROCESSING_TEXT_MAP[stepId] ?? DEFAULT_PROCESSING_TEXT;

  // Rotate processing text every 1.5 seconds — only runs when processing
  useEffect(() => {
    if (!isProcessing) return;

    const textInterval = setInterval(() => {
      setProcessingTextIdx((prev) => (prev + 1) % processingTexts.length);
    }, 1500);

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 90) return 90;
        return prev + 1.2;
      });
    }, 100);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  const handleSubmitClick = useCallback(() => {
    if (isSubmitting || isProcessing) return;
    onSubmit();
  }, [isSubmitting, isProcessing, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={!isProcessing && !isSubmitting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-surface-1 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative border-b border-border bg-surface-2 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 border border-gold/20">
              <Shield className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-text">
                Secure Identity Portal
              </h2>
              <p className="text-xs text-text-faint">
                Powered by {providerName} — {providerLabel}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2.5 py-1">
              <Lock className="h-3 w-3 text-success" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-success">
                TLS 1.3
              </span>
            </div>
          </div>

          {/* Close button — hidden during processing */}
          {!isProcessing && !isSubmitting && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {!isProcessing ? (
            /* ── Pre-submission: Faux upload/capture UI ── */
            <div className="space-y-5">
              {/* Faux upload zone */}
              <div className="rounded-lg border-2 border-dashed border-border bg-surface-2/50 px-6 py-8 text-center">
                <StepIcon className="h-10 w-10 text-text-faint mx-auto mb-3" />
                <p className="text-sm font-medium text-text mb-1">
                  {stepTitle}
                </p>
                <p className="text-xs text-text-faint">
                  Your data will be securely transmitted to {providerName} for verification.
                  No sensitive data is stored on AurumShield servers.
                </p>
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4">
                {["256-bit Encryption", "SOC 2 Type II", "GDPR Compliant"].map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1"
                  >
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span className="text-[10px] font-medium text-text-faint">{badge}</span>
                  </div>
                ))}
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-medium text-bg transition-all hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting to {providerName}…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit to {providerName}
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ── Processing state: Engaging analysis animation ── */
            <div className="space-y-6">
              {/* Pulsing scanner ring */}
              <div className="relative flex items-center justify-center py-4">
                {/* Outer pulse rings */}
                <div className="absolute h-28 w-28 rounded-full border border-gold/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute h-24 w-24 rounded-full border border-gold/30 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
                {/* Core ring */}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/5">
                  <Loader2 className="h-8 w-8 text-gold animate-spin" />
                </div>
              </div>

              {/* Status label */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-text-faint font-semibold mb-2">
                  Analyzing & Verifying
                </p>
                <p
                  className="text-sm text-gold font-medium h-5 transition-opacity duration-300"
                  key={processingTextIdx}
                >
                  {processingTexts[processingTextIdx]}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-gold/60 to-gold transition-all duration-200 ease-linear"
                    style={{ width: `${Math.min(progressPercent, 90)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-faint">
                  <span>Processing…</span>
                  <span className="tabular-nums">{Math.round(Math.min(progressPercent, 90))}%</span>
                </div>
              </div>

              {/* Skeleton data lines — simulated analysis output */}
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="h-2 rounded-full bg-surface-3 animate-pulse"
                      style={{
                        width: `${40 + i * 20}%`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                    <div
                      className="h-2 rounded-full bg-surface-3/50 animate-pulse flex-1"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  </div>
                ))}
              </div>

              {/* Warning — do not close */}
              <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-center">
                <p className="text-xs text-warning font-medium">
                  Do not close this window. Your verification is being processed securely.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface-2/50 px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] text-text-faint">
            Session encrypted end-to-end
          </p>
          <p className="text-[10px] text-text-faint font-mono">
            AurumShield × {providerName}
          </p>
        </div>
      </div>
    </div>
  );
}
