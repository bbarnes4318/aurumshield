"use client";

/* ================================================================
   VERIFICATION — /institutional/get-started/verification
   ================================================================
   Guided Verification stage: the system runs entity verification,
   UBO review, AML screening, and compliance cross-checks as four
   calm milestones instead of a dense compliance wall.

   One calm screen. One auto-running checklist. One action.

   Reuses:
     • KYB entity verification simulation pattern
       (StepKYBEntityVerification — staggered timers)
     • AML screening simulation pattern
       (StepAMLScreening — auto-run on mount)
     • AutoCheckList (guided-flow component)
     • onboarding state persistence (useSaveOnboardingState)
     • journey stage helpers (advance to FUNDING)

   Does NOT reuse:
     • OnboardingWizard orchestrator
     • Legacy FormProvider / react-hook-form context
     • Legacy dense sub-check cards or watchlist grids
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
  VERIFICATION_STAGE_DEFAULTS,
  isVerificationComplete,
  type VerificationStageData,
} from "@/lib/schemas/verification-stage-schema";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ================================================================
   MILESTONE DEFINITIONS
   ================================================================ */

interface MilestoneDefinition {
  key: keyof VerificationStageData;
  label: string;
  description: string;
  /** Simulated duration in ms before this milestone completes */
  simulatedDelay: number;
}

const MILESTONES: MilestoneDefinition[] = [
  {
    key: "entityVerificationPassed",
    label: "Entity Verification",
    description: "Corporate registry and KYB checks against national databases",
    simulatedDelay: 2500,
  },
  {
    key: "uboReviewPassed",
    label: "Representative & UBO Review",
    description:
      "Verifying beneficial owners and authorized representatives",
    simulatedDelay: 4000,
  },
  {
    key: "screeningPassed",
    label: "Global AML / Sanctions Screening",
    description:
      "Screening against OFAC, EU, UN, HMT, and DFAT watchlists",
    simulatedDelay: 5500,
  },
  {
    key: "complianceReviewPassed",
    label: "Compliance Review",
    description:
      "Final cross-check and risk assessment",
    simulatedDelay: 7000,
  },
];

/* ================================================================
   HELPERS
   ================================================================ */

/** Derive AutoCheckList items from milestone data. */
function milestoneToCheckItems(
  data: VerificationStageData,
  activeKeys: Set<string>,
): CheckItem[] {
  return MILESTONES.map((m) => {
    let status: CheckItemStatus = "pending";
    if (data[m.key]) {
      status = "done";
    } else if (activeKeys.has(m.key)) {
      status = "active";
    }
    return {
      key: m.key,
      label: m.label,
      description: m.description,
      status,
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

  /* ── State hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  /* ── Local state ── */
  const [milestoneData, setMilestoneData] = useState<VerificationStageData>(
    VERIFICATION_STAGE_DEFAULTS,
  );
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasRestoredRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ── Organization data for review card ── */
  const [orgSummary, setOrgSummary] = useState<{
    entityName: string;
    jurisdiction: string;
    representative: string;
  } | null>(null);

  /* ── Restore milestone data from persisted state ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;

    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;

        // Restore verification milestones
        const saved = meta.__verification as
          | Partial<VerificationStageData>
          | undefined;
        if (saved && typeof saved === "object") {
          setMilestoneData({
            ...VERIFICATION_STAGE_DEFAULTS,
            ...saved,
          });
        }

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

  /* ── Simulated verification run ── */
  useEffect(() => {
    if (stateLoading || simulationStarted) return;
    setSimulationStarted(true);

    // Determine which milestones STILL need simulation
    const pendingMilestones = MILESTONES.filter((m) => !milestoneData[m.key]);

    if (pendingMilestones.length === 0) return; // all already done

    // Mark pending milestones as active immediately
    queueMicrotask(() => {
      setActiveKeys(new Set(pendingMilestones.map((m) => m.key)));
    });

    // Stagger completion — delay is relative to the first pending milestone
    const baseDelay = pendingMilestones[0].simulatedDelay;
    pendingMilestones.forEach((milestone) => {
      const adjustedDelay = milestone.simulatedDelay - baseDelay + 1500;
      const t = setTimeout(() => {
        setMilestoneData((prev) => ({
          ...prev,
          [milestone.key]: true,
        }));
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(milestone.key);
          return next;
        });
      }, adjustedDelay);
      timersRef.current.push(t);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateLoading, simulationStarted]);

  /* ── Derived state ── */
  const allComplete = isVerificationComplete(milestoneData);
  const completed = completedCount(milestoneData);
  const checkItems = milestoneToCheckItems(milestoneData, activeKeys);

  /* ── Submit: persist → advance → navigate to funding ── */
  const handleContinue = useCallback(async () => {
    if (!allComplete) return;
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 2,
        status: "IN_PROGRESS",
        metadataJson: {
          __verification: milestoneData,
          __journey: { stage: "FUNDING", firstTradeCompleted: false },
        },
      });

      router.push("/institutional/get-started/funding");
    } catch {
      // mutation error handled by TanStack Query — stays on page
      setIsSaving(false);
    }
  }, [allComplete, milestoneData, saveMutation, router]);

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 2,
        status: "IN_PROGRESS",
        metadataJson: {
          __verification: milestoneData,
          __journey: { stage: "VERIFICATION", firstTradeCompleted: false },
        },
      });
    } catch {
      // Best-effort save — still navigate away
    }

    router.push("/institutional/get-started/welcome");
  }, [milestoneData, saveMutation, router]);

  /* ── Loading state ── */
  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
        <p className="text-sm text-slate-500">Loading your progress…</p>
      </div>
    );
  }

  return (
    <StepShell
      icon={ShieldCheck}
      headline="Verification"
      description="We're running a series of checks to verify your entity, representatives, and compliance status. This usually takes just a moment."
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

        {/* ── Progress summary ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {allComplete ? (
            <span className="text-[#3fae7a] font-semibold">
              All checks passed — your entity is verified
            </span>
          ) : (
            <span className="text-slate-500">
              {completed} of {MILESTONES.length} checks complete
              {activeKeys.size > 0 && " · screening in progress…"}
            </span>
          )}
        </div>

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
