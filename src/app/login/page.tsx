"use client";

/* ================================================================
   LOGIN PAGE — Institutional Access Gate
   ================================================================
   Multi-step vetting form that collects qualifying information
   from potential institutional users. Data is structured for
   review pipeline integration.
   ================================================================ */

import { useState, useCallback } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Fingerprint,
  Building2,
  FileSearch,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";

/* ── Free email providers (rejected) ── */
const FREE_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "live.com",
  "msn.com",
  "gmx.com",
  "inbox.com",
];

/* ── Zod Schemas ── */
/* ── Individual entity types (free email accepted) ── */
const INDIVIDUAL_ENTITIES = ["Individual Broker / Dealer"];

const step1Schema = z
  .object({
    fullName: z.string().min(2, "Full legal name is required"),
    email: z.string().email("Valid email address is required"),
    entityType: z.string().min(1, "Entity classification is required"),
  })
  .refine(
    (data) => {
      if (INDIVIDUAL_ENTITIES.includes(data.entityType)) return true;
      const domain = data.email.split("@")[1]?.toLowerCase();
      return domain && !FREE_PROVIDERS.includes(domain);
    },
    {
      message:
        "Institutional email required for this entity type — consumer providers are not accepted",
      path: ["email"],
    }
  );

const step2Schema = z.object({
  settlementVolume: z.string().min(1, "Anticipated volume is required"),
  useCase: z.string().min(1, "Primary use case is required"),
  operationalMandate: z
    .string()
    .min(20, "Minimum 20 characters required")
    .max(500, "Maximum 500 characters"),
});


/* ── Constants ── */
const ENTITY_TYPES = [
  "Individual Broker / Dealer",
  "Prime Brokerage",
  "Family Office / UHNWI",
  "Asset Manager / Fund",
  "Vault Operator / Refiner",
  "Sovereign Wealth",
  "Other",
];

const VOLUME_TIERS = [
  "< $5M annually",
  "$5M – $25M annually",
  "$25M – $100M annually",
  "$100M+ annually",
];

const USE_CASES = [
  "Physical Delivery",
  "Custodial Settlement",
  "Inventory Hedging",
  "Multi-Party Clearing",
];

/* ── Shared Input Styles ── */
const INPUT_CLASS =
  "w-full rounded-md border border-border bg-surface-2 px-4 py-3 text-base text-text placeholder:text-text-faint/50 outline-none transition-all focus:border-gold focus:ring-1 focus:ring-gold/30";
const SELECT_CLASS =
  "w-full rounded-md border border-border bg-surface-2 px-4 py-3 text-base text-text outline-none transition-all focus:border-gold focus:ring-1 focus:ring-gold/30 appearance-none cursor-pointer";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2";
const ERROR_CLASS = "mt-1.5 text-xs text-rose-400";

/* ── Generate hex ref ── */
function generateRef(): string {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `AS-${hex.toUpperCase()}`;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationRef, setApplicationRef] = useState("");

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [entityType, setEntityType] = useState("");

  // Step 2 fields
  const [settlementVolume, setSettlementVolume] = useState("");
  const [useCase, setUseCase] = useState("");
  const [operationalMandate, setOperationalMandate] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Step 1 → Step 2 ── */
  const advanceToStep2 = useCallback(() => {
    const result = step1Schema.safeParse({ fullName, email, entityType });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStep(2);
  }, [fullName, email, entityType]);

  /* ── Step 2 → Submit ── */
  const submitApplication = useCallback(async () => {
    const result = step2Schema.safeParse({
      settlementVolume,
      useCase,
      operationalMandate,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    const ref = generateRef();
    const payload = {
      ref,
      fullName,
      email,
      entityType,
      settlementVolume,
      useCase,
      operationalMandate,
      submittedAt: new Date().toISOString(),
    };

    // TODO: Replace with real API endpoint
    // Mock submission with delay
    await new Promise((resolve) => setTimeout(resolve, 1800));
    console.log(
      "[AurumShield] Institutional Access Application:",
      JSON.stringify(payload, null, 2),
    );

    setApplicationRef(ref);
    setIsSubmitting(false);
    setStep(3);
  }, [
    settlementVolume,
    useCase,
    operationalMandate,
    fullName,
    email,
    entityType,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-lg">
        {/* ── Brand ── */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo className="h-12 w-auto" variant="dark" />
          </div>
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-text-faint">
            Institutional Access Protocol
          </p>
        </div>

        {/* ── Main Card ── */}
        <div className="rounded-md border border-border bg-surface-1 shadow-lg overflow-hidden">
          {/* ── Card Header ── */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-gold" />
              <span className="text-xs font-medium text-text-muted tracking-wide">
                {step < 3 ? "Vetting Application" : "Application Received"}
              </span>
            </div>
            <span className="font-mono text-xs text-text-faint tabular-nums">
              {step < 3 ? `${String(step).padStart(2, "0")} / 03` : "COMPLETE"}
            </span>
          </div>

          {/* ── Step Progress Bar ── */}
          <div className="h-px w-full bg-border relative">
            <div
              className="absolute top-0 left-0 h-full bg-gold transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* ── Form Body ── */}
          <div className="p-6 sm:p-8">
            {/* ═══ STEP 1: Identity & Entity ═══ */}
            {step === 1 && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/20 bg-gold/5">
                    <Building2 className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text">
                      Entity Identification
                    </h2>
                    <p className="text-xs text-text-faint">
                      Classify your institutional profile
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className={LABEL_CLASS}>
                      Full Legal Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="As registered with governing authority"
                      className={INPUT_CLASS}
                    />
                    {errors.fullName && (
                      <p className={ERROR_CLASS}>{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className={LABEL_CLASS}>
                      Institutional Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institution.com"
                      className={INPUT_CLASS}
                    />
                    {errors.email && (
                      <p className={ERROR_CLASS}>{errors.email}</p>
                    )}
                  </div>

                  {/* Entity Type */}
                  <div>
                    <label htmlFor="entityType" className={LABEL_CLASS}>
                      Entity Classification
                    </label>
                    <div className="relative">
                      <select
                        id="entityType"
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        className={`${SELECT_CLASS} ${!entityType ? "text-text-faint/50" : ""}`}
                      >
                        <option value="" disabled>
                          Select classification
                        </option>
                        {ENTITY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="h-4 w-4 text-text-faint"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.entityType && (
                      <p className={ERROR_CLASS}>{errors.entityType}</p>
                    )}
                  </div>
                </div>

                {/* Advance Button */}
                <button
                  type="button"
                  onClick={advanceToStep2}
                  className="mt-8 w-full flex items-center justify-center gap-2 rounded-md bg-gold hover:bg-gold-hover px-6 py-3.5 text-sm font-bold text-slate-950 transition-colors"
                >
                  Continue to Qualification
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ═══ STEP 2: Qualification & Intent ═══ */}
            {step === 2 && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/20 bg-gold/5">
                    <FileSearch className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text">
                      Qualification Assessment
                    </h2>
                    <p className="text-xs text-text-faint">
                      Operational scope & settlement intent
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Settlement Volume */}
                  <div>
                    <label htmlFor="settlementVolume" className={LABEL_CLASS}>
                      Anticipated Settlement Volume
                    </label>
                    <div className="relative">
                      <select
                        id="settlementVolume"
                        value={settlementVolume}
                        onChange={(e) => setSettlementVolume(e.target.value)}
                        className={`${SELECT_CLASS} ${!settlementVolume ? "text-text-faint/50" : ""}`}
                      >
                        <option value="" disabled>
                          Select volume tier
                        </option>
                        {VOLUME_TIERS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="h-4 w-4 text-text-faint"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.settlementVolume && (
                      <p className={ERROR_CLASS}>{errors.settlementVolume}</p>
                    )}
                  </div>

                  {/* Use Case */}
                  <div>
                    <label htmlFor="useCase" className={LABEL_CLASS}>
                      Primary Use Case
                    </label>
                    <div className="relative">
                      <select
                        id="useCase"
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        className={`${SELECT_CLASS} ${!useCase ? "text-text-faint/50" : ""}`}
                      >
                        <option value="" disabled>
                          Select use case
                        </option>
                        {USE_CASES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="h-4 w-4 text-text-faint"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.useCase && (
                      <p className={ERROR_CLASS}>{errors.useCase}</p>
                    )}
                  </div>

                  {/* Operational Mandate */}
                  <div>
                    <label htmlFor="operationalMandate" className={LABEL_CLASS}>
                      Operational Mandate
                    </label>
                    <textarea
                      id="operationalMandate"
                      value={operationalMandate}
                      onChange={(e) => setOperationalMandate(e.target.value)}
                      placeholder="Describe your firm's relationship with physical bullion and the operational context for requiring institutional clearing infrastructure."
                      rows={4}
                      maxLength={500}
                      className={`${INPUT_CLASS} resize-none`}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      {errors.operationalMandate ? (
                        <p className={ERROR_CLASS}>
                          {errors.operationalMandate}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] font-mono text-text-faint tabular-nums">
                        {operationalMandate.length} / 500
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrors({});
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-3.5 text-sm text-text-muted hover:text-text hover:border-text-faint transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submitApplication}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-gold hover:bg-gold-hover disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3.5 text-sm font-bold text-slate-950 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Fingerprint className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 3: Confirmation ═══ */}
            {step === 3 && (
              <div className="animate-in fade-in duration-300 text-center py-4">
                {/* Success Icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md border border-gold/20 bg-gold/5">
                  <CheckCircle className="h-8 w-8 text-gold" />
                </div>

                <h2 className="text-lg font-semibold text-text mb-2">
                  Application Received
                </h2>

                {/* Reference Code */}
                <div className="mx-auto mb-6 max-w-xs rounded-md border border-border bg-surface-2 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-faint mb-1">
                    Application Reference
                  </p>
                  <p className="font-mono text-base font-bold text-gold tracking-wider">
                    {applicationRef}
                  </p>
                </div>

                <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto mb-2">
                  Your submission has entered our institutional review pipeline.
                  Candidates are evaluated on a rolling basis by our compliance
                  and risk architecture teams.
                </p>
                <p className="text-xs text-text-faint leading-relaxed max-w-sm mx-auto">
                  You will be contacted at the email provided if your entity
                  qualifies for platform access. Do not resubmit.
                </p>

                {/* Divider */}
                <div className="border-t border-border my-6" />

                {/* Status */}
                <div className="flex items-center justify-center gap-2 text-xs text-text-faint">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gold/40 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                  <span className="font-mono uppercase tracking-wider">
                    Status: Pending Review
                  </span>
                </div>

                {/* Return to Homepage */}
                <div className="mt-8">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-md border border-gold/30 bg-transparent px-6 py-3 text-sm font-semibold text-gold hover:bg-gold/5 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Return to Homepage
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Back to Home ── */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Home
          </Link>
        </div>

        {/* ── Footer ── */}
        <p className="mt-8 text-center text-[10px] text-text-faint/50">
          © 2026 AurumShield. All rights reserved. All submissions are subject
          to institutional verification.
        </p>
      </div>
    </div>
  );
}
