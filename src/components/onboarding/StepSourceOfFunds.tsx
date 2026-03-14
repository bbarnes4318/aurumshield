"use client";

/* ================================================================
   STEP 4: Institutional Source of Funds Declaration
   ================================================================
   Mandatory financial crime safeguard. Forces the user to:
     1. Select the origin of capital (enum)
     2. Upload supporting documentary evidence
     3. Attest under penalty of perjury to AML compliance

   The user CANNOT proceed to biometrics until all three conditions
   are satisfied.
   ================================================================ */

import { useState, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  Landmark,
  Upload,
  FileCheck2,
  X,
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
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentUrl = watch("sourceOfFundsDocumentUrl");
  const sofType = watch("sourceOfFundsType");

  /* ── File handling ── */

  const handleFile = useCallback(
    (file: File) => {
      // In production this would upload to S3/R2 and return the URL.
      // For now we store the filename as the document reference.
      setValue("sourceOfFundsDocumentUrl", file.name, {
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearFile = useCallback(() => {
    setValue("sourceOfFundsDocumentUrl", "", { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [setValue]);

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
          All institutional counterparties must declare and evidence the
          origin of capital prior to settlement enablement. Documentary proof
          is archived in the immutable compliance ledger for a minimum of 7
          years per BSA/AML retention mandates.
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
            Documentary evidence required below to substantiate this declaration.
          </p>
        </div>
      )}

      {/* ── Document Upload Dropzone ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-color-3/60">
          Supporting Documentation
          <span className="text-color-4 ml-0.5">*</span>
        </label>

        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={handleBrowse}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleBrowse();
          }}
          className={`
            relative flex flex-col items-center justify-center
            rounded-lg border-2 border-dashed py-8 px-6
            cursor-pointer transition-all duration-200
            ${
              isDragOver
                ? "border-color-2/60 bg-color-2/8"
                : documentUrl
                  ? "border-color-2/30 bg-color-2/5"
                  : "border-color-5/30 bg-color-1/50 hover:border-color-5/50 hover:bg-color-1/70"
            }
            ${errors.sourceOfFundsDocumentUrl ? "border-color-4/50" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
            aria-label="Upload source of funds document"
          />

          {documentUrl ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-color-2/15">
                <FileCheck2 className="h-5 w-5 text-color-2" />
              </div>
              <p className="text-sm font-medium text-color-3">
                {documentUrl}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="
                  inline-flex items-center gap-1 text-[11px] text-color-4/70
                  hover:text-color-4 transition-colors
                "
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-color-5/10">
                <Upload className="h-5 w-5 text-color-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-color-3/80">
                  Upload Audited Financials or Bank Letter of Credit
                </p>
                <p className="text-[11px] text-color-3/40 mt-0.5">
                  PDF, XLSX, JPG, or PNG · Max 25 MB
                </p>
              </div>
            </div>
          )}
        </div>

        {errors.sourceOfFundsDocumentUrl && (
          <p className="text-[11px] text-color-4 mt-0.5">
            {errors.sourceOfFundsDocumentUrl.message as string}
          </p>
        )}
      </div>

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
