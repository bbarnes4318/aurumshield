"use client";

/* ================================================================
   ONBOARDING WIZARD — Orchestrator (8-step enterprise flow)
   ================================================================
   Eight-step progressive disclosure for institutional KYB enrollment,
   TOTP/WebAuthn MFA credential registration, maker-checker role
   assignment, KYB entity verification, DocuSign CLM attestation,
   and verification completion.

   Save-and-Resume:
     • On mount: loads saved state from /api/compliance/state
     • On step transition: auto-saves progress
     • "Resume Later" button for safe exit
     • On final submit: marks state as COMPLETED

   Steps:
     1. Entity Registration & LEI
     2. KYB & Sanctions Screening
     3. WebAuthn & SSO Enrollment
     4. TOTP Authenticator Enrollment
     5. Maker-Checker Role Assignment
     6. DocuSign CLM & Attestation
     7. KYB Entity Verification
     8. Verification Complete
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle2, LogOut, Loader2 } from "lucide-react";

import {
  onboardingSchema,
  ONBOARDING_STEPS,
  type OnboardingFormData,
} from "@/lib/schemas/onboarding-schema";

import { StepCorporateIdentity } from "./StepCorporateIdentity";
import { StepUBODocuments } from "./StepUBODocuments";
import { StepWebAuthnEnrollment } from "./StepWebAuthnEnrollment";
import { StepTOTPEnrollment } from "./StepTOTPEnrollment";
import { StepMakerChecker } from "./StepMakerChecker";
import { StepDocuSignCLM } from "./StepDocuSignCLM";
import { StepKYBEntityVerification } from "./StepKYBEntityVerification";
import { StepLivenessCheck } from "./StepLivenessCheck";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ----------------------------------------------------------------
   Progress Bar — 8-step
   ---------------------------------------------------------------- */

function ProgressBar({ currentStep }: { currentStep: number }) {
  const progress = ((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100;

  return (
    <div className="mb-8">
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
  const router = useRouter();
  const hasRestoredRef = useRef(false);

  /* ── Saved state hooks ── */
  const savedStateQ = useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  const methods = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      leiNumber: "",
      leiVerified: false as unknown as true,
      registrationNumber: "",
      jurisdiction: "",
      contactEmail: "",
      contactPhone: "",
      uboDocumentName: "",
      uboDeclarationAccepted: false as unknown as true,
      sanctionsScreeningPassed: false as unknown as true,
      webauthnEnrolled: false as unknown as true,
      ssoProvider: "none",
      totpEnrolled: false as unknown as true,
      primaryRole: undefined,
      dualAuthAcknowledged: false as unknown as true,
      agreementSigned: false as unknown as true,
      complianceAttested: false as unknown as true,
      kybVerificationPassed: false as unknown as true,
      verificationAcknowledged: false as unknown as true,
    },
    mode: "onTouched",
  });

  const { trigger, handleSubmit, reset, getValues } = methods;

  /* ── Restore saved state on mount ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (savedStateQ.isLoading) return;

    hasRestoredRef.current = true;

    if (savedStateQ.data) {
      const saved = savedStateQ.data;

      // Restore wizard step
      if (saved.currentStep >= 1 && saved.currentStep <= 8) {
        setCurrentStep(saved.currentStep);
      }

      // Restore form values from metadata_json
      const meta = saved.metadataJson as Partial<OnboardingFormData> | undefined;
      if (meta && typeof meta === "object") {
        reset({
          companyName: meta.companyName ?? "",
          leiNumber: meta.leiNumber ?? "",
          leiVerified: (meta.leiVerified ?? false) as unknown as true,
          registrationNumber: meta.registrationNumber ?? "",
          jurisdiction: meta.jurisdiction ?? "",
          contactEmail: meta.contactEmail ?? "",
          contactPhone: meta.contactPhone ?? "",
          uboDocumentName: meta.uboDocumentName ?? "",
          uboDeclarationAccepted: (meta.uboDeclarationAccepted ?? false) as unknown as true,
          sanctionsScreeningPassed: (meta.sanctionsScreeningPassed ?? false) as unknown as true,
          webauthnEnrolled: (meta.webauthnEnrolled ?? false) as unknown as true,
          ssoProvider: meta.ssoProvider ?? "none",
          totpEnrolled: (meta.totpEnrolled ?? false) as unknown as true,
          primaryRole: meta.primaryRole,
          dualAuthAcknowledged: (meta.dualAuthAcknowledged ?? false) as unknown as true,
          agreementSigned: (meta.agreementSigned ?? false) as unknown as true,
          complianceAttested: (meta.complianceAttested ?? false) as unknown as true,
          kybVerificationPassed: (meta.kybVerificationPassed ?? false) as unknown as true,
          verificationAcknowledged: (meta.verificationAcknowledged ?? false) as unknown as true,
        });
      }
    }

    setIsRestoring(false);
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

    const nextStep = currentStep + 1;
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(nextStep);
      saveProgress(nextStep);
    }
  }, [currentStep, trigger, stepFields, saveProgress]);

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
    router.push("/buyer");
  }, [currentStep, saveProgress, router]);

  /* ── Final submission ── */

  const onSubmit = useCallback(
    async (data: OnboardingFormData) => {
      setIsSubmitting(true);

      // TODO: POST to /api/onboarding with the verified data
      console.log("[AurumShield] Onboarding data submitted:", data);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark onboarding as completed
      saveProgress(8, "COMPLETED");

      setIsSubmitting(false);
      router.push("/buyer");
    },
    [router, saveProgress],
  );

  /* ── Render active step ── */

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepCorporateIdentity />;
      case 2:
        return <StepUBODocuments />;
      case 3:
        return <StepWebAuthnEnrollment />;
      case 4:
        return <StepTOTPEnrollment />;
      case 5:
        return <StepMakerChecker />;
      case 6:
        return <StepDocuSignCLM />;
      case 7:
        return <StepKYBEntityVerification />;
      case 8:
        return <StepLivenessCheck />;
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

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-color-2/10">
            <Shield className="h-5 w-5 text-color-2" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-color-3 tracking-tight">
              Institutional Onboarding
            </h1>
            <p className="text-xs text-color-3/50">
              Enterprise KYB · WebAuthn · Maker-Checker · DocuSign CLM
            </p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar currentStep={currentStep} />

        {/* Active step */}
        <div className="min-h-[380px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-color-5/20">
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
      </form>
    </FormProvider>
  );
}
