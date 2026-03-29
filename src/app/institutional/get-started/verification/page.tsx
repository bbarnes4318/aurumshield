"use client";

/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   ZERO SCROLL. Single viewport. Voice-reactive checklist.
   
   Items start as PENDING. When the AI calls set_checklist_item_state,
   TourProvider sets conciergeSimulated["checklist:<key>"] = "done".
   This page reads those values and flips items to PASS with animation.
   
   Panel overlays appear when AI calls open_demo_panel/close_demo_panel.
   ================================================================ */

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Users,
  AlertTriangle as AlertIcon,
  Stamp,
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
import { useTour } from "@/demo/tour-engine/TourProvider";
import { type VerificationStageData } from "@/lib/schemas/verification-stage-schema";

/* ── Milestones ── */
const MILESTONES: {
  id: keyof VerificationStageData;
  stateKey: string;
  label: string;
  detail: string;
  icon: typeof FileText;
}[] = [
  { id: "entityVerificationPassed", stateKey: "checklist:entityVerificationPassed", label: "Identity & Liveness", detail: "Biometric + document verification", icon: FileText },
  { id: "uboReviewPassed", stateKey: "checklist:uboReviewPassed", label: "Corporate Structure", detail: "UBO identification & ownership chain", icon: Users },
  { id: "screeningPassed", stateKey: "checklist:screeningPassed", label: "AML / Sanctions", detail: "OFAC · EU · UN · UK HMT screening", icon: AlertIcon },
  { id: "complianceReviewPassed", stateKey: "checklist:complianceReviewPassed", label: "Signatory Review", detail: "Authorized signatory confirmation", icon: Stamp },
];

/* ── Evidence panel content ── */
const PANEL_CONTENT: Record<string, { title: string; icon: typeof FileText; items: string[] }> = {
  documents: {
    title: "Entity Verification Documents",
    icon: FileText,
    items: [
      "Certificate of Incorporation",
      "Articles of Association",
      "Register of Directors",
      "Shareholder Registry",
      "Proof of Good Standing",
      "Board Resolution",
      "Authorized Signatory ID",
      "Proof of Registered Address",
    ],
  },
  ubo: {
    title: "Ultimate Beneficial Ownership",
    icon: Users,
    items: [
      "Founding CIO — 42% ownership — PEP: Clear",
      "Managing Partner — 31% ownership — PEP: Clear",
      "Family Trust — 27% ownership — Sanctions: Clear",
    ],
  },
  sanctions: {
    title: "Sanctions & AML Screening",
    icon: AlertIcon,
    items: [
      "✓ OFAC (United States)",
      "✓ EU Consolidated List",
      "✓ UN Security Council",
      "✓ UK HM Treasury",
      "✓ Australian DFAT",
      "✓ Adverse Media Databases",
      "✓ Chainalysis KYT (On-chain)",
    ],
  },
};

export default function VerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
  const { state: tourState } = useTour();

  const {
    milestones,
    allComplete,
    isLoading: caseLoading,
  } = useComplianceCaseVerification();

  const { isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const [isSaving, setIsSaving] = useState(false);

  const {
    mutateAsync: serverInitiateVerification,
    isPending: isInitiating,
  } = useInitiateVerification();

  /* ── Read panel state from concierge ── */
  const openPanelId = isDemoMode
    ? (tourState.conciergeSimulated?.__openPanel as string) || ""
    : "";

  const panelContent = openPanelId ? PANEL_CONTENT[openPanelId] : null;

  /* ── Derive check states from either real API or voice tool calls ── */
  const checkStates = useMemo(() => {
    return MILESTONES.map((m) => {
      if (isDemoMode) {
        // In demo mode, items are PENDING by default, flip to PASS when AI calls set_checklist_item_state
        const aiState = tourState.conciergeSimulated?.[m.stateKey];
        return { ...m, complete: aiState === "done" };
      }
      // Real mode: use API data
      return { ...m, complete: !!milestones?.[m.id] };
    });
  }, [isDemoMode, milestones, tourState.conciergeSimulated]);

  const completedCount = checkStates.filter((c) => c.complete).length;
  const isAllDone = isDemoMode ? completedCount === MILESTONES.length : allComplete;

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
      <div className="w-full max-w-lg space-y-5 -mt-8" data-tour="compliance-checklist">
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
              Autonomous multi-gate verification. All four must pass.
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

        {/* ── Checklist — voice-reactive ── */}
        <div className="space-y-2">
          {checkStates.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 border transition-all duration-700 ${
                  item.complete
                    ? "border-[#C6A86B]/30 bg-[#C6A86B]/5"
                    : "border-slate-800/40 bg-slate-900/20"
                }`}
              >
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-[#C6A86B] shrink-0 animate-in zoom-in duration-300" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-700 shrink-0" />
                )}
                <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors duration-500 ${item.complete ? "text-[#C6A86B]/60" : "text-slate-700"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-mono text-xs font-medium tracking-wide transition-colors duration-500 ${item.complete ? "text-white" : "text-slate-500"}`}>
                    {item.label}
                  </div>
                  <div className="font-mono text-[9px] text-slate-600 tracking-wider">
                    {item.detail}
                  </div>
                </div>
                <span className={`font-mono text-[8px] uppercase tracking-widest transition-colors duration-500 ${item.complete ? "text-[#C6A86B]" : "text-slate-700"}`}>
                  {item.complete ? "PASS" : "PENDING"}
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

      {/* ══════════════════════════════════════════════════════════
         EVIDENCE PANEL OVERLAY — appears when AI calls open_demo_panel
         ══════════════════════════════════════════════════════════ */}
      {panelContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 border border-[#C6A86B]/30 bg-navy-base/95 backdrop-blur-xl rounded-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50 bg-slate-900/40">
              <div className="flex items-center gap-2.5">
                <panelContent.icon className="h-4 w-4 text-[#C6A86B]" />
                <span className="font-mono text-xs text-white font-bold tracking-wide uppercase">
                  {panelContent.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[8px] text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {panelContent.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 border border-slate-800/30 bg-slate-900/20 animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C6A86B]/50 shrink-0" />
                  <span className="font-mono text-[10px] text-slate-300 tracking-wide">
                    {item}
                  </span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0 ml-auto" />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800/30 bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-slate-600 uppercase tracking-widest">
                  {panelContent.items.length} verified
                </span>
                <span className="font-mono text-[8px] text-[#C6A86B]/40 uppercase tracking-widest">
                  Autonomous Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
