"use client";

/* ================================================================
   ORGANIZATION — /institutional/get-started/organization
   ================================================================
   Guided Organization stage: the user defines their institutional
   entity and the authorized representative acting on its behalf.

   One calm screen. Two sections. One action.

   Reuses:
     • verifyLEI server action (GLEIF verification)
     • JURISDICTION_OPTIONS (from onboarding-schema)
     • onboarding state persistence (useOnboardingState hooks)
     • journey stage helpers (advance to VERIFICATION)

   Does NOT reuse:
     • OnboardingWizard orchestrator
     • Legacy FormField components / FormProvider context
     • Legacy ProgressBar (MissionLayout has SimpleProgress)
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Globe,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Save,
} from "lucide-react";

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

import { verifyLEI } from "@/actions/gleif-verify";

/* ================================================================
   GLEIF Verification Badge (sovereign green glow)
   ================================================================ */

function GleifVerifiedBadge({
  entityName,
  jurisdiction,
  status,
}: {
  entityName: string;
  jurisdiction: string;
  status: string;
}) {
  return (
    <div
      className="rounded-lg border border-[#3fae7a]/40 bg-[#3fae7a]/5 px-4 py-3 space-y-2"
      style={{
        boxShadow:
          "0 0 20px rgba(63, 174, 122, 0.12), 0 0 6px rgba(63, 174, 122, 0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <CheckCircle2 className="h-4 w-4 text-[#3fae7a]" />
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: "rgba(63, 174, 122, 0.3)",
              animationDuration: "2s",
            }}
          />
        </div>
        <span className="text-xs font-bold text-[#3fae7a] tracking-wide uppercase">
          LEI Verified
        </span>
      </div>
      <div className="grid grid-cols-3 gap-x-3 text-[11px]">
        <div>
          <span className="text-slate-500">Entity</span>
          <p className="text-slate-300 font-medium truncate">{entityName}</p>
        </div>
        <div>
          <span className="text-slate-500">Status</span>
          <p className="text-[#3fae7a] font-semibold">{status}</p>
        </div>
        <div>
          <span className="text-slate-500">Jurisdiction</span>
          <p className="text-slate-300 font-medium">{jurisdiction}</p>
        </div>
      </div>
    </div>
  );
}

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
   ORGANIZATION PAGE — Main component
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
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<OrganizationStageFormData>({
    resolver: zodResolver(organizationStageSchema),
    defaultValues: ORGANIZATION_STAGE_DEFAULTS,
    mode: "onTouched",
  });

  /* ── GLEIF verification state ── */
  const [gleifState, setGleifState] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [gleifData, setGleifData] = useState<{
    entityName: string;
    jurisdiction: string;
    status: string;
  } | null>(null);
  const [gleifError, setGleifError] = useState<string | null>(null);

  /* ── Submission state ── */
  const [isSaving, setIsSaving] = useState(false);

  const leiValue = watch("legalEntityIdentifier");

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
          // Restore GLEIF verification state if LEI was already verified
          if (saved.leiVerified && saved.companyName) {
            setGleifState("verified");
            setGleifData({
              entityName: saved.companyName,
              jurisdiction: saved.jurisdiction ?? "",
              status: "ISSUED",
            });
          }
        }
      }
    });
  }, [stateLoading, onboardingState, reset]);

  /* ── GLEIF Verification ── */
  const handleGleifVerify = useCallback(async () => {
    if (!leiValue || leiValue.trim().length !== 20) return;
    setGleifState("verifying");
    setGleifError(null);

    try {
      const result = await verifyLEI(leiValue);

      if (result.valid && result.status === "ISSUED") {
        setGleifState("verified");
        setGleifData({
          entityName: result.entityName ?? leiValue,
          jurisdiction: result.jurisdiction ?? "",
          status: result.status,
        });

        // Auto-populate company name and jurisdiction from GLEIF
        if (result.entityName) {
          setValue("companyName", result.entityName, { shouldValidate: true });
        }
        if (result.jurisdiction) {
          const jurisdictionMap: Record<string, string> = {
            US: "US", "US-NY": "US", "US-DE": "US", "US-CA": "US",
            GB: "GB", "GB-ENG": "GB",
            CH: "CH", SG: "SG", HK: "HK",
            AE: "AE", LU: "LU", JE: "JE", GG: "GG",
            BM: "BM", KY: "KY", AU: "AU", CA: "CA",
            DE: "DE", JP: "JP",
          };
          const mapped = jurisdictionMap[result.jurisdiction] ?? "";
          if (mapped) {
            setValue("jurisdiction", mapped, { shouldValidate: true });
          }
        }
        setValue("leiVerified", true, { shouldValidate: true });
      } else {
        setGleifState("error");
        setGleifError(
          result.error ??
            `LEI status is ${result.status ?? "UNKNOWN"} — entity must have ISSUED status`,
        );
      }
    } catch (err) {
      setGleifState("error");
      setGleifError(
        err instanceof Error ? err.message : "GLEIF verification failed",
      );
    }
  }, [leiValue, setValue]);

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

        // 2. Navigate to the next stage
        router.push("/institutional/get-started/verification");
      } catch {
        // mutation error is handled by TanStack Query — stays on page
        setIsSaving(false);
      }
    },
    [saveMutation, router],
  );

  /* ── Save and return later (escape hatch) ── */
  const handleSaveAndExit = useCallback(async () => {
    const currentValues = getValues();
    setIsSaving(true);

    try {
      // Persist current form data WITHOUT advancing the journey stage
      await saveMutation.mutateAsync({
        currentStep: 1,
        status: "IN_PROGRESS",
        metadataJson: {
          __organization: currentValues,
          __journey: { stage: "ORGANIZATION", firstTradeCompleted: false },
        },
      });
    } catch {
      // Best-effort save — still navigate away
    }

    // Route back to welcome — NOT to /institutional (prevents bypass)
    router.push("/institutional/get-started/welcome");
  }, [getValues, saveMutation, router]);

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
      icon={Building2}
      headline="Your Organization"
      description="Tell us about your institutional entity and who is acting on its behalf. We'll verify the details in the next step."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            256-Bit Encrypted · GLEIF API Verified · Data Never Resold
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-8">
        {/* ════════════════════════════════════════════════════════
           Section 1: Entity Identity
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-[#C6A86B]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Entity Identity
            </h2>
          </div>

          {/* Company Name */}
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

          {/* Jurisdiction */}
          <GuidedField
            label="Jurisdiction"
            error={errors.jurisdiction?.message}
            required
          >
            <select
              id="jurisdiction"
              {...register("jurisdiction")}
              className={`${INPUT_CLASSES} ${errors.jurisdiction ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            >
              <option value="" className="text-slate-600">
                Select jurisdiction…
              </option>
              {JURISDICTION_OPTIONS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </GuidedField>

          {/* LEI + Verify */}
          <GuidedField
            label="Legal Entity Identifier (LEI)"
            error={errors.legalEntityIdentifier?.message}
          >
            <div className="flex gap-2">
              <input
                id="legalEntityIdentifier"
                type="text"
                placeholder="5493001KJTIIGC8Y1R12"
                maxLength={20}
                {...register("legalEntityIdentifier")}
                className={`flex-1 font-mono tracking-wider uppercase ${INPUT_CLASSES} ${errors.legalEntityIdentifier ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
              />
              <button
                type="button"
                onClick={handleGleifVerify}
                disabled={
                  gleifState === "verifying" ||
                  gleifState === "verified" ||
                  !leiValue ||
                  leiValue.trim().length !== 20
                }
                className="
                  inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5
                  bg-[#C6A86B]/15 text-[#C6A86B] text-xs font-medium
                  border border-[#C6A86B]/25
                  hover:bg-[#C6A86B]/25 active:bg-[#C6A86B]/30
                  disabled:opacity-40 disabled:pointer-events-none
                  transition-colors duration-150
                  whitespace-nowrap
                "
              >
                {gleifState === "verifying" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying…
                  </>
                ) : gleifState === "verified" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    Verify via GLEIF
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              Optional — auto-verifies your entity and populates details
            </p>
          </GuidedField>

          {/* GLEIF Verified Badge */}
          {gleifState === "verified" && gleifData && (
            <GleifVerifiedBadge
              entityName={gleifData.entityName}
              jurisdiction={gleifData.jurisdiction}
              status={gleifData.status}
            />
          )}

          {/* GLEIF Error */}
          {gleifState === "error" && gleifError && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">
                  GLEIF Verification Failed
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">{gleifError}</p>
            </div>
          )}

          {/* Registration Number (optional) */}
          <GuidedField
            label="Registration Number"
            error={errors.registrationNumber?.message}
          >
            <input
              id="registrationNumber"
              type="text"
              placeholder="e.g. 12345678 (optional)"
              {...register("registrationNumber")}
              className={`${INPUT_CLASSES} ${errors.registrationNumber ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            />
          </GuidedField>
        </section>

        {/* ════════════════════════════════════════════════════════
           Section 2: Authorized Representative
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-[#C6A86B]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Authorized Representative
            </h2>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
            The person acting on behalf of the entity for this account.
          </p>

          {/* Name + Title row */}
          <div className="grid grid-cols-2 gap-3">
            <GuidedField
              label="Full Name"
              error={errors.representativeName?.message}
              required
            >
              <input
                id="representativeName"
                type="text"
                placeholder="e.g. James Fletcher"
                {...register("representativeName")}
                className={`${INPUT_CLASSES} ${errors.representativeName ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
              />
            </GuidedField>

            <GuidedField
              label="Title / Role"
              error={errors.representativeTitle?.message}
              required
            >
              <input
                id="representativeTitle"
                type="text"
                placeholder="e.g. CFO"
                {...register("representativeTitle")}
                className={`${INPUT_CLASSES} ${errors.representativeTitle ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
              />
            </GuidedField>
          </div>

          {/* Contact Email */}
          <GuidedField
            label="Contact Email"
            error={errors.contactEmail?.message}
            required
          >
            <input
              id="contactEmail"
              type="email"
              placeholder="treasury@meridian.com"
              {...register("contactEmail")}
              className={`${INPUT_CLASSES} ${errors.contactEmail ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            />
          </GuidedField>

          {/* Contact Phone */}
          <GuidedField
            label="Contact Phone"
            error={errors.contactPhone?.message}
            required
          >
            <input
              id="contactPhone"
              type="tel"
              placeholder="+14155551234"
              {...register("contactPhone")}
              className={`${INPUT_CLASSES} ${errors.contactPhone ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER}`}
            />
          </GuidedField>
        </section>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Save & Continue"
          onClick={handleSubmit(onSubmit)}
          loading={isSaving}
          disabled={isSaving}
          icon={Save}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </form>
    </StepShell>
  );
}
