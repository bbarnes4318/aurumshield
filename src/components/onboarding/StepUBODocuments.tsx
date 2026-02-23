"use client";

/* ================================================================
   STEP 2: UBO Document Upload
   ================================================================
   Upload zone for Ultimate Beneficial Owner documentation with
   clear regulatory microcopy explaining why the data is needed.
   ================================================================ */

import { useState, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  Upload,
  FileCheck2,
  X,
  Info,
  ShieldCheck,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepUBODocuments() {
  const {
    setValue,
    watch,
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentName = watch("uboDocumentName");

  /* ── File handling ── */

  const handleFile = useCallback(
    (file: File) => {
      // TODO: Upload to S3 via pre-signed URL
      // For now, store the filename as proof of selection
      setValue("uboDocumentName", file.name, { shouldValidate: true });
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
    setValue("uboDocumentName", "", { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [setValue]);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <FileCheck2 className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          UBO Documentation
        </h2>
      </div>

      {/* Regulatory microcopy */}
      <div className="flex items-start gap-2.5 rounded-lg border border-color-2/15 bg-color-2/5 px-3.5 py-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-color-2/70" />
        <p className="text-[11px] leading-relaxed text-color-3/60">
          <strong className="text-color-3/80">
            Why do we need this?
          </strong>{" "}
          Regulatory requirement under EU AMLD / BSA AML. AurumShield must
          verify all individuals with 25%+ ownership to prevent financial
          crime. Your documents are encrypted at rest and only accessible
          to authorized compliance officers.
        </p>
      </div>

      {/* Upload zone */}
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
          rounded-lg border-2 border-dashed py-10 px-6
          cursor-pointer transition-all duration-200
          ${
            isDragOver
              ? "border-color-2/60 bg-color-2/8"
              : documentName
                ? "border-color-2/30 bg-color-2/5"
                : "border-color-5/30 bg-color-1/50 hover:border-color-5/50 hover:bg-color-1/70"
          }
          ${errors.uboDocumentName ? "border-color-4/50" : ""}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload UBO document"
        />

        {documentName ? (
          /* ── File selected state ── */
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-color-2/15">
              <FileCheck2 className="h-5 w-5 text-color-2" />
            </div>
            <p className="text-sm font-medium text-color-3">{documentName}</p>
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
          /* ── Empty upload state ── */
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-color-5/10">
              <Upload className="h-5 w-5 text-color-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-color-3/80">
                Drop your UBO document here
              </p>
              <p className="text-[11px] text-color-3/40 mt-0.5">
                PDF, JPG, or PNG · Max 10 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {errors.uboDocumentName && (
        <p className="text-[11px] text-color-4 -mt-3">
          {errors.uboDocumentName.message as string}
        </p>
      )}

      {/* Declaration checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          {...register("uboDeclarationAccepted")}
          className="
            mt-0.5 h-4 w-4 rounded border-color-5/40
            bg-color-1/80 text-color-2
            focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
            accent-[#D0A85C]
          "
        />
        <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
          I confirm this document accurately represents the beneficial
          ownership structure of my organization and that all individuals with
          25% or greater ownership are disclosed.
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
        <span>AES-256 encryption at rest · Access restricted to compliance team</span>
      </div>
    </div>
  );
}
