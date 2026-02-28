"use client";

/* ================================================================
   STEP 3½: TOTP Authenticator Enrollment
   ================================================================
   Enterprise MFA enrollment step. Users scan a QR code or manually
   enter a TOTP secret into their authenticator app (Google Auth,
   Authy, 1Password, etc.), then verify with a 6-digit code.

   This step is inserted between WebAuthn (Step 3) and Maker-Checker
   (Step 4) in the enterprise onboarding wizard.

   Security:
     - TOTP replaces SMS OTP (removed due to SIM-swapping risk)
     - Paired with WebAuthn for true enterprise MFA
     - Recovery codes generated for backup access
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  Smartphone,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ── Mock TOTP Secret (deterministic for demo) ── */
const MOCK_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const MOCK_RECOVERY_CODES = [
  "AURM-8K2F-9P3X", "AURM-4L7M-2J5W",
  "AURM-6R1N-8Q4Y", "AURM-3H9D-7V6B",
  "AURM-5T2G-1K8C", "AURM-9P4F-3M7X",
];

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepTOTPEnrollment() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [enrollState, setEnrollState] = useState<
    "idle" | "scanning" | "verifying" | "enrolled"
  >(() => (watch("totpEnrolled") ? "enrolled" : "idle"));

  const [verificationCode, setVerificationCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  /* ── Simulate QR shown → user enters code ── */
  const handleStartEnroll = useCallback(() => {
    setEnrollState("scanning");
    setVerifyError(null);
  }, []);

  /* ── Verify the 6-digit TOTP code ── */
  const handleVerifyCode = useCallback(() => {
    setVerifyError(null);

    // Validate format
    const cleaned = verificationCode.replace(/\s/g, "");
    if (!/^\d{6}$/.test(cleaned)) {
      setVerifyError("Enter a 6-digit code from your authenticator app");
      return;
    }

    setEnrollState("verifying");

    // Simulate verification delay
    setTimeout(() => {
      // In demo mode, accept any valid 6-digit code
      setEnrollState("enrolled");
      setValue("totpEnrolled", true as unknown as true, {
        shouldValidate: true,
      });
    }, 1500);
  }, [verificationCode, setValue]);

  /* ── Copy helpers ── */
  const copySecret = useCallback(() => {
    navigator.clipboard?.writeText(MOCK_TOTP_SECRET).catch(() => {});
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }, []);

  const copyRecoveryCodes = useCallback(() => {
    navigator.clipboard?.writeText(MOCK_RECOVERY_CODES.join("\n")).catch(() => {});
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  }, []);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Smartphone className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Authenticator App Enrollment
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Register a TOTP authenticator app as your second authentication factor.
        SMS-based OTP has been permanently removed from AurumShield in favor of
        phishing-resistant credentials.
      </p>

      {/* ── IDLE: Start enrollment ── */}
      {enrollState === "idle" && (
        <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-color-5/30 bg-color-1">
              <Smartphone className="h-7 w-7 text-color-5/50" />
            </div>
            <div className="text-center">
              <p className="text-sm text-color-3/70 font-medium">
                No authenticator app registered
              </p>
              <p className="text-[11px] text-color-3/40 mt-0.5">
                Google Authenticator, Authy, 1Password, or any TOTP app
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartEnroll}
              className="
                inline-flex items-center gap-2 rounded-lg px-5 py-2.5
                bg-color-2/15 text-color-2 text-sm font-medium
                border border-color-2/25
                hover:bg-color-2/25 active:bg-color-2/30
                transition-colors duration-150
              "
            >
              <KeyRound className="h-4 w-4" />
              Set Up Authenticator
            </button>
          </div>
        </div>
      )}

      {/* ── SCANNING: Show QR code / manual entry ── */}
      {enrollState === "scanning" && (
        <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-color-2/70" />
            <h3 className="text-xs font-semibold text-color-3/70 uppercase tracking-wider">
              Scan QR Code
            </h3>
          </div>

          {/* Simulated QR code placeholder */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-36 w-36 rounded-lg border-2 border-color-5/30 bg-color-1 flex items-center justify-center"
              title="TOTP QR Code"
            >
              <div className="grid grid-cols-8 gap-[2px] p-3">
                {/* Deterministic QR-like pattern (no Math.random in render) */}
                {[1,1,1,0,1,0,1,1, 0,1,0,1,1,1,0,0, 1,0,1,1,0,1,1,0, 1,1,0,0,1,0,0,1, 0,1,1,0,1,1,0,1, 1,0,0,1,0,1,1,0, 0,1,1,1,0,0,1,1, 1,0,1,0,1,1,0,1].map((fill, i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-2.5 rounded-[1px] ${
                      fill ? "bg-color-3/80" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Manual entry fallback */}
            <div className="w-full space-y-2">
              <p className="text-[11px] text-color-3/40 text-center">
                Or enter this secret manually:
              </p>
              <div className="flex items-center gap-2 justify-center">
                <code className="px-3 py-1.5 rounded bg-color-5/10 text-xs font-mono text-color-3/70 tracking-wider">
                  {MOCK_TOTP_SECRET}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1.5 rounded hover:bg-color-5/10 transition-colors"
                  title="Copy secret"
                >
                  {copiedSecret ? (
                    <Check className="h-3.5 w-3.5 text-[#3fae7a]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-color-3/40" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verification code input */}
          <div className="space-y-2">
            <label className="text-[11px] text-color-3/50 font-medium">
              Enter the 6-digit code from your authenticator:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="
                  flex-1 rounded-lg border border-color-5/30 bg-color-1 px-4 py-2.5
                  text-center text-lg font-mono tracking-[0.3em] text-color-3
                  placeholder:text-color-5/30
                  focus:border-color-2/50 focus:ring-1 focus:ring-color-2/30
                  outline-none transition-colors
                "
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verificationCode.length < 6}
                className="
                  rounded-lg px-4 py-2.5 bg-color-2 text-color-1 text-sm font-semibold
                  hover:bg-color-2/90 active:bg-color-2/80
                  disabled:opacity-40 disabled:pointer-events-none
                  transition-colors
                "
              >
                Verify
              </button>
            </div>
            {verifyError && (
              <p className="text-[11px] text-color-4">{verifyError}</p>
            )}
          </div>
        </div>
      )}

      {/* ── VERIFYING: Processing code ── */}
      {enrollState === "verifying" && (
        <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-color-2/40 bg-color-2/5">
              <Loader2 className="h-7 w-7 text-color-2 animate-spin" />
            </div>
            <p className="text-sm text-color-2 font-medium">
              Verifying code…
            </p>
            <p className="text-[10px] text-color-3/30">
              Validating TOTP token against enrollment secret
            </p>
          </div>
        </div>
      )}

      {/* ── ENROLLED: Success + recovery codes ── */}
      {enrollState === "enrolled" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#3fae7a]/30 bg-[#3fae7a]/5">
                <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
              </div>
              <div className="text-center">
                <p className="text-sm text-[#3fae7a] font-semibold">
                  Authenticator Enrolled
                </p>
                <p className="text-[11px] text-color-3/40 mt-1">
                  Algorithm: SHA-1 · Period: 30s · Digits: 6
                </p>
              </div>
            </div>
          </div>

          {/* Recovery codes */}
          <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-color-3/70 uppercase tracking-wider">
                Recovery Codes
              </h3>
              <button
                type="button"
                onClick={copyRecoveryCodes}
                className="inline-flex items-center gap-1 text-[10px] text-color-3/40 hover:text-color-3/60 transition-colors"
              >
                {copiedCodes ? (
                  <><Check className="h-3 w-3 text-[#3fae7a]" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy All</>
                )}
              </button>
            </div>
            <p className="text-[10px] text-color-3/40 leading-relaxed">
              Save these codes in a secure location. Each code can only be used once
              to access your account if you lose your authenticator device.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {MOCK_RECOVERY_CODES.map((code) => (
                <code
                  key={code}
                  className="px-2 py-1 rounded bg-color-5/8 text-[10px] font-mono text-color-3/60 text-center"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {errors.totpEnrolled && enrollState !== "verifying" && (
        <p className="text-[11px] text-color-4">
          {errors.totpEnrolled.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>RFC 6238 TOTP · HMAC-SHA1 · 30-second window · No SMS</span>
      </div>
    </div>
  );
}
