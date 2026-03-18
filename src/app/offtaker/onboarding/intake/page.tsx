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
import { useDemoTour, DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

export default function IntakeDossierPage() {
  const router = useRouter();
  const { isDemoActive } = useDemoTour();
  const demoParam = isDemoActive ? "?demo=active" : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntakeDossierData>({
    resolver: zodResolver(intakeDossierSchema),
    defaultValues: isDemoActive
      ? {
          legalEntityName: "Aureus Capital Partners Ltd.",
          legalEntityIdentifier: "5493001KJTIIGC8Y1R12",
          jurisdictionOfIncorporation: "GB",
          registrationDate: "2019-03-15",
          ultimateBeneficialOwners:
            "James R. Whitfield — British National — 45% voting rights\nVictoria A. Chen — Singapore National — 30% voting rights\nNicholas D. Hartmann — Swiss National — 25% voting rights",
          sourceOfFundsDeclaration:
            "Capital originates from the operational treasury of Aureus Capital Partners Ltd., a UK-registered institutional precious metals trading firm (FCA Reference: 847291). Funds are held in segregated Tier-1 custody accounts at Barclays Corporate Banking (Sort Code: 20-00-00) and deployed exclusively for sovereign-grade physical gold acquisition through regulated clearing infrastructure.",
        }
      : {
          legalEntityName: "",
          legalEntityIdentifier: "",
          jurisdictionOfIncorporation: "",
          registrationDate: "",
          ultimateBeneficialOwners: "",
          sourceOfFundsDeclaration: "",
        },
  });

  const onSubmit = async (data: IntakeDossierData) => {
    // Persist to sessionStorage so KYB page can read the real data
    sessionStorage.setItem("aurumshield:intake-dossier", JSON.stringify(data));

    // Call server action to persist to database
    try {
      const { serverSubmitIntakeDossier } = await import(
        "@/lib/actions/onboarding-actions"
      );
      const result = await serverSubmitIntakeDossier(data);
      if (result.caseId) {
        sessionStorage.setItem("aurumshield:case-id", result.caseId);
      }
    } catch (err) {
      // Server action failed — data is still in sessionStorage
      console.warn("[IntakeDossier] Server persist failed, using client fallback:", err);
    }

    router.push(`/offtaker/onboarding/kyb${demoParam}`);
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="shrink-0 border-b border-slate-800 bg-black/40 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-3.5 w-3.5 text-gold-primary" />
          <span className="font-mono text-gold-primary text-[10px] tracking-[0.3em] uppercase font-bold">
            Dossier Assembly
          </span>
          <span className="font-mono text-slate-600 text-[9px] tracking-wider">
            STEP 1 OF 3
          </span>
        </div>
        <span className="font-mono text-[8px] text-slate-600 tracking-widest uppercase">
          EXECUTION IS CRYPTOGRAPHICALLY BINDING · IP LOGGED
        </span>
      </div>

      {/* ── Form Body (scrollable) ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {/* Title + Context */}
          <div className="mb-3">
            <h1 className="text-xl font-bold tracking-tight text-white mb-1">
              Offtaker Entity Onboarding
            </h1>
            <p className="text-slate-500 text-xs font-mono leading-snug max-w-2xl">
              Complete the compliance intake dossier for your legal entity.
              Required fields must be filled prior to biometric identity verification.
            </p>
          </div>

          {/* ── 2×2 Identity Grid ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
            {/* Field 1: Legal Entity Name */}
            <div>
              <label
                htmlFor="legalEntityName"
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1"
              >
                Legal Entity Name
              </label>
              <input
                id="legalEntityName"
                type="text"
                {...register("legalEntityName")}
                placeholder="Aureus Capital Partners Ltd."
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
              />
              {errors.legalEntityName && (
                <FieldError message={errors.legalEntityName.message} />
              )}
            </div>

            {/* Field 2: Legal Entity Identifier (LEI) */}
            <div>
              <label
                htmlFor="legalEntityIdentifier"
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1"
              >
                Legal Entity Identifier (LEI)
              </label>
              <input
                id="legalEntityIdentifier"
                type="text"
                {...register("legalEntityIdentifier")}
                placeholder="5493001KJTIIGC8Y1R12"
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors uppercase"
              />
              {errors.legalEntityIdentifier && (
                <FieldError message={errors.legalEntityIdentifier.message} />
              )}
            </div>

            {/* Field 3: Jurisdiction of Incorporation */}
            <div>
              <label
                htmlFor="jurisdictionOfIncorporation"
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1"
              >
                Jurisdiction of Incorporation
              </label>
              <select
                id="jurisdictionOfIncorporation"
                {...register("jurisdictionOfIncorporation")}
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer"
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
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1"
              >
                Registration Date
              </label>
              <input
                id="registrationDate"
                type="date"
                {...register("registrationDate")}
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
              />
              {errors.registrationDate && (
                <FieldError message={errors.registrationDate.message} />
              )}
            </div>
          </div>

          {/* ── Side-by-Side Textareas ── */}
          <div className="grid grid-cols-2 gap-x-4 mb-3">
            {/* Field 5: Ultimate Beneficial Owners */}
            <div className="flex flex-col">
              <label
                htmlFor="ultimateBeneficialOwners"
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1 shrink-0"
              >
                Ultimate Beneficial Owners (UBOs)
              </label>
              <p className="text-slate-600 text-[10px] mb-1.5 leading-snug shrink-0">
                All individuals holding &gt;25% voting rights. Names, nationalities, ownership %.
              </p>
              <textarea
                id="ultimateBeneficialOwners"
                {...register("ultimateBeneficialOwners")}
                rows={4}
                placeholder={"e.g. John A. Smith — British National — 40% voting rights\n     Jane B. Doe — US National — 35% voting rights"}
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors resize-none"
              />
              {errors.ultimateBeneficialOwners && (
                <FieldError message={errors.ultimateBeneficialOwners.message} />
              )}
            </div>

            {/* Field 6: Source of Funds Declaration */}
            <div className="flex flex-col">
              <label
                htmlFor="sourceOfFundsDeclaration"
                className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-1 shrink-0"
              >
                Source of Funds Declaration
              </label>
              <p className="text-slate-600 text-[10px] mb-1.5 leading-snug shrink-0">
                Origin of capital to be deployed through the AurumShield settlement engine.
              </p>
              <textarea
                id="sourceOfFundsDeclaration"
                {...register("sourceOfFundsDeclaration")}
                rows={4}
                placeholder="e.g. Funds originate from the operating revenue of Aureus Capital Partners Ltd., a UK-registered precious metals trading firm..."
                className="w-full bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors resize-none"
              />
              {errors.sourceOfFundsDeclaration && (
                <FieldError
                  message={errors.sourceOfFundsDeclaration.message}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky CTA Footer — ALWAYS visible ── */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-6 py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 text-slate-600 shrink-0">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-mono text-[9px] tracking-widest uppercase">
                Dossier — Step 1 of 3
              </span>
            </div>
            <span className="font-mono text-[8px] text-slate-700 tracking-wider uppercase hidden md:block">
              GLEIF · Veriff KYB · Encrypted in Transit &amp; at Rest
            </span>
          </div>

          <div className="relative">
            {isDemoActive && <DemoTooltip text="Complete the Initial Intake Form ↓" position="top" />}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide px-5 py-3.5 rounded-sm hover:bg-gold-hover transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isDemoActive ? `${DEMO_SPOTLIGHT_CLASSES} demo-cta-glow` : ""}`}
            >
              {isSubmitting ? "Saving..." : "Submit Dossier & Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {/* ── Telemetry ── */}
      <div className="shrink-0 border-t border-slate-800/50 px-6 py-1.5">
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
