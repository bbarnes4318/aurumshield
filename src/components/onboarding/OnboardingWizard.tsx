"use client";

/* ================================================================
   ONBOARDING WIZARD — Orchestrator (7-step enterprise flow)
   ================================================================
   Seven-step progressive disclosure for institutional KYB enrollment,
   LEI/GLEIF verification, UBO declaration, automated AML screening,
   Source-of-Funds declaration, maker-checker role assignment, and
   DocuSign CLM attestation.

   MFA (TOTP / WebAuthn / SSO) is handled by the Identity Provider
   and is NOT part of this onboarding flow.

   Save-and-Resume:
     • On mount: loads saved state from /api/compliance/state
     • On step transition: auto-saves progress
     • "Resume Later" button for safe exit
     • On final submit: marks state as COMPLETED

   Steps:
     1. Entity Registration & LEI
     2. KYB Entity Verification
     3. UBO Declaration (dynamic array)
     4. AML Screening (auto-run)
     5. Source of Funds Declaration
     6. Maker-Checker Role Assignment
     7. DocuSign CLM & MCA Execution
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  LogOut,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import {
  onboardingSchema,
  ONBOARDING_STEPS,
  type OnboardingFormData,
} from "@/lib/schemas/onboarding-schema";

import { StepCorporateIdentity } from "./StepCorporateIdentity";
import { StepKYBEntityVerification } from "./StepKYBEntityVerification";
import { StepUBODocuments } from "./StepUBODocuments";
import { StepAMLScreening } from "./StepAMLScreening";
import { StepSourceOfFunds } from "./StepSourceOfFunds";
import { StepMakerChecker } from "./StepMakerChecker";
import { StepDocuSignCLM } from "./StepDocuSignCLM";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ----------------------------------------------------------------
   Constants
   ---------------------------------------------------------------- */

/** Total number of steps in the wizard. */
const TOTAL_STEPS = 7;

/** Step index (1-based) of the DocuSign CLM / MCA gate. */
const MCA_STEP = 7;

/** Fatal error copy — displayed if a user attempts to bypass MCA signing. */
const MCA_FATAL_MESSAGE =
  "Legal indemnification required. The Master Commercial Agreement must be executed by an authorized corporate officer before treasury routing is enabled.";

/* ----------------------------------------------------------------
   Progress Bar — 7-step
   ---------------------------------------------------------------- */

function ProgressBar({ currentStep }: { currentStep: number }) {
  const progress = ((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100;

  return (
    <div className="mb-5">
      {/* Step circles + labels */}
      <div className="flex items-center justify-between mb-3">
        {ONBOARDING_STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full
                  text-[10px] font-bold transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-color-2 text-color-1"
                      : isActive
                        ? "border-2 border-color-2 text-color-2"
                        : "border border-color-5/40 text-color-5"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`
                  text-[9px] font-semibold tracking-wide uppercase max-w-[60px] text-center leading-tight
                  ${isActive ? "text-color-2" : isCompleted ? "text-color-3/70" : "text-color-5/60"}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div className="relative h-1 w-full rounded-full bg-color-5/20 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-color-2 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Wizard Component
   ---------------------------------------------------------------- */

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [fatalMcaError, setFatalMcaError] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const router = useRouter();
  const hasRestoredRef = useRef(false);

  /* ── Saved state hooks ── */
  const savedStateQ = useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  const methods = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      legalEntityIdentifier: "",
      leiVerified: false,
      registrationNumber: "",
      jurisdiction: "",
      contactEmail: "",
      contactPhone: "",
      kybVerificationPassed: false as unknown as true,
      ubos: [{ name: "", ownershipPercentage: "" }],
      uboDeclarationAccepted: false as unknown as true,
      sanctionsScreeningPassed: false as unknown as true,
      sourceOfFundsType: undefined,
      sourceOfFundsAttested: false as unknown as true,
      primaryRole: undefined,
      dualAuthAcknowledged: false as unknown as true,
      agreementSigned: false as unknown as true,
      complianceAttested: false as unknown as true,
    },
    mode: "onTouched",
  });

  const { trigger, handleSubmit, reset, getValues } = methods;

  /* ── Restore saved state on mount ──
     Uses queueMicrotask to avoid synchronous setState inside the
     effect body, which the React compiler flags as a cascading
     render hazard. The microtask fires after the effect commit
     but before paint, so there is no visible flash. ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (savedStateQ.isLoading) return;

    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (savedStateQ.data) {
        const saved = savedStateQ.data;

        // Restore wizard step
        if (saved.currentStep >= 1 && saved.currentStep <= TOTAL_STEPS) {
          setCurrentStep(saved.currentStep);
        }

        // Restore form values from metadata_json
        const meta = saved.metadataJson as Partial<OnboardingFormData> | undefined;
        if (meta && typeof meta === "object") {
          reset({
            companyName: meta.companyName ?? "",
            legalEntityIdentifier: meta.legalEntityIdentifier ?? "",
            leiVerified: meta.leiVerified ?? false,
            registrationNumber: meta.registrationNumber ?? "",
            jurisdiction: meta.jurisdiction ?? "",
            contactEmail: meta.contactEmail ?? "",
            contactPhone: meta.contactPhone ?? "",
            kybVerificationPassed: (meta.kybVerificationPassed ?? false) as unknown as true,
            ubos: meta.ubos ?? [{ name: "", ownershipPercentage: "" }],
            uboDeclarationAccepted: (meta.uboDeclarationAccepted ?? false) as unknown as true,
            sanctionsScreeningPassed: (meta.sanctionsScreeningPassed ?? false) as unknown as true,
            sourceOfFundsType: meta.sourceOfFundsType,
            sourceOfFundsAttested: (meta.sourceOfFundsAttested ?? false) as unknown as true,
            primaryRole: meta.primaryRole,
            dualAuthAcknowledged: (meta.dualAuthAcknowledged ?? false) as unknown as true,
            agreementSigned: (meta.agreementSigned ?? false) as unknown as true,
            complianceAttested: (meta.complianceAttested ?? false) as unknown as true,
          });
        }
      }

      setIsRestoring(false);
    });
  }, [savedStateQ.isLoading, savedStateQ.data, reset]);

  /* ── Auto-save helper ── */
  const saveProgress = useCallback(
    (step: number, status: "IN_PROGRESS" | "COMPLETED" = "IN_PROGRESS") => {
      const formData = getValues();
      saveMutation.mutate({
        currentStep: step,
        status,
        metadataJson: formData as unknown as Record<string, unknown>,
      });
    },
    [getValues, saveMutation],
  );

  /* ── Step navigation ── */

  const stepFields = ONBOARDING_STEPS[currentStep - 1].fields;

  const goNext = useCallback(async () => {
    const valid = await trigger(stepFields as unknown as (keyof OnboardingFormData)[]);
    if (!valid) return;

    /* ── MCA HARD GATE — Step 7 (DocuSign CLM) ── */
    if (currentStep === MCA_STEP) {
      const mcaSigned = getValues("agreementSigned");
      if (mcaSigned !== true) {
        setFatalMcaError(true);
        return;
      }
    }

    const nextStep = currentStep + 1;
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(nextStep);
      saveProgress(nextStep);
    }
  }, [currentStep, trigger, stepFields, saveProgress, getValues]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveProgress(prevStep);
    }
  }, [currentStep, saveProgress]);

  /* ── Resume Later ── */
  const handleResumeLater = useCallback(() => {
    saveProgress(currentStep);
    router.push("/institutional");
  }, [currentStep, saveProgress, router]);

  /* ── Final submission ── */

  const onSubmit = useCallback(
    async (data: OnboardingFormData) => {
      /* ── MCA HARD GATE — Final submission guard ── */
      if (data.agreementSigned !== true) {
        setFatalMcaError(true);
        return;
      }

      setIsSubmitting(true);

      // TODO: POST to /api/onboarding with the verified data
      console.log("[AurumShield] Onboarding data submitted:", data);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark onboarding as completed
      saveProgress(TOTAL_STEPS, "COMPLETED");

      setIsSubmitting(false);
      setSubmitSuccess(true);

      // Route into the portal after a brief success state
      setTimeout(() => {
        router.push("/institutional");
      }, 2000);
    },
    [router, saveProgress],
  );

  /* ── Render active step ── */

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepCorporateIdentity />;
      case 2:
        return <StepKYBEntityVerification />;
      case 3:
        return <StepUBODocuments />;
      case 4:
        return <StepAMLScreening />;
      case 5:
        return <StepSourceOfFunds />;
      case 6:
        return <StepMakerChecker />;
      case 7:
        return <StepDocuSignCLM />;
      default:
        return null;
    }
  };

  /* ── Loading state while restoring ── */
  if (isRestoring) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-color-2 animate-spin" />
        <p className="text-sm text-color-3/50">Restoring your progress…</p>
      </div>
    );
  }

  /* ── Success state after submission ── */
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#3fae7a]/30 bg-[#3fae7a]/5">
          <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#3fae7a]">
            Onboarding Complete
          </h2>
          <p className="text-sm text-color-3/50 mt-1">
            Your institutional enrollment has been submitted. Redirecting to the portal…
          </p>
        </div>
        <Loader2 className="h-5 w-5 text-color-2 animate-spin mt-2" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="h-screen overflow-hidden flex flex-col bg-slate-950">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4" data-tour="onboarding-status">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-color-2/10">
            <Shield className="h-5 w-5 text-color-2" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-color-3 tracking-tight">
              Institutional Onboarding
            </h1>
            <p className="text-xs text-color-3/50">
              Enterprise KYB · GLEIF LEI · Source of Funds · DocuSign CLM
            </p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar currentStep={currentStep} />

        {/* Active step — scrollable content area */}
        <div className="flex-1 overflow-y-auto px-1 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" data-tour="onboarding-lei">
          <div className="min-h-[280px]">{renderStep()}</div>
        </div>

        {/* Navigation — Fixed frosted glass footer */}
        <div className="shrink-0 flex items-center justify-between bg-black/90 backdrop-blur-md border-t border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="text-sm font-medium text-color-3/60 hover:text-color-3 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {/* Resume Later */}
            <button
              type="button"
              onClick={handleResumeLater}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-color-3/40 hover:text-color-3/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Resume Later
            </button>
          </div>

          {currentStep < ONBOARDING_STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="
                inline-flex items-center gap-2 rounded-lg px-6 py-2.5
                bg-color-2 text-color-1 text-sm font-semibold
                hover:bg-color-2/90 active:bg-color-2/80
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50
              "
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                inline-flex items-center gap-2 rounded-lg px-6 py-2.5
                bg-color-2 text-color-1 text-sm font-semibold
                hover:bg-color-2/90 active:bg-color-2/80
                disabled:opacity-50 disabled:pointer-events-none
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50
              "
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-color-1 border-t-transparent" />
                  Finalizing…
                </>
              ) : (
                "Complete Onboarding ✓"
              )}
            </button>
          )}
        </div>

        {/* ── MCA Fatal Error Overlay ── */}
        {fatalMcaError && (
          <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 max-w-md rounded-xl border border-red-500/30 bg-[#0B0E14] p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Onboarding Blocked
                </h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {MCA_FATAL_MESSAGE}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFatalMcaError(false);
                  setCurrentStep(MCA_STEP);
                }}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  rounded-lg px-5 py-2.5
                  bg-red-500/15 text-red-400 text-sm font-semibold
                  border border-red-500/30
                  hover:bg-red-500/25 active:bg-red-500/30
                  transition-colors duration-150
                "
              >
                Return to Agreement Signing
              </button>
            </div>
          </div>
        )}
      </form>
    </FormProvider>
  );
}
