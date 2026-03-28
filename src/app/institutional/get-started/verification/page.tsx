"use client";

/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   Guided Verification stage: renders the entity verification,
   UBO review, AML screening, and compliance review milestones
   from AUTHORITATIVE compliance case state.

   Milestone status is derived from the user's compliance_cases
   row via useComplianceCaseVerification(). No simulated timers.

   PROVIDER INITIATION:
     When no compliance case exists (caseStatus === null) or the
     case is OPEN, the page shows a "Begin Verification" CTA that
     calls serverInitiateVerification() via the initiation mutation.
     This creates a compliance case and routes the user to the
     active provider (iDenfy/Veriff).

   One calm screen. One authoritative checklist. One action.

   Reuses:
     • compliance_cases.status as the single source of truth
     • AutoCheckList (guided-flow component)
     • onboarding state persistence (useSaveOnboardingState)
     • journey stage helpers (advance to FUNDING)

   Progression rule:
     "Continue to Funding" is enabled ONLY when all 4 milestones
     are true — which requires compliance_cases.status === APPROVED.
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  AutoCheckList,
  type CheckItem,
  type CheckItemStatus,
} from "@/components/institutional-flow/AutoCheckList";

import {
  type VerificationStageData,
} from "@/lib/schemas/verification-stage-schema";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

import {
  useComplianceCaseVerification,
  useInitiateVerification,
  type InitiateVerificationResponse,
} from "@/hooks/use-compliance-case";

/* ================================================================
   MILESTONE DEFINITIONS
   ================================================================ */

interface MilestoneDefinition {
  key: keyof VerificationStageData;
  label: string;
  descriptionPending: string;
  descriptionActive: string;
  descriptionDone: string;
}

const MILESTONES: MilestoneDefinition[] = [
  {
    key: "entityVerificationPassed",
    label: "Entity Verification",
    descriptionPending: "Corporate registry and KYB checks against national databases",
    descriptionActive: "Verifying entity registration and corporate structure…",
    descriptionDone: "Entity registration and corporate structure verified",
  },
  {
    key: "uboReviewPassed",
    label: "Representative & UBO Review",
    descriptionPending: "Verifying beneficial owners and authorized representatives",
    descriptionActive: "Provider is reviewing beneficial ownership declarations…",
    descriptionDone: "Beneficial owners and authorized representatives verified",
  },
  {
    key: "screeningPassed",
    label: "Global AML / Sanctions Screening",
    descriptionPending: "Screening against OFAC, EU, UN, HMT, and DFAT watchlists",
    descriptionActive: "Running AML and sanctions screening checks…",
    descriptionDone: "AML and sanctions screening passed — no matches found",
  },
  {
    key: "complianceReviewPassed",
    label: "Compliance Review",
    descriptionPending: "Final cross-check and risk assessment",
    descriptionActive: "Final compliance review in progress…",
    descriptionDone: "Compliance review complete — entity cleared",
  },
];

/* ================================================================
   HELPERS
   ================================================================ */

/** Derive AutoCheckList items from authoritative milestone data. */
function milestoneToCheckItems(
  data: VerificationStageData,
): CheckItem[] {
  /* Walk through milestones in order. The first false milestone is
     "active" (currently being processed). All after it are "pending". */
  let foundFirstIncomplete = false;

  return MILESTONES.map((m) => {
    const passed = data[m.key];

    if (passed) {
      return {
        key: m.key,
        label: m.label,
        description: m.descriptionDone,
        status: "done" as CheckItemStatus,
      };
    }

    if (!foundFirstIncomplete) {
      foundFirstIncomplete = true;
      return {
        key: m.key,
        label: m.label,
        description: m.descriptionActive,
        status: "active" as CheckItemStatus,
      };
    }

    return {
      key: m.key,
      label: m.label,
      description: m.descriptionPending,
      status: "pending" as CheckItemStatus,
    };
  });
}

/** Count how many milestones are complete. */
function completedCount(data: VerificationStageData): number {
  return MILESTONES.filter((m) => data[m.key]).length;
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function VerificationPage() {
  const router = useRouter();

  /* ── Authoritative state from compliance case ── */
  const {
    milestones: authoritativeMilestones,
    allComplete,
    caseStatus,
    statusLabel,
    isLoading: caseLoading,
  } = useComplianceCaseVerification();

  /* ── Provider initiation mutation ── */
  const initiateVerification = useInitiateVerification();

  /* ── Onboarding state hooks ── */
  const { isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  /* ── Local state ── */
  const [isSaving, setIsSaving] = useState(false);
  const [providerRedirectUrl, setProviderRedirectUrl] = useState<string | null>(null);
  const [initiationError, setInitiationError] = useState<string | null>(null);


  /* ── Derived state ── */
  const completed = completedCount(authoritativeMilestones);
  const checkItems = milestoneToCheckItems(authoritativeMilestones);
  const isAnyActive = checkItems.some((item) => item.status === "active");

  /* ── Whether the user can initiate verification ── */
  /* Show the button for ANY non-APPROVED status so the user can
     always get to the KYCaid form, even after abandoning mid-flow */
  const canInitiate = !allComplete;
  const isInitiating = initiateVerification.isPending;

  /* ── Handle provider initiation ── */
  const handleInitiateVerification = useCallback(async () => {
    setInitiationError(null);
    setProviderRedirectUrl(null);

    try {
      const result: InitiateVerificationResponse =
        await initiateVerification.mutateAsync();

      if (result.status === "REDIRECT" && result.redirectUrl) {
        setProviderRedirectUrl(result.redirectUrl);
        window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
      } else if (result.status === "ALREADY_CLEARED") {
        /* User is already verified — reload to show updated milestones */
        window.location.reload();
      } else if (result.error) {
        setInitiationError(result.error);
      } else {
        setInitiationError(`Unexpected status: ${result.status}. Please try again or contact support.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate verification";
      setInitiationError(msg);
    }
  }, [initiateVerification]);

  /* ── Submit: persist → advance → navigate to funding ── */
  const handleContinue = useCallback(async () => {
    if (!allComplete) return;
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 2,
        status: "IN_PROGRESS",
        metadataJson: {
          __verification: authoritativeMilestones,
          __journey: { stage: "FUNDING", firstTradeCompleted: false },
        },
      });

      router.push("/institutional/get-started/funding");
    } catch {
      // mutation error handled by TanStack Query — stays on page
      setIsSaving(false);
    }
  }, [allComplete, authoritativeMilestones, saveMutation, router]);


  /* ── Loading state ── */
  if (stateLoading || caseLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
        <p className="text-sm text-slate-500">Loading your verification status…</p>
      </div>
    );
  }

  return (
    <StepShell
      icon={ShieldCheck}
      headline="Compliance Verification"
      description="All four checks must pass before you can proceed."
    >
      <div className="w-full space-y-1.5">
        {/* ── Milestone Checklist ── */}
        <div data-tour="compliance-checklist">
          <AutoCheckList items={checkItems} />
        </div>

        {/* ── Progress summary ── */}
        <div className="flex items-center justify-center gap-2 text-[10px] py-0.5">
          {allComplete ? (
            <span className="text-[#3fae7a] font-semibold">{statusLabel}</span>
          ) : caseStatus === "REJECTED" ? (
            <span className="text-red-400 font-semibold">{statusLabel}</span>
          ) : (
            <span className="text-slate-500">
              {completed} of {MILESTONES.length} checks complete
              {isAnyActive && " · " + statusLabel}
            </span>
          )}
        </div>

        {/* ── Initiation CTA ── */}
        {canInitiate && !providerRedirectUrl && (
          <div className="flex items-center justify-center py-1">
            <button
              onClick={handleInitiateVerification}
              disabled={isInitiating}
              className="inline-flex items-center gap-2 rounded-md bg-[#C6A86B] px-6 py-2 text-xs font-semibold text-black transition-all hover:bg-[#d4b97a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Initiating…
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Begin Verification
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Provider redirect notice ── */}
        {providerRedirectUrl && (
          <div className="flex items-center justify-center gap-2 py-1">
            <a
              href={providerRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#C6A86B] text-xs font-medium hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Re-open verification tab
            </a>
          </div>
        )}

        {/* ── Initiation error ── */}
        {initiationError && (
          <div className="flex items-center justify-center gap-2 py-1">
            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
            <p className="text-[10px] text-red-400">{initiationError}</p>
            <button
              onClick={() => setInitiationError(null)}
              className="text-[10px] text-red-500 underline ml-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Primary Action ── */}
        <StickyPrimaryAction
          label="Continue to Funding"
          onClick={handleContinue}
          loading={isSaving}
          disabled={!allComplete || isSaving}
          icon={Save}
        />
      </div>
    </StepShell>
  );
}
