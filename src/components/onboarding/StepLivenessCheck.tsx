"use client";

/* ================================================================
   STEP 3: Biometric Liveness Check
   ================================================================
   Mock biometric verification UI with scanning animation.
   Simulates a 3-second biometric scan before marking verified.
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  Camera,
  CheckCircle2,
  ScanFace,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Scan States
   ---------------------------------------------------------------- */

type ScanState = "idle" | "scanning" | "verified";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepLivenessCheck() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [scanState, setScanState] = useState<ScanState>(() =>
    watch("livenessCompleted") ? "verified" : "idle",
  );

  const beginScan = useCallback(() => {
    setScanState("scanning");

    // Simulate 3-second biometric analysis
    setTimeout(() => {
      setScanState("verified");
      setValue("livenessCompleted", true as unknown as true, {
        shouldValidate: true,
      });
    }, 3000);
  }, [setValue]);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <ScanFace className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Biometric Verification
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        A quick liveness scan confirms your identity matches the documents
        provided. This prevents impersonation and satisfies regulatory
        requirements.
      </p>

      {/* Camera viewport */}
      <div className="flex flex-col items-center">
        <div
          className={`
            relative flex items-center justify-center
            w-56 h-56 rounded-2xl overflow-hidden
            bg-color-1 border-2
            transition-all duration-500
            ${
              scanState === "verified"
                ? "border-[#3fae7a]/50"
                : scanState === "scanning"
                  ? "border-color-2/50 animate-pulse-ring"
                  : "border-color-5/30"
            }
          `}
        >
          {/* Camera background pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(208,168,92,0.3) 0%, transparent 70%)",
            }}
          />

          {/* Scan line animation */}
          {scanState === "scanning" && (
            <div
              className="
                absolute left-2 right-2 h-0.5 rounded-full bg-color-2
                animate-scan-line shadow-[0_0_8px_rgba(208,168,92,0.6)]
              "
            />
          )}

          {/* Center icon */}
          {scanState === "idle" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Camera className="h-10 w-10 text-color-5/50" />
              <p className="text-[11px] text-color-3/40 text-center px-4">
                Position your face in the frame
              </p>
            </div>
          )}

          {scanState === "scanning" && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Loader2 className="h-8 w-8 text-color-2 animate-spin" />
              <p className="text-[11px] text-color-2 font-medium text-center">
                Analyzing biometric data…
              </p>
            </div>
          )}

          {scanState === "verified" && (
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

        {/* Scan button (only in idle state) */}
        {scanState === "idle" && (
          <button
            type="button"
            onClick={beginScan}
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
            Begin Scan
          </button>
        )}

        {/* Verification confirmed text */}
        {scanState === "verified" && (
          <p className="mt-4 text-xs text-color-3/50 text-center">
            Biometric analysis complete. You may proceed to finalize your
            verification.
          </p>
        )}
      </div>

      {/* Error */}
      {errors.livenessCompleted && scanState !== "scanning" && (
        <p className="text-[11px] text-color-4 text-center">
          {errors.livenessCompleted.message as string}
        </p>
      )}

      {/* Trust notice */}
      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>Processed by SumSub · Biometric data never stored on AurumShield servers</span>
      </div>
    </div>
  );
}
