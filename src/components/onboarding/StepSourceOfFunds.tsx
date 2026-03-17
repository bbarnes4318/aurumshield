"use client";

/* ================================================================
   STEP 5: Institutional Source of Funds Declaration
   ================================================================
   Mandatory financial crime safeguard. Forces the user to:
     1. Select the origin of capital (enum)
     2. Attest under penalty of perjury to AML compliance

   No document upload — vendors handle evidence collection.
   ================================================================ */

import { useFormContext } from "react-hook-form";
import {
  Landmark,
  ShieldAlert,
  ShieldCheck,
  Scale,
} from "lucide-react";

import {
  SOURCE_OF_FUNDS_TYPES,
  type OnboardingFormData,
} from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepSourceOfFunds() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const sofType = watch("sourceOfFundsType");

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Institutional Source of Funds Declaration
        </h2>
      </div>

      {/* Regulatory preamble */}
      <div className="flex items-start gap-2.5 rounded-lg border border-color-2/15 bg-color-2/5 px-3.5 py-3">
        <Scale className="h-4 w-4 mt-0.5 shrink-0 text-color-2/70" />
        <p className="text-[11px] leading-relaxed text-color-3/60">
          <strong className="text-color-3/80">
            Regulatory Requirement — FATF Recommendation 10 / EU AMLD Art. 13
          </strong>{" "}
          All institutional counterparties must declare the origin of capital
          prior to settlement enablement. Documentary evidence is collected
          separately by our compliance vendors and archived in the immutable
          compliance ledger for a minimum of 7 years per BSA/AML retention
          mandates.
        </p>
      </div>

      {/* ── SoF Type Dropdown ── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sourceOfFundsType"
          className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60"
        >
          Origin of Capital
          <span className="text-color-4 ml-0.5">*</span>
        </label>
        <select
          id="sourceOfFundsType"
          {...register("sourceOfFundsType")}
          className={`
            w-full rounded-lg border px-3.5 py-2.5
            bg-color-1/80 text-sm text-color-3
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
            ${errors.sourceOfFundsType ? "border-color-4/60" : "border-color-5/30"}
          `}
        >
          <option value="" className="text-color-3/30">
            Select origin of capital…
          </option>
          {SOURCE_OF_FUNDS_TYPES.map((sof) => (
            <option key={sof.value} value={sof.value}>
              {sof.label}
            </option>
          ))}
        </select>
        {errors.sourceOfFundsType && (
          <p className="text-[11px] text-color-4 mt-0.5">
            {errors.sourceOfFundsType.message as string}
          </p>
        )}
      </div>

      {/* ── Selected SoF indicator ── */}
      {sofType && (
        <div className="rounded-lg border border-color-2/20 bg-color-2/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-color-2" />
            <span className="text-xs font-semibold text-color-2">
              {SOURCE_OF_FUNDS_TYPES.find((s) => s.value === sofType)?.label}
            </span>
          </div>
          <p className="text-[10px] text-color-3/40 mt-1">
            Documentary evidence will be collected separately by our compliance
            vendors.
          </p>
        </div>
      )}

      {/* ── AML Attestation Toggle ── */}
      <div className="rounded-lg border border-color-4/15 bg-color-4/3 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-color-4/70" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-color-4/80">
            Mandatory Legal Declaration
          </span>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            {...register("sourceOfFundsAttested")}
            className="
              mt-0.5 h-4 w-4 rounded border-color-5/40
              bg-color-1/80 text-color-2
              focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
              accent-gold
            "
          />
          <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
            I declare under penalty of perjury and international AML statutes
            (including but not limited to the Bank Secrecy Act, EU Anti-Money
            Laundering Directives, and FATF Recommendations) that the funds
            identified herein do not originate from sanctioned, illicit, or
            conflict-related activities. I understand that false declarations
            constitute a criminal offense under applicable law.
          </span>
        </label>

        {errors.sourceOfFundsAttested && (
          <p className="text-[11px] text-color-4 mt-2">
            {errors.sourceOfFundsAttested.message as string}
          </p>
        )}
      </div>

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>
          FATF R.10 compliant · Evidence immutably archived · 7-year BSA/AML
          retention
        </span>
      </div>
    </div>
  );
}
