"use client";
 
/* ================================================================
   ORGANIZATION — /institutional/get-started/organization
   ================================================================
   Minimal pre-screen: collects only what the compliance provider needs to create
   a COMPANY applicant (company name + country).
 
   Everything else (LEI, UBOs, documents, liveness, rep details)
   is handled by the provider's hosted verification form in the next step.
   ================================================================ */
 
import { useState, useCallback, useEffect, useRef } from "react";
import { type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck, Building2, Globe2, UserCheck, type LucideIcon } from "lucide-react";
 
import { StepShell } from "@/components/institutional-flow/StepShell";
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
  icon: Icon,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 group">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 group-focus-within:text-[#C6A86B] transition-colors">
          {label}
          {required && <span className="text-[#C6A86B] ml-1">*</span>}
        </label>
        {Icon && <Icon className="h-3 w-3 text-slate-700 group-focus-within:text-[#C6A86B]/50 transition-colors" />}
      </div>
      {children}
      {error && (
        <p className="text-[10px] font-mono text-red-400 mt-1 uppercase tracking-wider">{error}</p>
      )}
    </div>
  );
}
 
const INPUT_CLASSES =
  "w-full rounded-xl border px-4 py-3 bg-slate-950/60 text-sm text-slate-200 placeholder:text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C6A86B]/20 focus:border-[#C6A86B]/40";
 
const INPUT_ERROR_BORDER = "border-red-500/30";
const INPUT_NORMAL_BORDER = "border-slate-800/60";
 
/* ================================================================
   ORGANIZATION PAGE — Minimal Pre-Screen
   ================================================================ */
 
export default function OrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
 
  /* ── State hooks ── */
  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const hasRestoredRef = useRef(false);
 
  /* ── Form ── */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<OrganizationStageFormData>({
    resolver: zodResolver(organizationStageSchema),
    defaultValues: ORGANIZATION_STAGE_DEFAULTS,
    mode: "onTouched",
  });
 
  const [isSaving, setIsSaving] = useState(false);
 
  /* ── Restore form ── */
  useEffect(() => {
    if (hasRestoredRef.current || stateLoading) return;
    hasRestoredRef.current = true;
 
    if (onboardingState?.metadataJson?.__organization) {
      reset({
        ...ORGANIZATION_STAGE_DEFAULTS,
        ...(onboardingState.metadataJson.__organization as Partial<OrganizationStageFormData>),
      });
    }
  }, [stateLoading, onboardingState, reset]);
 
  const onSubmit = useCallback(
    async (data: OrganizationStageFormData) => {
      // In demo mode, skip the real save API
      if (isDemoMode) {
        router.push("/institutional/get-started/verification?demo=true");
        return;
      }
      setIsSaving(true);
      try {
        await saveMutation.mutateAsync({
          currentStep: 1,
          status: "IN_PROGRESS",
          metadataJson: {
            __organization: data,
            __journey: { stage: "VERIFICATION", firstTradeCompleted: false },
          },
        });
        router.push("/institutional/get-started/verification");
      } catch {
        setIsSaving(false);
      }
    },
    [isDemoMode, saveMutation, router],
  );
 
  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" strokeWidth={1.5} />
        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">
          Syncing State…
        </p>
      </div>
    );
  }
 
  return (
    <StepShell
      icon={Building2}
      headline="Entity Profile"
      badge="Phase 01 of 04"
      description="Initialize your institutional profile. This data seeds the regulatory screening process conducted by our autonomous compliance engine."
      footer={
        <div className="flex items-center justify-center gap-6">
          {[
            { label: "Data", value: "AES-256 Encrypted" },
            { label: "Privacy", value: "Zero Knowledge" },
            { label: "Transmission", value: "TLS 1.3" }
          ].map(attr => (
            <div key={attr.label} className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-[#C6A86B]/40" />
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">{attr.label}:</span>
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">{attr.value}</span>
            </div>
          ))}
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-8 text-left" data-tour="entity-form">
        <div className="space-y-6">
          {/* ── Company Name ── */}
          <GuidedField
            label="Legal Entity Name"
            error={errors.companyName?.message}
            required
            icon={Building2}
          >
            <input
              id="companyName"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Meridian Capital Holdings Ltd."
              {...register("companyName")}
              className={`${INPUT_CLASSES} ${errors.companyName ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            />
          </GuidedField>
 
          {/* ── Representative Name ── */}
          <GuidedField
            label="Authorized Representative"
            error={errors.repName?.message}
            required
            icon={UserCheck}
          >
            <input
              id="repName"
              type="text"
              autoComplete="name"
              placeholder="e.g. James C. Sterling"
              {...register("repName")}
              className={`${INPUT_CLASSES} ${errors.repName ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            />
          </GuidedField>
  
          {/* ── Country / Jurisdiction ── */}
          <GuidedField
            label="Jurisdiction of Registration"
            error={errors.jurisdiction?.message}
            required
            icon={Globe2}
          >
            <select
              id="jurisdiction"
              {...register("jurisdiction")}
              className={`${INPUT_CLASSES} ${errors.jurisdiction ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER} appearance-none`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="" className="bg-slate-900">Select jurisdiction…</option>
              {JURISDICTION_OPTIONS.map((j) => (
                <option key={j.value} value={j.value} className="bg-slate-900">
                  {j.label}
                </option>
              ))}
            </select>
          </GuidedField>
        </div>
 
        {/* ── Primary Action ── */}
        <div className="pt-4 border-t border-slate-800/40">
          <StickyPrimaryAction
            label="Initialize Verification"
            onClick={isDemoMode ? () => router.push("/institutional/get-started/verification?demo=true") : handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={isSaving || (!isDemoMode && !isValid)}
            icon={ArrowRight}
          />
        </div>
      </form>
    </StepShell>
  );
}
