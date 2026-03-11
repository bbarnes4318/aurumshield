"use client";

/* ================================================================
   OFFTAKER COMPLIANCE INTAKE DOSSIER
   ================================================================
   Step 1 of 3 in the Offtaker onboarding flow. Collects entity
   identification, jurisdiction, UBO disclosure, and source-of-funds
   declaration before biometric (Veriff) identity verification.
   ================================================================ */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  Building2,
} from "lucide-react";
import {
  intakeDossierSchema,
  type IntakeDossierData,
} from "@/lib/schemas/intake-schema";
import { JURISDICTION_OPTIONS } from "@/lib/schemas/onboarding-schema";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

export default function IntakeDossierPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntakeDossierData>({
    resolver: zodResolver(intakeDossierSchema),
    defaultValues: {
      legalEntityName: "",
      legalEntityIdentifier: "",
      jurisdictionOfIncorporation: "",
      registrationDate: "",
      ultimateBeneficialOwners: "",
      sourceOfFundsDeclaration: "",
    },
  });

  const onSubmit = (data: IntakeDossierData) => {
    // TODO: Submit intake dossier to API / persist to session
    console.log("[IntakeDossier] Submitting:", data);
    router.push("/offtaker/onboarding/kyb");
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 md:py-16 pb-14">
      <div className="max-w-4xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <FileText className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Step 1 of 3: Dossier Assembly
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Offtaker Entity Onboarding
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Complete the compliance intake dossier for your legal entity. All
            fields are required prior to biometric identity verification.
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── 2-Column Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Field 1: Legal Entity Name */}
            <div>
              <label
                htmlFor="legalEntityName"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Legal Entity Name
              </label>
              <input
                id="legalEntityName"
                type="text"
                {...register("legalEntityName")}
                placeholder="Aureus Capital Partners Ltd."
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
              />
              {errors.legalEntityName && (
                <FieldError message={errors.legalEntityName.message} />
              )}
            </div>

            {/* Field 2: Legal Entity Identifier (LEI) */}
            <div>
              <label
                htmlFor="legalEntityIdentifier"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Legal Entity Identifier (LEI)
              </label>
              <input
                id="legalEntityIdentifier"
                type="text"
                {...register("legalEntityIdentifier")}
                placeholder="5493001KJTIIGC8Y1R12"
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors uppercase"
              />
              {errors.legalEntityIdentifier && (
                <FieldError message={errors.legalEntityIdentifier.message} />
              )}
            </div>

            {/* Field 3: Jurisdiction of Incorporation */}
            <div>
              <label
                htmlFor="jurisdictionOfIncorporation"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Jurisdiction of Incorporation
              </label>
              <select
                id="jurisdictionOfIncorporation"
                {...register("jurisdictionOfIncorporation")}
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="text-slate-600">
                  Select jurisdiction...
                </option>
                {JURISDICTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.jurisdictionOfIncorporation && (
                <FieldError
                  message={errors.jurisdictionOfIncorporation.message}
                />
              )}
            </div>

            {/* Field 4: Registration Date */}
            <div>
              <label
                htmlFor="registrationDate"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Registration Date
              </label>
              <input
                id="registrationDate"
                type="date"
                {...register("registrationDate")}
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
              />
              {errors.registrationDate && (
                <FieldError message={errors.registrationDate.message} />
              )}
            </div>
          </div>

          {/* ── Full-Width Sections ── */}
          <div className="space-y-6 mb-10">
            {/* Field 5: Ultimate Beneficial Owners */}
            <div>
              <label
                htmlFor="ultimateBeneficialOwners"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Ultimate Beneficial Owners (UBOs)
              </label>
              <p className="text-slate-600 text-xs mb-3 leading-relaxed">
                List all individuals holding &gt;25% voting rights. Include full
                legal names, nationalities, and percentage ownership.
              </p>
              <textarea
                id="ultimateBeneficialOwners"
                {...register("ultimateBeneficialOwners")}
                rows={4}
                placeholder="e.g. John A. Smith — British National — 40% voting rights&#10;     Jane B. Doe — US National — 35% voting rights"
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors resize-y"
              />
              {errors.ultimateBeneficialOwners && (
                <FieldError message={errors.ultimateBeneficialOwners.message} />
              )}
            </div>

            {/* Field 6: Source of Funds Declaration */}
            <div>
              <label
                htmlFor="sourceOfFundsDeclaration"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Source of Funds Declaration
              </label>
              <p className="text-slate-600 text-xs mb-3 leading-relaxed">
                Brief narrative explaining the origin of capital to be deployed
                through the AurumShield settlement engine.
              </p>
              <textarea
                id="sourceOfFundsDeclaration"
                {...register("sourceOfFundsDeclaration")}
                rows={4}
                placeholder="e.g. Funds originate from the operating revenue of Aureus Capital Partners Ltd., a UK-registered precious metals trading firm. Capital is held in segregated accounts at..."
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors resize-y"
              />
              {errors.sourceOfFundsDeclaration && (
                <FieldError
                  message={errors.sourceOfFundsDeclaration.message}
                />
              )}
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="border-t border-slate-800 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="h-4 w-4" />
              <span className="font-mono text-[10px] tracking-widest uppercase">
                Offtaker Dossier — Step 1 of 3
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gold-primary text-slate-950 font-bold text-sm tracking-wide px-6 py-3 rounded-sm hover:bg-gold-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save & Proceed to Identity Verification"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
              EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
            </span>
          </div>
        </form>

        {/* ── Footer trust line ── */}
        <p className="mt-10 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · All submissions encrypted in transit & at rest ·
          GLEIF · Veriff KYB
        </p>

        <TelemetryFooter />
      </div>
    </div>
  );
}

/* ── Inline Error Component ── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
      <p className="font-mono text-xs text-red-400">{message}</p>
    </div>
  );
}
