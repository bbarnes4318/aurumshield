"use client";

/* ================================================================
   STEP 3: UBO Declaration (Dynamic Field Array)
   ================================================================
   Collects Ultimate Beneficial Owner (UBO) information via a
   dynamic field array. Users can add multiple UBOs with Name and
   Ownership Percentage (≥25%).

   No document upload — file dropzone removed per directive.
   AML screening has moved to its own dedicated auto-run step.
   ================================================================ */

import { useFormContext, useFieldArray } from "react-hook-form";
import {
  Users,
  Plus,
  Trash2,
  Info,
  ShieldCheck,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepUBODocuments() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ubos",
  });

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          UBO Declaration
        </h2>
      </div>

      {/* Regulatory microcopy */}
      <div className="flex items-start gap-2.5 rounded-lg border border-color-2/15 bg-color-2/5 px-3.5 py-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-color-2/70" />
        <p className="text-[11px] leading-relaxed text-color-3/60">
          <strong className="text-color-3/80">
            Know-Your-Business (KYB) Verification
          </strong>{" "}
          Regulatory requirement under EU AMLD / BSA AML. AurumShield verifies
          all entities and Ultimate Beneficial Owners (UBOs) with 25%+
          ownership. Global screening runs against 5 global watchlists in
          real time.
        </p>
      </div>

      {/* ── Dynamic UBO rows ── */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60">
          Ultimate Beneficial Owners (25%+ Ownership)
          <span className="text-color-4 ml-0.5">*</span>
        </label>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border border-color-5/20 bg-color-1/50 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-color-3/40">
                UBO #{index + 1}
              </span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex items-center gap-1 text-[10px] text-color-4/60 hover:text-color-4 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* UBO Name */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`ubos.${index}.name`}
                  className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60"
                >
                  Full Legal Name
                </label>
                <input
                  id={`ubos.${index}.name`}
                  type="text"
                  placeholder="e.g. John W. Doe"
                  {...register(`ubos.${index}.name`)}
                  className={`
                    w-full rounded-lg border px-3.5 py-2.5
                    bg-color-1/80 text-sm text-color-3
                    placeholder:text-color-5/30
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
                    ${errors.ubos?.[index]?.name ? "border-color-4/60" : "border-color-5/30"}
                  `}
                />
                {errors.ubos?.[index]?.name && (
                  <p className="text-[11px] text-color-4">
                    {errors.ubos[index].name?.message}
                  </p>
                )}
              </div>

              {/* Ownership Percentage */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`ubos.${index}.ownershipPercentage`}
                  className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60"
                >
                  Ownership %
                </label>
                <input
                  id={`ubos.${index}.ownershipPercentage`}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 51"
                  {...register(`ubos.${index}.ownershipPercentage`)}
                  className={`
                    w-full rounded-lg border px-3.5 py-2.5
                    bg-color-1/80 text-sm text-color-3 font-mono
                    placeholder:text-color-5/30
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-color-2/40 focus:border-color-2/50
                    ${errors.ubos?.[index]?.ownershipPercentage ? "border-color-4/60" : "border-color-5/30"}
                  `}
                />
                {errors.ubos?.[index]?.ownershipPercentage && (
                  <p className="text-[11px] text-color-4">
                    {errors.ubos[index].ownershipPercentage?.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Array-level errors */}
        {errors.ubos && !Array.isArray(errors.ubos) && (
          <p className="text-[11px] text-color-4">
            {(errors.ubos as { message?: string }).message}
          </p>
        )}

        {/* + Add Another UBO button */}
        <button
          type="button"
          onClick={() => append({ name: "", ownershipPercentage: "" })}
          className="
            w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
            bg-color-2/8 text-color-2 text-xs font-medium
            border border-dashed border-color-2/25
            hover:bg-color-2/15 hover:border-color-2/40
            transition-colors duration-150
          "
        >
          <Plus className="h-3.5 w-3.5" />
          Add Another UBO
        </button>
      </div>

      {/* Declaration checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          {...register("uboDeclarationAccepted")}
          className="
            mt-0.5 h-4 w-4 rounded border-color-5/40
            bg-color-1/80 text-color-2
            focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
            accent-gold
          "
        />
        <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
          I confirm this declaration accurately represents the beneficial
          ownership structure and all UBOs with 25%+ ownership are disclosed.
        </span>
      </label>

      {errors.uboDeclarationAccepted && (
        <p className="text-[11px] text-color-4 -mt-3">
          {errors.uboDeclarationAccepted.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>EU AMLD · BSA AML · AES-256 at rest</span>
      </div>
    </div>
  );
}
