"use client";

/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   ZERO SCROLL. Single viewport. Compact checklist + CTA.
   ================================================================ */

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";
import {
  useComplianceCaseVerification,
  useInitiateVerification,
} from "@/hooks/use-compliance-case";
import { type VerificationStageData } from "@/lib/schemas/verification-stage-schema";

/* ── Milestones ── */
const MILESTONES: { id: keyof VerificationStageData; label: string; detail: string }[] = [
  { id: "entityVerificationPassed", label: "Identity & Liveness", detail: "Biometric + document verification" },
  { id: "uboReviewPassed", label: "Corporate Structure", detail: "UBO identification & ownership chain" },
  { id: "screeningPassed", label: "AML / Sanctions", detail: "OFAC · EU · UN · UK HMT screening" },
  { id: "complianceReviewPassed", label: "Signatory Review", detail: "Authorized signatory confirmation" },
];

export default function VerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const {
    milestones,
    allComplete,
    isLoading: caseLoading,
  } = useComplianceCaseVerification();

  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const [isSaving, setIsSaving] = useState(false);

  const {
    mutateAsync: serverInitiateVerification,
    isPending: isInitiating,
  } = useInitiateVerification();

  /* ── Derive check states ── */
  const completedCount = useMemo(() => {
    if (isDemoMode) return MILESTONES.length; // In demo, show all as complete
    return MILESTONES.filter((m) => milestones?.[m.id]).length;
  }, [milestones, isDemoMode]);

  const isAllDone = isDemoMode || allComplete;

  /* ── Handlers ── */
  const handleInitiateVerification = useCallback(async () => {
    if (isDemoMode) {
      router.push("/institutional/get-started/funding?demo=true");
      return;
    }
    try {
      const res = await serverInitiateVerification();
      if (res.redirectUrl) {
        window.open(res.redirectUrl, "_blank");
      }
    } catch (err) {
      console.error("[Verification] Failed to initiate:", err);
    }
  }, [isDemoMode, router, serverInitiateVerification]);

  const handleContinue = useCallback(async () => {
    if (isDemoMode) {
      router.push("/institutional/get-started/funding?demo=true");
      return;
    }
    if (!isAllDone) return;
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
  }, [isDemoMode, isAllDone, saveMutation, router]);

  if (caseLoading || stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" strokeWidth={1.5} />
        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">Verifying Compliance…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full max-w-lg space-y-6 -mt-8">
        {/* ── Header ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center border border-[#C6A86B]/30 bg-[#C6A86B]/5">
            <ShieldCheck className="h-7 w-7 text-[#C6A86B]" strokeWidth={1.2} />
          </div>
          <div>
            <div className="font-mono text-[9px] text-[#C6A86B]/60 tracking-[0.3em] uppercase mb-1">Phase 03 of 04</div>
            <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
              Compliance Perimeter
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Multi-stage identity, corporate structure, and sanctions verification.
            </p>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">Compliance Progress</span>
            <span className="font-mono text-[9px] text-[#C6A86B] uppercase tracking-wider">
              {completedCount}/{MILESTONES.length} Complete
            </span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C6A86B] rounded-full transition-all duration-1000"
              style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Checklist — compact ── */}
        <div className="space-y-2">
          {MILESTONES.map((milestone, i) => {
            const isComplete = isDemoMode || milestones?.[milestone.id];
            return (
              <div
                key={milestone.id}
                className={`flex items-center gap-3 px-4 py-3 border transition-all duration-500 ${
                  isComplete
                    ? "border-[#C6A86B]/20 bg-[#C6A86B]/3"
                    : "border-slate-800/40 bg-slate-900/20"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-[#C6A86B] shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-700 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-white font-medium tracking-wide">
                    {milestone.label}
                  </div>
                  <div className="font-mono text-[9px] text-slate-600 tracking-wider">
                    {milestone.detail}
                  </div>
                </div>
                <span className={`font-mono text-[8px] uppercase tracking-widest ${isComplete ? "text-[#C6A86B]" : "text-slate-700"}`}>
                  {isComplete ? "PASS" : "PENDING"}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <div>
          <StickyPrimaryAction
            label={isAllDone ? "Continue to Funding" : "Launch Verification Terminal"}
            onClick={isAllDone ? handleContinue : handleInitiateVerification}
            loading={isSaving || isInitiating}
            disabled={isSaving || isInitiating}
            icon={ArrowRight}
          />
        </div>
      </div>
    </div>
  );
}
