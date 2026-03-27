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

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  Save,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  XCircle,
  Mail,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { AppLogo } from "@/components/app-logo";
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
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  /* ── Local state ── */
  const [isSaving, setIsSaving] = useState(false);
  const [providerRedirectUrl, setProviderRedirectUrl] = useState<string | null>(null);
  const [initiationError, setInitiationError] = useState<string | null>(null);
  const hasRestoredRef = useRef(false);

  /* ── Organization data for review card ── */
  const [orgSummary, setOrgSummary] = useState<{
    entityName: string;
    jurisdiction: string;
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
          });
        }
      }
    });
  }, [stateLoading, onboardingState]);

  /* ── Derived state ── */
  const completed = completedCount(authoritativeMilestones);
  const checkItems = milestoneToCheckItems(authoritativeMilestones);
  const isAnyActive = checkItems.some((item) => item.status === "active");

  /* ── Whether the user can initiate verification ── */
  const canInitiate = !caseStatus || caseStatus === "OPEN";
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
      } else if (result.status === "ERROR" && result.error) {
        setInitiationError(result.error);
      }
      /* ALREADY_CLEARED and IN_PROGRESS are handled by query invalidation
         in the mutation's onSuccess callback — the page auto-updates. */
    } catch (err) {
      setInitiationError(
        err instanceof Error ? err.message : "Failed to initiate verification",
      );
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
      icon={<AppLogo className="h-8 w-auto" variant="dark" />}
      headline="Verification"
      description="Each milestone below reflects the live state of your compliance checks. When all four pass, the ‘Continue to Funding’ button activates. If your provider session is still open, this page will update automatically."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Checks: KYB · AML · OFAC · EU · UN · HMT · DFAT · Questions? compliance@aurumshield.com
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
            ]}
          />
        )}

        {/* ── Milestone Checklist ── */}
        <AutoCheckList items={checkItems} />

        {/* ── Rejected state — support-driven recovery ── */}
        {caseStatus === "REJECTED" && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Verification Not Approved
              </h3>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              Your entity verification was reviewed and could not be approved at this time.
              This may be due to incomplete documentation, discrepancies in the information
              provided, or the results of regulatory screening checks.
            </p>
            <div className="rounded-lg border border-slate-800/50 bg-slate-900/30 px-4 py-3 space-y-2">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                What you can do
              </p>
              <ul className="text-[11px] text-slate-400 leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Contact our compliance team to understand the specific reason for the decision</li>
                <li>Provide any additional documentation that may be required</li>
                <li>Request a new review once any issues have been addressed</li>
              </ul>
            </div>
            <p className="text-[10px] text-slate-500">
              Your onboarding progress has been preserved. If a new compliance case is
              opened by our team, you will be able to continue from where you left off.
            </p>
            <a
              href="mailto:compliance@aurumshield.com?subject=Institutional%20Verification%20Review%20Request"
              className="inline-flex items-center gap-2 w-full justify-center rounded-lg border border-red-500/30 bg-transparent px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-950/20"
            >
              <Mail className="h-4 w-4" />
              Contact Compliance Support
            </a>
          </div>
        )}

        {/* ── Progress summary — authoritative status ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {allComplete ? (
            <span className="text-[#3fae7a] font-semibold">
              {statusLabel}
            </span>
          ) : caseStatus === "REJECTED" ? (
            <span className="text-red-400 font-semibold">
              {statusLabel}
            </span>
          ) : (
            <span className="text-slate-500">
              {completed} of {MILESTONES.length} checks complete
              {isAnyActive && " · " + statusLabel}
            </span>
          )}
        </div>

        {/* ── Initiation CTA: shown when no case exists or case is OPEN ── */}
        {canInitiate && !providerRedirectUrl && (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-800/50 bg-slate-900/30 px-5 py-5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-[#C6A86B]" />
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Your entity verification has not been submitted yet. Click below
                to begin the identity and compliance verification process with our
                trusted provider.
              </p>
            </div>
            <button
              onClick={handleInitiateVerification}
              disabled={isInitiating}
              className="inline-flex items-center gap-2 rounded-md bg-[#C6A86B] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#d4b97a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating…
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Begin Verification
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Provider redirect notice: shown after initiation returns a redirect URL ── */}
        {providerRedirectUrl && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-[#C6A86B]/30 bg-[#C6A86B]/5 px-5 py-5">
            <p className="text-[12px] text-slate-300 leading-relaxed text-center">
              A verification session has been opened with our provider.
              Complete the identity and document checks in the new tab.
              This page will update automatically when your verification is processed.
            </p>
            <a
              href={providerRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#C6A86B] text-sm font-medium hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open verification tab again
            </a>
          </div>
        )}

        {/* ── PENDING_USER nudge: user started but didn't finish provider flow ── */}
        {caseStatus === "PENDING_USER" && !providerRedirectUrl && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-600/30 bg-amber-950/20 px-5 py-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Your verification session is waiting for you to complete the identity
                checks with our provider. Click below to re-open the verification flow.
              </p>
            </div>
            <button
              onClick={handleInitiateVerification}
              disabled={isInitiating}
              className="inline-flex items-center gap-2 rounded-md border border-amber-600/40 bg-transparent px-4 py-2 text-sm font-medium text-amber-400 transition-all hover:bg-amber-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Re-opening…
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Complete Verification
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Initiation error ── */}
        {initiationError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
            <div className="space-y-1">
              <p className="text-[11px] text-red-400 leading-relaxed">
                {initiationError}
              </p>
              <button
                onClick={() => setInitiationError(null)}
                className="text-[10px] text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
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
