"use client";

/* ================================================================
   STEP 1: Corporate Identity & Contact Details
   ================================================================
   Captures basic institutional information for KYC/KYB verification.
   Uses useFormContext to access the shared form state from the wizard.
   ================================================================ */

import { useFormContext } from "react-hook-form";
import { Building2, ShieldCheck } from "lucide-react";

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
   Step Component
   ---------------------------------------------------------------- */

export function StepCorporateIdentity() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Corporate Identity
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Provide your organization&apos;s legal identity and primary contact for
        verification correspondence.
      </p>

      {/* Company Name */}
      <FormField
        label="Legal Entity Name"
        name="companyName"
        placeholder="e.g. Meridian Capital Holdings Ltd."
        required
      />

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
        <span>256-bit encrypted · SOC 2 compliant · Data never resold</span>
      </div>
    </div>
  );
}
