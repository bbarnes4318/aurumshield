"use client";

/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   Guided Verification stage: renders the entity verification,
   UBO review, AML screening, and compliance review milestones
   from AUTHORITATIVE compliance case state.

   Milestone status is derived from the user's compliance_cases
   row via useComplianceCaseVerification(). No simulated timers.

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

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  Save,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  AutoCheckList,
  type CheckItem,
  type CheckItemStatus,
} from "@/components/institutional-flow/AutoCheckList";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import {
  type VerificationStageData,
} from "@/lib/schemas/verification-stage-schema";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

import {
  useComplianceCaseVerification,
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

  /* ── Onboarding state hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  /* ── Local state ── */
  const [isSaving, setIsSaving] = useState(false);
  const hasRestoredRef = useRef(false);

  /* ── Organization data for review card ── */
  const [orgSummary, setOrgSummary] = useState<{
    entityName: string;
    jurisdiction: string;
    representative: string;
  } | null>(null);

  /* ── Restore organization summary from persisted state ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;

    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;

        // Extract org summary for review card
        const org = meta.__organization as Record<string, unknown> | undefined;
        if (org && typeof org === "object") {
          setOrgSummary({
            entityName: (org.companyName as string) || "—",
            jurisdiction: (org.jurisdiction as string) || "—",
            representative: (org.representativeName as string) || "—",
          });
        }
      }
    });
  }, [stateLoading, onboardingState]);

  /* ── Derived state ── */
  const completed = completedCount(authoritativeMilestones);
  const checkItems = milestoneToCheckItems(authoritativeMilestones);
  const isAnyActive = checkItems.some((item) => item.status === "active");

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

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 2,
        status: "IN_PROGRESS",
        metadataJson: {
          __verification: authoritativeMilestones,
          __journey: { stage: "VERIFICATION", firstTradeCompleted: false },
        },
      });
    } catch {
      // Best-effort save — still navigate away
    }

    router.push("/institutional/get-started/welcome");
  }, [authoritativeMilestones, saveMutation, router]);

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
      headline="Verification"
      description="Your entity verification status is shown below. Each milestone reflects the current state of your compliance checks with our verification provider."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            KYB · AML · OFAC · EU · UN · HMT · DFAT
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {/* ── Organization Summary (if available) ── */}
        {orgSummary && (
          <ReviewCard
            title="Entity Under Review"
            items={[
              { label: "Entity", value: orgSummary.entityName },
              { label: "Jurisdiction", value: orgSummary.jurisdiction },
              { label: "Representative", value: orgSummary.representative },
            ]}
          />
        )}

        {/* ── Milestone Checklist ── */}
        <AutoCheckList items={checkItems} />

        {/* ── Progress summary — authoritative status ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {allComplete ? (
            <span className="text-[#3fae7a] font-semibold">
              {statusLabel}
            </span>
          ) : (
            <span className="text-slate-500">
              {completed} of {MILESTONES.length} checks complete
              {isAnyActive && " · " + statusLabel}
            </span>
          )}
        </div>

        {/* ── Compliance case info (when not yet started) ── */}
        {!caseStatus && (
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/50 bg-slate-900/30 px-4 py-3">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-slate-600" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No active verification case found. Your compliance checks will
              begin once your entity registration is submitted to our
              verification provider. This may happen automatically or require
              you to complete an identity verification step.
            </p>
          </div>
        )}

        {/* ── Primary Action ── */}
        <StickyPrimaryAction
          label="Continue to Funding"
          onClick={handleContinue}
          loading={isSaving}
          disabled={!allComplete || isSaving}
          icon={Save}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </div>
    </StepShell>
  );
}
