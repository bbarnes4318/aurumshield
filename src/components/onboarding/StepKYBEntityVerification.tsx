"use client";

/* ================================================================
   STEP 7: KYB Entity Verification
   ================================================================
   Business entity verification step for institutional (company)
   onboarding. Integrates with Veriff KYB provider for:
     1. Corporate registry verification
     2. UBO (Ultimate Beneficial Owner) officer checks
     3. Entity-level AML/sanctions screening

   This step triggers parallel sub-checks via the KYB provider.
   Users can track the status of each sub-check in real-time.

   Only shown for entity_type === "company" tracks.
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  Building2,
  Users,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ── KYB Sub-Check Types ── */

interface KybSubCheck {
  id: string;
  label: string;
  description: string;
  icon: typeof Building2;
  status: "pending" | "processing" | "passed" | "failed";
}

const INITIAL_CHECKS: KybSubCheck[] = [
  {
    id: "corp_registry",
    label: "Corporate Registry",
    description: "Verifying business registration against national registry",
    icon: Building2,
    status: "pending",
  },
  {
    id: "ubo_officers",
    label: "UBO & Officers",
    description: "Identifying and screening beneficial owners and directors",
    icon: Users,
    status: "pending",
  },
  {
    id: "entity_aml",
    label: "Entity AML Screening",
    description: "Sanctions, PEP, and adverse media screening at entity level",
    icon: ShieldAlert,
    status: "pending",
  },
];

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepKYBEntityVerification() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [checks, setChecks] = useState<KybSubCheck[]>(() => {
    if (watch("kybVerificationPassed")) {
      return INITIAL_CHECKS.map((c) => ({ ...c, status: "passed" as const }));
    }
    return INITIAL_CHECKS.map((c) => ({ ...c }));
  });

  const [overallState, setOverallState] = useState<
    "idle" | "running" | "complete" | "failed"
  >(() => (watch("kybVerificationPassed") ? "complete" : "idle"));

  /* ── Simulate parallel KYB checks ── */
  const handleStartVerification = useCallback(() => {
    setOverallState("running");

    // Reset all checks to processing
    setChecks((prev) =>
      prev.map((c) => ({ ...c, status: "processing" as const })),
    );

    // Simulate staggered completion of sub-checks
    const delays = [2000, 3500, 5000];

    INITIAL_CHECKS.forEach((check, index) => {
      setTimeout(() => {
        setChecks((prev) =>
          prev.map((c) =>
            c.id === check.id ? { ...c, status: "passed" as const } : c,
          ),
        );

        // If this is the last check, mark overall as complete
        if (index === INITIAL_CHECKS.length - 1) {
          setTimeout(() => {
            setOverallState("complete");
            setValue("kybVerificationPassed", true as unknown as true, {
              shouldValidate: true,
            });
          }, 500);
        }
      }, delays[index]);
    });
  }, [setValue]);

  /* ── Track completion ── */
  const passedCount = checks.filter((c) => c.status === "passed").length;
  const processingCount = checks.filter(
    (c) => c.status === "processing",
  ).length;

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Entity Verification
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Veriff KYB verifies your business entity through parallel sub-checks
        against corporate registries, beneficial ownership databases, and
        global sanctions lists.
      </p>

      {/* ── Sub-check cards ── */}
      <div className="space-y-2.5">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div
              key={check.id}
              className={`
                rounded-lg border p-4 transition-all duration-300
                ${
                  check.status === "passed"
                    ? "border-[#3fae7a]/30 bg-[#3fae7a]/3"
                    : check.status === "processing"
                      ? "border-color-2/30 bg-color-2/3"
                      : check.status === "failed"
                        ? "border-color-4/30 bg-color-4/3"
                        : "border-color-5/20 bg-color-1/50"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      flex h-8 w-8 items-center justify-center rounded-lg
                      ${
                        check.status === "passed"
                          ? "bg-[#3fae7a]/10"
                          : check.status === "processing"
                            ? "bg-color-2/10"
                            : check.status === "failed"
                              ? "bg-color-4/10"
                              : "bg-color-5/10"
                      }
                    `}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        check.status === "passed"
                          ? "text-[#3fae7a]"
                          : check.status === "processing"
                            ? "text-color-2"
                            : check.status === "failed"
                              ? "text-color-4"
                              : "text-color-5"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        check.status === "passed"
                          ? "text-[#3fae7a]"
                          : check.status === "processing"
                            ? "text-color-2"
                            : "text-color-3/70"
                      }`}
                    >
                      {check.label}
                    </p>
                    <p className="text-[10px] text-color-3/40 mt-0.5">
                      {check.description}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center">
                  {check.status === "passed" && (
                    <CheckCircle2 className="h-5 w-5 text-[#3fae7a]" />
                  )}
                  {check.status === "processing" && (
                    <Loader2 className="h-5 w-5 text-color-2 animate-spin" />
                  )}
                  {check.status === "failed" && (
                    <AlertTriangle className="h-5 w-5 text-color-4" />
                  )}
                  {check.status === "pending" && (
                    <Clock className="h-5 w-5 text-color-5/40" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Progress summary ── */}
      {overallState === "running" && (
        <div className="flex items-center gap-2 text-[11px] text-color-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            {passedCount}/{INITIAL_CHECKS.length} checks complete
            {processingCount > 0 && ` · ${processingCount} in progress`}
          </span>
        </div>
      )}

      {/* ── Start button ── */}
      {overallState === "idle" && (
        <button
          type="button"
          onClick={handleStartVerification}
          className="
            w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3
            bg-color-2/15 text-color-2 text-sm font-medium
            border border-color-2/25
            hover:bg-color-2/25 active:bg-color-2/30
            transition-colors duration-150
          "
        >
          <ShieldAlert className="h-4 w-4" />
          Initiate Entity Verification
        </button>
      )}

      {/* ── Complete state ── */}
      {overallState === "complete" && (
        <div className="flex items-center gap-2 text-[11px] text-[#3fae7a] font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>
            All entity checks passed — your business is verified
          </span>
        </div>
      )}

      {errors.kybVerificationPassed && overallState !== "running" && (
        <p className="text-[11px] text-color-4">
          {errors.kybVerificationPassed.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>Veriff KYB · OpenSanctions AML · Parallel Processing</span>
      </div>
    </div>
  );
}
