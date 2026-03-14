"use client";

/* ================================================================
   STEP 5: Verification Summary Dashboard
   ================================================================
   Summary step showing all completed onboarding steps with green
   checkmarks. Displays account readiness status and requires
   final acknowledgment before proceeding to security enrollment.

   NOTE: True biometric liveness is handled off-site via the
   iDenfy/Veriff redirect — this step is the on-platform summary.
   ================================================================ */

import { useFormContext } from "react-hook-form";
import {
  CheckCircle2,
  Shield,
  Building2,
  FileCheck2,
  KeyRound,
  Users,
  FileSignature,
  ShieldCheck,
  Landmark,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Completion Summary Items
   ---------------------------------------------------------------- */

const SUMMARY_ITEMS = [
  {
    icon: Building2,
    label: "Entity & LEI Verified",
    detail: "GLEIF API — deterministic entity resolution",
  },
  {
    icon: FileCheck2,
    label: "KYB Entity Verification Passed",
    detail: "Veriff KYB — corporate registry, UBO & officers, entity AML",
  },
  {
    icon: Users,
    label: "UBO & AML Screening Passed",
    detail: "OpenSanctions (OFAC, EU, UN, HMT, DFAT)",
  },
  {
    icon: Landmark,
    label: "Source of Funds Declared",
    detail: "FATF R.10 compliant — documentary evidence archived",
  },
] as const;

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepVerificationSummary() {
  const {
    watch,
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const companyName = watch("companyName");
  const sofType = watch("sourceOfFundsType");

  const sofLabel =
    sofType === "AUDITED_FINANCIALS"
      ? "Audited Financials"
      : sofType === "BANK_LETTER_OF_CREDIT"
        ? "Bank Letter of Credit"
        : sofType === "TREASURY_ALLOCATION"
          ? "Treasury Allocation"
          : "—";

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Verification Summary
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        All compliance verification steps have been completed. Review your
        account configuration below and confirm to proceed to security
        enrollment.
      </p>

      {/* ── Entity Summary Card ── */}
      <div className="rounded-lg border border-color-2/20 bg-color-2/5 px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-color-2">
          {companyName || "Your Organization"}
        </p>
        <div className="flex items-center gap-4 text-[10px] text-color-3/50">
          <span>
            Source of Funds:{" "}
            <strong className="text-color-3/80 font-semibold">
              {sofLabel}
            </strong>
          </span>
        </div>
      </div>

      {/* ── Completion Checklist ── */}
      <div className="space-y-2">
        {SUMMARY_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border border-[#3fae7a]/15 bg-[#3fae7a]/3 px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3fae7a]/10">
              <CheckCircle2 className="h-4 w-4 text-[#3fae7a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-color-3/80">
                {item.label}
              </p>
              <p className="text-[10px] text-color-3/40 truncate">
                {item.detail}
              </p>
            </div>
            <item.icon className="h-4 w-4 text-color-3/20 shrink-0" />
          </div>
        ))}
      </div>

      {/* ── Account Readiness ── */}
      <div className="rounded-lg border border-[#3fae7a]/30 bg-[#3fae7a]/5 px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-[#3fae7a]" />
          <span className="text-sm font-bold text-[#3fae7a]">
            Compliance Verification Complete
          </span>
        </div>
        <p className="text-[10px] text-color-3/40">
          All 4 compliance gates passed · Proceeding to security enrollment
        </p>
      </div>

      {/* ── Final Acknowledgment ── */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          {...register("verificationAcknowledged")}
          className="
            mt-0.5 h-4 w-4 rounded border-color-5/40
            bg-color-1/80 text-color-2
            focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
            accent-gold
          "
        />
        <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
          I confirm that all information provided during onboarding is
          accurate and complete. I understand that AurumShield operates a
          fail-closed security perimeter and that any misrepresentation may
          result in immediate account suspension and collateral forfeiture.
        </span>
      </label>

      {errors.verificationAcknowledged && (
        <p className="text-[11px] text-color-4">
          {errors.verificationAcknowledged.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>Sovereign clearing infrastructure · All verifications immutable</span>
      </div>
    </div>
  );
}
