"use client";

/* ================================================================
   ORGANIZATION — /institutional/get-started/organization
   ================================================================
   Minimal pre-screen: collects only what the compliance provider needs to create
   a COMPANY applicant (company name + country).

   Everything else (LEI, UBOs, documents, liveness, rep details)
   is handled by the provider's hosted verification form in the next step.

   One screen. Two fields. One action.
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { AppLogo } from "@/components/app-logo";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";

import {
  organizationStageSchema,
  ORGANIZATION_STAGE_DEFAULTS,
  type OrganizationStageFormData,
} from "@/lib/schemas/organization-stage-schema";

import { JURISDICTION_OPTIONS } from "@/lib/schemas/onboarding-schema";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ================================================================
   FORM FIELD — Styled for the guided-flow design system
   ================================================================ */

function GuidedField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="text-[#C6A86B] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}

const INPUT_CLASSES =
  "w-full rounded-lg border px-3.5 py-2.5 bg-slate-900/80 text-sm text-slate-300 placeholder:text-slate-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#C6A86B]/40 focus:border-[#C6A86B]/50";

const INPUT_ERROR_BORDER = "border-red-400/60";
const INPUT_NORMAL_BORDER = "border-slate-800";

/* ================================================================
   ORGANIZATION PAGE — Minimal Pre-Screen
   ================================================================ */

export default function OrganizationPage() {
  const router = useRouter();

  /* ── State hooks ── */
  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const hasRestoredRef = useRef(false);

  /* ── Form ── */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationStageFormData>({
    resolver: zodResolver(organizationStageSchema),
    defaultValues: ORGANIZATION_STAGE_DEFAULTS,
    mode: "onTouched",
  });

  /* ── Submission state ── */
  const [isSaving, setIsSaving] = useState(false);

  /* ── Restore form from persisted state ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;

    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;
        const saved = meta.__organization as Partial<OrganizationStageFormData> | undefined;
        if (saved && typeof saved === "object") {
          reset({
            ...ORGANIZATION_STAGE_DEFAULTS,
            ...saved,
          });
        }
      }
    });
  }, [stateLoading, onboardingState, reset]);

  /* ── Submit: validate → persist → advance → navigate ── */
  const onSubmit = useCallback(
    async (data: OrganizationStageFormData) => {
      setIsSaving(true);

      try {
        // 1. Persist organization data + advance journey stage
        await saveMutation.mutateAsync({
          currentStep: 1,
          status: "IN_PROGRESS",
          metadataJson: {
            __organization: data,
            __journey: { stage: "VERIFICATION", firstTradeCompleted: false },
          },
        });

        // 2. Navigate to verification (which will launch the compliance provider)
        router.push("/institutional/get-started/verification");
      } catch {
        // mutation error is handled by TanStack Query — stays on page
        setIsSaving(false);
      }
    },
    [saveMutation, router],
  );

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
      icon={<AppLogo className="h-8 w-auto" variant="dark" />}
      headline="Your Organization"
      description="Enter your entity name and country of registration. Our compliance engine handles the rest — identity verification, document review, and regulatory screening — in the next step."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            256-Bit Encrypted · Compliance Verified · Data Never Resold
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
        {/* ── Company Name ── */}
        <GuidedField
          label="Legal Entity Name"
          error={errors.companyName?.message}
          required
        >
          <input
            id="companyName"
            type="text"
            placeholder="e.g. Meridian Capital Holdings Ltd."
            {...register("companyName")}
            className={`${INPUT_CLASSES} ${errors.companyName ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
          />
        </GuidedField>

        {/* ── Country / Jurisdiction ── */}
        <GuidedField
          label="Country of Registration"
          error={errors.jurisdiction?.message}
          required
        >
          <select
            id="jurisdiction"
            {...register("jurisdiction")}
            className={`${INPUT_CLASSES} ${errors.jurisdiction ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
          >
            <option value="" className="text-slate-600">
              Select country…
            </option>
            {JURISDICTION_OPTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </GuidedField>

        {/* ── Primary Action ── */}
        <StickyPrimaryAction
          label="Continue to Verification"
          onClick={handleSubmit(onSubmit)}
          loading={isSaving}
          disabled={isSaving}
          icon={ArrowRight}
        />
      </form>
    </StepShell>
  );
}
