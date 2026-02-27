"use client";

/* ================================================================
   STEP 3: WebAuthn & SSO Enrollment
   ================================================================
   Simulated hardware security key enrollment and Enterprise SSO
   provider configuration. SMS OTP is explicitly absent to reinforce
   that it has been removed from the platform.
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  KeyRound,
  Fingerprint,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepWebAuthnEnrollment() {
  const {
    setValue,
    watch,
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [enrollState, setEnrollState] = useState<
    "idle" | "enrolling" | "enrolled"
  >(() => (watch("webauthnEnrolled") ? "enrolled" : "idle"));

  /* ── Simulated Key Enrollment ── */
  const handleEnrollKey = useCallback(() => {
    setEnrollState("enrolling");
    setTimeout(() => {
      setEnrollState("enrolled");
      setValue("webauthnEnrolled", true as unknown as true, {
        shouldValidate: true,
      });
    }, 2500);
  }, [setValue]);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          WebAuthn & SSO Enrollment
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Register a hardware security key for passwordless authentication.
        SMS-based OTP has been permanently removed from AurumShield in favor
        of phishing-resistant WebAuthn credentials.
      </p>

      {/* ── Hardware Key Registration ── */}
      <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="h-4 w-4 text-color-2/70" />
          <h3 className="text-xs font-semibold text-color-3/70 uppercase tracking-wider">
            Hardware Security Key
          </h3>
        </div>

        {enrollState === "idle" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-color-5/30 bg-color-1">
              <KeyRound className="h-7 w-7 text-color-5/50" />
            </div>
            <div className="text-center">
              <p className="text-sm text-color-3/70 font-medium">
                No security key registered
              </p>
              <p className="text-[11px] text-color-3/40 mt-0.5">
                YubiKey, Titan, or platform authenticator
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnrollKey}
              className="
                inline-flex items-center gap-2 rounded-lg px-5 py-2.5
                bg-color-2/15 text-color-2 text-sm font-medium
                border border-color-2/25
                hover:bg-color-2/25 active:bg-color-2/30
                transition-colors duration-150
              "
            >
              <Fingerprint className="h-4 w-4" />
              Register Security Key
            </button>
          </div>
        )}

        {enrollState === "enrolling" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-color-2/40 bg-color-2/5">
              <Loader2 className="h-7 w-7 text-color-2 animate-spin" />
            </div>
            <p className="text-sm text-color-2 font-medium">
              Touch your security key…
            </p>
            <p className="text-[10px] text-color-3/30">
              Waiting for biometric confirmation
            </p>
          </div>
        )}

        {enrollState === "enrolled" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#3fae7a]/30 bg-[#3fae7a]/5">
              <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
            </div>
            <div className="text-center">
              <p className="text-sm text-[#3fae7a] font-semibold">
                Security Key Enrolled
              </p>
              <p className="text-[11px] text-color-3/40 mt-1 font-mono">
                Credential ID: wA3k…Qf9x
              </p>
              <p className="text-[10px] text-color-3/30 mt-0.5">
                Algorithm: ES256 · Resident Key · User Verification Required
              </p>
            </div>
          </div>
        )}
      </div>

      {errors.webauthnEnrolled && enrollState !== "enrolling" && (
        <p className="text-[11px] text-color-4">
          {errors.webauthnEnrolled.message as string}
        </p>
      )}

      {/* ── Enterprise SSO Configuration ── */}
      <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Building className="h-4 w-4 text-color-2/70" />
          <h3 className="text-xs font-semibold text-color-3/70 uppercase tracking-wider">
            Enterprise SSO (Optional)
          </h3>
        </div>

        <p className="text-[11px] text-color-3/40 leading-relaxed">
          Connect your organization&apos;s identity provider for seamless
          single sign-on via SAML 2.0 or OIDC.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "okta", label: "Okta", desc: "SAML / OIDC" },
              { value: "entra_id", label: "Entra ID", desc: "Microsoft Azure" },
              { value: "custom_saml", label: "Custom SAML", desc: "Any IdP" },
              { value: "none", label: "None", desc: "WebAuthn only" },
            ] as const
          ).map((opt) => {
            const selected = watch("ssoProvider") === opt.value;
            return (
              <label
                key={opt.value}
                className={`
                  flex flex-col items-center gap-1 rounded-lg border px-3 py-3
                  cursor-pointer transition-all duration-150
                  ${
                    selected
                      ? "border-color-2/50 bg-color-2/8"
                      : "border-color-5/20 bg-color-1/30 hover:border-color-5/40"
                  }
                `}
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register("ssoProvider")}
                  className="sr-only"
                />
                <span
                  className={`text-xs font-semibold ${selected ? "text-color-2" : "text-color-3/70"}`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-color-3/40">{opt.desc}</span>
              </label>
            );
          })}
        </div>

        {errors.ssoProvider && (
          <p className="text-[11px] text-color-4">
            {errors.ssoProvider.message as string}
          </p>
        )}
      </div>

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>FIDO2/WebAuthn · Phishing-resistant · No SMS OTP</span>
      </div>
    </div>
  );
}
