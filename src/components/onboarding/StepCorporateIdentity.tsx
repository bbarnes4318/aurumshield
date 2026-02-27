"use client";

/* ================================================================
   STEP 1: Entity Registration & LEI Verification
   ================================================================
   Captures institutional identity with mandatory LEI (Legal Entity
   Identifier) verified against the GLEIF API. In demo mode, the
   GLEIF lookup is simulated with a 2-second animation.
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  Building2,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import {
  JURISDICTION_OPTIONS,
  type OnboardingFormData,
} from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Reusable Form Field
   ---------------------------------------------------------------- */

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  children,
}: {
  label: string;
  name: keyof OnboardingFormData;
  type?: string;
  placeholder?: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const error = errors[name];

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60"
      >
        {label}
        {required && <span className="text-color-4 ml-0.5">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          {...register(name)}
          className={`
            w-full rounded-lg border px-3.5 py-2.5
            bg-color-1/80 text-sm text-color-3
            placeholder:text-color-3/25
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
            ${error ? "border-color-4/60" : "border-color-5/30"}
          `}
        />
      )}

      {error && (
        <p className="text-[11px] text-color-4 mt-0.5">
          {error.message as string}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Mock GLEIF Response Card
   ---------------------------------------------------------------- */

function GleifResultCard({ companyName }: { companyName: string }) {
  return (
    <div className="rounded-lg border border-[#3fae7a]/30 bg-[#3fae7a]/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[#3fae7a]" />
        <span className="text-xs font-semibold text-[#3fae7a]">
          GLEIF Verification Passed
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div>
          <span className="text-color-3/40">Entity Name</span>
          <p className="text-color-3 font-medium">
            {companyName || "Meridian Capital Holdings Ltd."}
          </p>
        </div>
        <div>
          <span className="text-color-3/40">LEI Status</span>
          <p className="text-[#3fae7a] font-semibold">ACTIVE</p>
        </div>
        <div>
          <span className="text-color-3/40">Registration Date</span>
          <p className="text-color-3 font-medium">2024-03-15</p>
        </div>
        <div>
          <span className="text-color-3/40">Next Renewal</span>
          <p className="text-color-3 font-medium">2026-03-15</p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepCorporateIdentity() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [gleifState, setGleifState] = useState<
    "idle" | "verifying" | "verified"
  >(() => (watch("leiVerified") ? "verified" : "idle"));

  const leiValue = watch("leiNumber");
  const companyName = watch("companyName");

  /* ── Simulated GLEIF Lookup ── */
  const handleGleifVerify = useCallback(() => {
    if (!leiValue || leiValue.length !== 20) return;
    setGleifState("verifying");
    setTimeout(() => {
      setGleifState("verified");
      setValue("leiVerified", true as unknown as true, {
        shouldValidate: true,
      });
    }, 2000);
  }, [leiValue, setValue]);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Entity Registration & LEI
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Register your organization with a mandatory Legal Entity Identifier
        (LEI), verified against the Global LEI Foundation (GLEIF) API.
      </p>

      {/* Company Name */}
      <FormField
        label="Legal Entity Name"
        name="companyName"
        placeholder="e.g. Meridian Capital Holdings Ltd."
        required
      />

      {/* LEI Number + Verify Button */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60">
          Legal Entity Identifier (LEI)
          <span className="text-color-4 ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="leiNumber"
            type="text"
            placeholder="5493001KJTIIGC8Y1R12"
            maxLength={20}
            {...register("leiNumber")}
            className={`
              flex-1 rounded-lg border px-3.5 py-2.5
              bg-color-1/80 text-sm text-color-3 font-mono tracking-wider
              placeholder:text-color-3/25
              transition-all duration-150 uppercase
              focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
              ${errors.leiNumber ? "border-color-4/60" : "border-color-5/30"}
            `}
          />
          <button
            type="button"
            onClick={handleGleifVerify}
            disabled={gleifState === "verifying" || gleifState === "verified" || !leiValue || leiValue.length !== 20}
            className="
              inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5
              bg-color-2/15 text-color-2 text-xs font-medium
              border border-color-2/25
              hover:bg-color-2/25 active:bg-color-2/30
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
        {errors.leiNumber && (
          <p className="text-[11px] text-color-4 mt-0.5">
            {errors.leiNumber.message as string}
          </p>
        )}
        {errors.leiVerified && gleifState !== "verifying" && (
          <p className="text-[11px] text-color-4 mt-0.5">
            {errors.leiVerified.message as string}
          </p>
        )}
      </div>

      {/* GLEIF Result Card */}
      {gleifState === "verified" && (
        <GleifResultCard companyName={companyName} />
      )}

      {/* Registration Number + Jurisdiction row */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Registration Number"
          name="registrationNumber"
          placeholder="e.g. 12345678"
        />

        <FormField label="Jurisdiction" name="jurisdiction" required>
          <select
            id="jurisdiction"
            {...register("jurisdiction")}
            className={`
              w-full rounded-lg border px-3.5 py-2.5
              bg-color-1/80 text-sm text-color-3
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
              ${errors.jurisdiction ? "border-color-4/60" : "border-color-5/30"}
            `}
          >
            <option value="" className="text-color-3/30">
              Select jurisdiction…
            </option>
            {JURISDICTION_OPTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Contact Email */}
      <FormField
        label="Authorized Contact Email"
        name="contactEmail"
        type="email"
        placeholder="compliance@meridian.com"
        required
      />

      {/* Contact Phone */}
      <FormField
        label="Contact Phone"
        name="contactPhone"
        type="tel"
        placeholder="+14155551234"
        required
      />

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-2 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>256-bit encrypted · GLEIF API verified · Data never resold</span>
      </div>
    </div>
  );
}
