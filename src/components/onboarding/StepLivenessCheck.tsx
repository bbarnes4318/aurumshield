"use client";

/* ================================================================
   STEP 3: Identity Verification — Persona Embedded Flow
   ================================================================
   Launches the Persona Inquiry embedded flow for KYC/KYB verification.
   Uses the official `persona` SDK to render the hosted flow as an
   overlay within the onboarding wizard.

   Critical integration point:
     - `referenceId` is set to the AurumShield userId so that when
       Persona fires the `inquiry.completed` webhook, our backend
       knows which user in PostgreSQL to update (kyc_status → APPROVED).

   States:
     idle       → user sees the "Begin Verification" button
     verifying  → Persona overlay is active (user is mid-flow)
     processing → Persona flow completed; webhook is being processed
     verified   → Terminal success state

   Environment:
     NEXT_PUBLIC_PERSONA_TEMPLATE_ID — determines which KYC/KYB flow
     to render (set in .env.local)
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  CheckCircle2,
  ScanFace,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Verification States
   ---------------------------------------------------------------- */

type VerificationState = "idle" | "verifying" | "processing" | "verified";

/* ----------------------------------------------------------------
   Mock User ID
   ----------------------------------------------------------------
   In production, this would come from the authenticated session
   (e.g. Clerk's useUser().id). For now we use a deterministic
   demo UUID so the webhook flow can be tested end-to-end.
   ---------------------------------------------------------------- */

const DEMO_USER_ID = "d290f1ee-6c54-4b01-90e6-d701748f0851";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepLivenessCheck() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [verificationState, setVerificationState] = useState<VerificationState>(
    () => (watch("livenessCompleted") ? "verified" : "idle"),
  );

  // Ref to prevent double-initialization of the Persona client
  const personaClientRef = useRef<{ destroy: () => void } | null>(null);
  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const templateId = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID;

  /* ── Launch Persona Embedded Flow ── */
  const launchPersonaFlow = useCallback(async () => {
    if (!templateId) {
      console.error(
        "[AurumShield] NEXT_PUBLIC_PERSONA_TEMPLATE_ID is not configured",
      );
      // Fallback: simulate a 3s verification for demo/development
      setVerificationState("verifying");
      setTimeout(() => {
        if (!mountedRef.current) return;
        setVerificationState("processing");
        setTimeout(() => {
          if (!mountedRef.current) return;
          setVerificationState("verified");
          setValue("livenessCompleted", true as unknown as true, {
            shouldValidate: true,
          });
        }, 2000);
      }, 3000);
      return;
    }

    setVerificationState("verifying");

    try {
      // Dynamic import to keep persona out of the initial bundle
      const Persona = await import("persona");

      // Destroy any existing client instance
      if (personaClientRef.current) {
        try {
          personaClientRef.current.destroy();
        } catch {
          // Client may already be destroyed
        }
      }

      const client = new Persona.Client({
        templateId,
        referenceId: DEMO_USER_ID, // ← THE GOLDEN THREAD: links Persona → our webhook → PostgreSQL
        environment: "sandbox", // TODO: Switch to "production" for live
        onReady: () => {
          console.log("[AurumShield] Persona Inquiry flow is ready");
          client.open();
        },
        onComplete: ({ inquiryId, status }: { inquiryId: string; status: string }) => {
          console.log(
            `[AurumShield] Persona Inquiry completed: inquiryId=${inquiryId} status=${status}`,
          );
          if (!mountedRef.current) return;

          // Transition to "processing" — our webhook will handle the
          // actual database mutation in the background
          setVerificationState("processing");

          // After a brief delay, show the verified state.
          // The webhook will have already fired by the time the user
          // sees this, but we show the local success state optimistically.
          setTimeout(() => {
            if (!mountedRef.current) return;
            setVerificationState("verified");
            setValue("livenessCompleted", true as unknown as true, {
              shouldValidate: true,
            });
          }, 2500);
        },
        onCancel: ({ inquiryId }: { inquiryId?: string }) => {
          console.log(
            `[AurumShield] Persona Inquiry cancelled: inquiryId=${inquiryId ?? "N/A"}`,
          );
          if (!mountedRef.current) return;
          setVerificationState("idle");
        },
        onError: (error: unknown) => {
          console.error("[AurumShield] Persona Inquiry error:", error);
          if (!mountedRef.current) return;
          setVerificationState("idle");
        },
      });

      personaClientRef.current = client;
    } catch (err) {
      console.error("[AurumShield] Failed to initialize Persona SDK:", err);
      if (!mountedRef.current) return;
      setVerificationState("idle");
    }
  }, [templateId, setValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (personaClientRef.current) {
        try {
          personaClientRef.current.destroy();
        } catch {
          // Already destroyed
        }
      }
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <ScanFace className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Identity Verification
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Complete a secure identity verification powered by Persona. This
        includes document verification and a biometric liveness check to
        satisfy regulatory requirements.
      </p>

      {/* Verification viewport */}
      <div className="flex flex-col items-center">
        <div
          className={`
            relative flex items-center justify-center
            w-56 h-56 rounded-2xl overflow-hidden
            bg-color-1 border-2
            transition-all duration-500
            ${
              verificationState === "verified"
                ? "border-[#3fae7a]/50"
                : verificationState === "processing"
                  ? "border-color-2/40"
                  : verificationState === "verifying"
                    ? "border-color-2/50 animate-pulse-ring"
                    : "border-color-5/30"
            }
          `}
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(208,168,92,0.3) 0%, transparent 70%)",
            }}
          />

          {/* IDLE state */}
          {verificationState === "idle" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-color-2/10">
                <ExternalLink className="h-6 w-6 text-color-2/60" />
              </div>
              <p className="text-[11px] text-color-3/40 text-center px-4">
                Launch the secure identity verification flow
              </p>
            </div>
          )}

          {/* VERIFYING state — Persona overlay is active */}
          {verificationState === "verifying" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Loader2 className="h-8 w-8 text-color-2 animate-spin" />
              <p className="text-[11px] text-color-2 font-medium text-center">
                Verification in progress…
              </p>
              <p className="text-[10px] text-color-3/30 text-center px-6">
                Complete the steps in the Persona overlay
              </p>
            </div>
          )}

          {/* PROCESSING state — webhook being processed */}
          {verificationState === "processing" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Loader2 className="h-8 w-8 text-color-2 animate-spin" />
              <p className="text-[11px] text-color-2 font-medium text-center">
                Processing results…
              </p>
              <p className="text-[10px] text-color-3/30 text-center px-6">
                Finalizing your identity verification
              </p>
            </div>
          )}

          {/* VERIFIED state */}
          {verificationState === "verified" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3fae7a]/15">
                <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
              </div>
              <p className="text-sm font-semibold text-[#3fae7a]">
                Identity Verified
              </p>
            </div>
          )}

          {/* Corner markers */}
          <div className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 border-color-2/40 rounded-tl" />
          <div className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 border-color-2/40 rounded-tr" />
          <div className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-color-2/40 rounded-bl" />
          <div className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-color-2/40 rounded-br" />
        </div>

        {/* Launch button (idle state only) */}
        {verificationState === "idle" && (
          <button
            type="button"
            onClick={launchPersonaFlow}
            className="
              mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5
              bg-color-2/15 text-color-2 text-sm font-medium
              border border-color-2/25
              hover:bg-color-2/25 active:bg-color-2/30
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50
            "
          >
            <ScanFace className="h-4 w-4" />
            Begin Verification
          </button>
        )}

        {/* Verified confirmation text */}
        {verificationState === "verified" && (
          <p className="mt-4 text-xs text-color-3/50 text-center">
            Identity verification complete. You may proceed to finalize your
            onboarding.
          </p>
        )}
      </div>

      {/* Error */}
      {errors.livenessCompleted &&
        verificationState !== "verifying" &&
        verificationState !== "processing" && (
          <p className="text-[11px] text-color-4 text-center">
            {errors.livenessCompleted.message as string}
          </p>
        )}

      {/* Trust notice */}
      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>Powered by Persona · Biometric data never stored on AurumShield servers</span>
      </div>
    </div>
  );
}
