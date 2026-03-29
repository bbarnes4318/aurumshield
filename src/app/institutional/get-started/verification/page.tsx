"use client";
 
/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   Full-width Bento Box experience.
   High-fidelity Checklist with progress telemetry.
   Evidence Locker sidebar (demo mode).
   ================================================================ */
 
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  Loader2, 
  ArrowRight, 
  Save, 
  AlertTriangle, 
  ExternalLink 
} from "lucide-react";
 
import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { 
  useOnboardingState, 
  useSaveOnboardingState 
} from "@/hooks/use-onboarding-state";
import { 
  useComplianceCaseVerification, 
  useInitiateVerification 
} from "@/hooks/use-compliance-case";
import { AutoCheckList, type CheckItemStatus } from "@/components/institutional-flow/AutoCheckList";
import { VerificationEvidenceWorkspace as DemoEvidenceWorkspace } from "@/components/demo/verification/VerificationEvidenceWorkspace";
import { useMissionLayout } from "@/components/institutional-flow/MissionLayout";
import { type VerificationStageData } from "@/lib/schemas/verification-stage-schema";
 
/* ── Multi-stage milestones for the checklist ── */
const MILESTONES: { id: keyof VerificationStageData; label: string }[] = [
  { id: "entityVerificationPassed", label: "Identity & Liveness" },
  { id: "uboReviewPassed", label: "Corporate Structure" },
  { id: "screeningPassed", label: "AML / Sanctions" },
  { id: "complianceReviewPassed", label: "UBO / Signatory Review" },
];
 
export default function VerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
  const { setRightSidebar } = useMissionLayout();
 
  /* ── Compliance state ── */
  const { 
    milestones, 
    allComplete, 
    statusLabel,
    isLoading: caseLoading,
  } = useComplianceCaseVerification();
 
  /* ── Derive sub-states ── */
  const { completed, checkItems } = useMemo(() => {
    const items = MILESTONES.map(m => {
      const passed = milestones[m.id];
      const status: CheckItemStatus = passed ? "done" : "pending";
 
      return {
        key: m.id,
        label: m.label,
        status
      };
    });
    const doneCount = items.filter(i => i.status === "done").length;
    return { completed: doneCount, checkItems: items };
  }, [milestones]);
 
  /* ── Sidebar Injection ── */
  useEffect(() => {
    if (isDemoMode) {
      setRightSidebar(<DemoEvidenceWorkspace />);
    } else {
      setRightSidebar(null);
    }
    return () => setRightSidebar(null);
  }, [isDemoMode, setRightSidebar]);
 
  /* ── Submission state ── */
  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const [isSaving, setIsSaving] = useState(false);
 
  /* ── Verification initiation ── */
  const {
    mutateAsync: serverInitiateVerification,
    isPending: isInitiating,
    error: initiationError,
    reset: clearInitiationError,
  } = useInitiateVerification();
 
  /* ── Extract provider status ── */
  const caseStatus = onboardingState?.metadataJson?.caseStatus as string | undefined;
  const providerRedirectUrl = onboardingState?.metadataJson?.providerRedirectUrl as string | undefined;
 
  /* ── Can we initiate? ── */
  const canInitiate = 
    !allComplete && 
    (!caseStatus || caseStatus === "OPEN" || caseStatus === "REJECTED");
 
  /* ── Initiate verification trigger ── */
  const handleInitiateVerification = useCallback(async () => {
    try {
      const res = await serverInitiateVerification();
      if (res.redirectUrl) {
        window.open(res.redirectUrl, "_blank");
      }
    } catch (err) {
      console.error("[Verification] Failed to initiate:", err);
    }
  }, [serverInitiateVerification]);
 
  /* ── Submit: validate → persist → advance → navigate ── */
  const handleContinue = useCallback(async () => {
    if (!allComplete) return;
    setIsSaving(true);
 
    try {
      await saveMutation.mutateAsync({
        currentStep: 3,
        status: "MCA_PENDING",
        metadataJson: {
          __journey: { stage: "FUNDING", firstTradeCompleted: false },
        },
      });
      router.push("/institutional/get-started/funding");
    } catch {
      setIsSaving(false);
    }
  }, [allComplete, saveMutation, router]);
 
  /* ── Loading state ── */
  if (stateLoading || caseLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" strokeWidth={1.5} />
        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">
          Syncing Case…
        </p>
      </div>
    );
  }
 
  return (
    <StepShell
      icon={ShieldCheck}
      headline="Compliance Verification"
      description="AurumShield's autonomous compliance engine is conducting mandatory perimeter integrity checks. All four gates must pass before capital confinement can be authorized."
    >
      <div className="w-full space-y-6">
        {/* ── Active Audit Feed ── */}
        <div data-tour="compliance-checklist" className="space-y-4 text-left">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
              — Live Audit Log
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] text-[#C6A86B] uppercase">
                {statusLabel}
              </span>
            </div>
          </div>
          <AutoCheckList items={checkItems} />
        </div>
 
        {/* ── Progress Telemetry ── */}
        <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-4 font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">
              Perimeter Gate Clearance
            </span>
            <span className="text-[10px] text-slate-400">
              {completed} / {MILESTONES.length}
            </span>
          </div>
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#C6A86B] transition-all duration-1000" 
              style={{ width: `${(completed / MILESTONES.length) * 100}%` }}
            />
          </div>
        </div>
 
        {/* ── Initiation CTA ── */}
        {canInitiate && !providerRedirectUrl && (
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-800/40">
            <p className="text-xs text-slate-400 text-center max-w-sm">
              Manual interaction required. Launch the secure verification terminal to provide entity documentation.
            </p>
            <button
              onClick={handleInitiateVerification}
              disabled={isInitiating}
              className="group relative inline-flex h-12 items-center gap-3 rounded-xl bg-[#C6A86B] px-8 text-sm font-semibold text-black transition-all hover:bg-[#d4b97a] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isInitiating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Requesting Authorization…
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Launch Verification Terminal
                </>
              )}
            </button>
          </div>
        )}
 
        {/* ── Provider redirect notice ── */}
        {providerRedirectUrl && (
          <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-800/40">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C6A86B]/20 bg-slate-900/40">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] text-[#C6A86B] uppercase tracking-wider">
                Active External Session
              </span>
            </div>
            <a
              href={providerRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-[#C6A86B] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Restore Verification Instance
            </a>
          </div>
        )}
 
        {/* ── Initiation error ── */}
        {initiationError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-left">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-red-200">Session Initialization Failure</p>
              <p className="text-[11px] text-red-400/80 font-mono leading-relaxed">{initiationError.message}</p>
              <button
                onClick={clearInitiationError}
                className="text-[10px] text-red-500 underline uppercase tracking-widest font-bold"
              >
                Clear Log
              </button>
            </div>
          </div>
        )}
 
        {/* ── Primary Action ── */}
        <div data-tour="continue-funding" className="pt-4 border-t border-slate-800/40">
          <StickyPrimaryAction
            label="Authorize & Continue"
            onClick={handleContinue}
            loading={isSaving}
            disabled={!allComplete || isSaving}
            icon={Save}
          />
        </div>
      </div>
    </StepShell>
  );
}
