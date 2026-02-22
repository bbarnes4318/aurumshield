"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import {
  useVerificationCase,
  useSubmitVerificationStep,
  useScheduleDemoWebhook,
} from "@/hooks/use-mock-queries";
import { isAsyncStep } from "@/lib/verification-engine";
import { ProviderHandoffModal } from "@/components/verification/provider-handoff-modal";
import {
  ArrowLeft,
  Send,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  LOCKED: "bg-surface-3 text-text-faint border-border",
  PENDING: "bg-info/10 text-info border-info/30",
  PROCESSING: "bg-gold/10 text-gold border-gold/30",
  SUBMITTED: "bg-warning/10 text-warning border-warning/30",
  PASSED: "bg-success/10 text-success border-success/30",
  FAILED: "bg-danger/10 text-danger border-danger/30",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOCKED: Lock,
  PENDING: Clock,
  PROCESSING: Loader2,
  SUBMITTED: Send,
  PASSED: CheckCircle2,
  FAILED: XCircle,
};

/* ---------- Processing animation text (step-specific) ---------- */

const STEP_ANALYSIS_TEXT: Record<string, string[]> = {
  id_document: [
    "Extracting document metadata…",
    "Verifying document authenticity…",
    "Running OCR on identity fields…",
    "Cross-referencing issuing authority…",
    "Checking for document tampering…",
    "Finalizing identity verification…",
  ],
  selfie_liveness: [
    "Capturing facial geometry…",
    "Running facial comparison…",
    "Detecting liveness markers…",
    "Analyzing micro-expressions…",
    "Verifying identity match…",
  ],
  sanctions_pep: [
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
    "Retrieving filing history…",
  ],
  ubo_capture: [
    "Analyzing ownership structure…",
    "Verifying beneficial owners…",
    "Cross-referencing disclosures…",
    "Validating UBO identities…",
  ],
  proof_of_address: [
    "Analyzing submitted document…",
    "Extracting address data…",
    "Cross-referencing postal records…",
    "Finalizing address verification…",
  ],
  source_of_funds: [
    "Analyzing financial declarations…",
    "Running AML risk assessment…",
    "Cross-referencing bank records…",
    "Compiling source-of-funds report…",
  ],
};

const DEFAULT_ANALYSIS_TEXT = [
  "Processing submitted data…",
  "Running compliance checks…",
  "Analyzing results…",
  "Finalizing verification…",
];

export default function StepDetailPage() {
  return (
    <RequireAuth>
      <StepDetailContent />
    </RequireAuth>
  );
}

function StepDetailContent() {
  const params = useParams<{ stepId: string }>();
  const router = useRouter();
  const { user, org } = useAuth();
  const caseQ = useVerificationCase(user?.id ?? null);
  const submitMut = useSubmitVerificationStep();
  const demoWebhookMut = useScheduleDemoWebhook();

  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [analysisTextIdx, setAnalysisTextIdx] = useState(0);

  const vc = caseQ.data;
  const step = vc?.steps.find((s) => s.id === params.stepId);

  const isStepAsync = step ? isAsyncStep(step.id) : false;
  const isProcessing = step?.status === "PROCESSING";
  const analysisTexts = STEP_ANALYSIS_TEXT[params.stepId] ?? DEFAULT_ANALYSIS_TEXT;

  // Rotate analysis text while processing
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setAnalysisTextIdx((prev) => (prev + 1) % analysisTexts.length);
    }, 1800);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Auto-navigate when step transitions from PROCESSING to terminal state
  const prevStatusRef = { current: step?.status };
  useEffect(() => {
    if (
      prevStatusRef.current === "PROCESSING" &&
      step?.status &&
      step.status !== "PROCESSING"
    ) {
      // Small delay to show the result before navigation
      const timer = setTimeout(() => {
        router.push("/verification");
      }, 2500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = step?.status;
  }, [step?.status, router]);

  const handleSubmitSync = useCallback(() => {
    if (!vc || !org || !step) return;
    submitMut.mutate(
      { existingCase: vc, stepId: step.id, orgId: org.id, orgType: org.type },
      {
        onSuccess: () => {
          router.push("/verification");
        },
      }
    );
  }, [vc, org, step, submitMut, router]);

  const handleSubmitAsync = useCallback(() => {
    if (!vc || !org || !step || !user) return;
    submitMut.mutate(
      { existingCase: vc, stepId: step.id, orgId: org.id, orgType: org.type },
      {
        onSuccess: () => {
          // Step is now PROCESSING — schedule the demo webhook
          demoWebhookMut.mutate({
            userId: user.id,
            stepId: step.id,
            orgId: org.id,
            orgType: org.type,
            delayMs: 5000 + Math.floor(Math.random() * 5000), // 5–10 seconds
          });
        },
      }
    );
  }, [vc, org, step, user, submitMut, demoWebhookMut]);

  if (caseQ.isLoading) return <LoadingState message="Loading verification step…" />;
  if (!vc) return <ErrorState title="No Case" message="No verification case found. Start verification from the Identity Perimeter page." />;
  if (!step) return <ErrorState title="Step Not Found" message={`Step "${params.stepId}" not found in the current case file.`} />;

  const StatusIcon = STATUS_ICONS[step.status] ?? Clock;
  const canSubmit = step.status === "PENDING";

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/verification" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Case File
        </Link>
      </div>

      <PageHeader title={step.title} description={`Step ID: ${step.id}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Step Status */}
        <DashboardPanel title="Step Status" tooltip="Current verification step state" asOf={step.submittedAt ?? vc.updatedAt}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", STATUS_COLORS[step.status])}>
                <StatusIcon className={cn("h-5 w-5", step.status === "PROCESSING" && "animate-spin")} />
              </div>
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                  STATUS_COLORS[step.status]
                )}>
                  {step.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Step ID</p>
                <p className="text-sm font-medium text-text font-mono tabular-nums">{step.id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Submitted At</p>
                <p className="text-sm font-medium text-text tabular-nums">
                  {step.submittedAt
                    ? new Date(step.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Decided At</p>
                <p className="text-sm font-medium text-text tabular-nums">
                  {step.decidedAt
                    ? new Date(step.decidedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Decided By</p>
                <p className="text-sm font-medium text-text font-mono">{step.decidedBy ?? "—"}</p>
              </div>
              {step.reasonCode && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Reason Code</p>
                  <p className="text-sm font-medium text-warning font-mono">{step.reasonCode}</p>
                </div>
              )}
              {step.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Notes</p>
                  <p className="text-sm text-text-muted">{step.notes}</p>
                </div>
              )}
            </div>
          </div>
        </DashboardPanel>

        {/* Submission Action */}
        <DashboardPanel title="Submission" tooltip="Submit this step for screening" asOf={vc.updatedAt}>
          <div className="space-y-4">
            {canSubmit ? (
              <>
                <p className="text-sm text-text-muted">
                  {isStepAsync
                    ? `Submitting this step will securely hand off your data to our verification provider. Processing typically takes 5–10 seconds.`
                    : `Submitting this step will trigger deterministic screening based on your identity and organization data. Results are computed immediately using institutional adapter rules.`
                  }
                </p>
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-2">Screening Parameters</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">User ID</p>
                      <p className="text-xs font-medium text-text font-mono">{user?.id ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Org ID</p>
                      <p className="text-xs font-medium text-text font-mono">{org?.id ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Org Type</p>
                      <p className="text-xs font-medium text-text capitalize">{org?.type ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Track</p>
                      <p className="text-xs font-medium text-text font-mono">{vc.track}</p>
                    </div>
                  </div>
                </div>

                {submitMut.isError && (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    {submitMut.error?.message ?? "Submission failed."}
                  </div>
                )}

                {isStepAsync ? (
                  /* Async steps open the provider handoff modal */
                  <button
                    onClick={() => setShowHandoffModal(true)}
                    disabled={submitMut.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {submitMut.isPending ? "Initiating…" : "Begin Secure Verification"}
                  </button>
                ) : (
                  /* Sync steps (email_phone) submit directly */
                  <button
                    onClick={handleSubmitSync}
                    disabled={submitMut.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {submitMut.isPending ? "Screening…" : "Submit for Screening"}
                  </button>
                )}
              </>
            ) : step.status === "LOCKED" ? (
              <div className="text-center py-8">
                <Lock className="h-8 w-8 text-text-faint mx-auto mb-3" />
                <p className="text-sm text-text-faint">This step is locked. Complete the preceding step to unlock.</p>
              </div>
            ) : step.status === "PROCESSING" ? (
              /* ── PROCESSING: Engaging analysis animation ── */
              <div className="space-y-5">
                {/* Pulsing scanner ring */}
                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute h-24 w-24 rounded-full border border-gold/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute h-20 w-20 rounded-full border border-gold/30 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/5">
                    <Loader2 className="h-7 w-7 text-gold animate-spin" />
                  </div>
                </div>

                {/* Dynamic rotating text */}
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-text-faint font-semibold mb-2">
                    Provider Analysis In Progress
                  </p>
                  <p className="text-sm text-gold font-medium h-5 transition-opacity duration-300">
                    {analysisTexts[analysisTextIdx]}
                  </p>
                </div>

                {/* Skeleton analysis lines */}
                <div className="space-y-2 px-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="h-2 rounded-full bg-surface-3 animate-pulse"
                        style={{ width: `${35 + i * 15}%`, animationDelay: `${i * 0.15}s` }}
                      />
                      <div
                        className="h-2 rounded-full bg-surface-3/40 animate-pulse flex-1"
                        style={{ animationDelay: `${i * 0.25}s` }}
                      />
                    </div>
                  ))}
                </div>

                {/* Warning box */}
                <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-center">
                  <p className="text-xs text-warning font-medium">
                    Verification in progress — please wait. This typically takes 5–10 seconds.
                  </p>
                </div>
              </div>
            ) : step.status === "PASSED" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
                <p className="text-sm text-success font-medium">Step passed — decision rationale logged</p>
                {step.decidedAt && (
                  <p className="text-xs text-text-faint mt-1 tabular-nums">
                    Decided: {new Date(step.decidedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ) : step.status === "FAILED" ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-danger mx-auto mb-3" />
                <p className="text-sm text-danger font-medium">Step failed — requires Compliance Desk Review</p>
                {step.reasonCode && (
                  <p className="font-mono text-xs text-warning mt-2">Reason: {step.reasonCode}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-warning mx-auto mb-3" />
                <p className="text-sm text-warning font-medium">Submitted — awaiting decision</p>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      {/* Provider Handoff Modal */}
      {isStepAsync && (
        <ProviderHandoffModal
          open={showHandoffModal}
          stepId={step.id}
          stepTitle={step.title}
          onSubmit={handleSubmitAsync}
          onClose={() => setShowHandoffModal(false)}
          isSubmitting={submitMut.isPending}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}
