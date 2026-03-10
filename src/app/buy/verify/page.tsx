"use client";

/* ================================================================
   PHASE 2: IDENTITY VERIFICATION — Veriff Integration
   ================================================================
   3-step sub-flow: ID Upload → Corporate Identity → AML/OFAC
   Vendor: Veriff (mock)
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";
import { useBuyerFlow } from "@/stores/buyer-flow-store";

const BRAND_GOLD = "#c6a86b";

type VerifyStep = "id-upload" | "corporate" | "screening";

const STEPS: { key: VerifyStep; label: string; icon: React.ElementType }[] = [
  { key: "id-upload", label: "ID Document", icon: FileText },
  { key: "corporate", label: "Corporate Identity", icon: Building2 },
  { key: "screening", label: "Compliance", icon: ShieldCheck },
];

export default function VerifyPage() {
  const router = useRouter();
  const { completePhase, canAccess } = useBuyerFlow();

  /* ── Guard: must complete register first ── */
  if (!canAccess("verify")) {
    router.replace("/buy/register");
    return null;
  }

  return <VerifyContent />;
}

function VerifyContent() {
  const router = useRouter();
  const { completePhase } = useBuyerFlow();
  const [step, setStep] = useState<VerifyStep>("id-upload");
  const [completedSteps, setCompletedSteps] = useState<VerifyStep[]>([]);

  /* ── ID Upload State ── */
  const [idFile, setIdFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ── Corporate State ── */
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [country, setCountry] = useState("");

  /* ── Screening State ── */
  const [screening, setScreening] = useState(false);
  const [screeningDone, setScreeningDone] = useState(false);

  const completeStep = useCallback(
    (s: VerifyStep) => {
      setCompletedSteps((prev) => [...prev, s]);
      const stepIndex = STEPS.findIndex((st) => st.key === s);
      if (stepIndex < STEPS.length - 1) {
        setStep(STEPS[stepIndex + 1].key);
      }
    },
    [],
  );

  /* ── Handle ID Upload ── */
  const handleFileSelect = useCallback(() => {
    // TODO: Replace with Veriff SDK integration
    setUploading(true);
    setTimeout(() => {
      setIdFile("passport_scan.pdf");
      setUploading(false);
    }, 1200);
  }, []);

  const handleUploadContinue = useCallback(() => {
    if (idFile) completeStep("id-upload");
  }, [idFile, completeStep]);

  /* ── Handle Corporate Submit ── */
  const handleCorporateSubmit = useCallback(() => {
    if (companyName && regNumber && country) {
      completeStep("corporate");
    }
  }, [companyName, regNumber, country, completeStep]);

  /* ── Handle Screening ── */
  const handleStartScreening = useCallback(() => {
    setScreening(true);
    // Simulate AML/OFAC screening
    setTimeout(() => {
      setScreening(false);
      setScreeningDone(true);
    }, 2500);
  }, []);

  const handleComplete = useCallback(() => {
    completePhase("verify");
    router.push("/buy/marketplace");
  }, [completePhase, router]);

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Verify Your Identity
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Quick identity verification to keep everyone safe.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="mb-8 flex items-center gap-4">
        {STEPS.map((s, i) => {
          const isComplete = completedSteps.includes(s.key);
          const isCurrent = step === s.key;
          const Icon = s.icon;

          return (
            <div key={s.key} className="flex items-center gap-3">
              {i > 0 && (
                <div
                  className={`h-px w-6 ${isComplete || isCurrent ? "bg-[#c6a86b]/40" : "bg-slate-800"}`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isComplete
                      ? "border-emerald-500 bg-emerald-500/10"
                      : isCurrent
                        ? "border-[#c6a86b] bg-[#c6a86b]/10"
                        : "border-slate-700"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: isCurrent ? BRAND_GOLD : "#64748b" }}
                    />
                  )}
                </div>
                <span
                  className={`hidden text-xs font-semibold sm:block ${
                    isCurrent ? "text-white" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1829] p-8">
          {/* ═══ STEP: ID Upload ═══ */}
          {step === "id-upload" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Upload Identity Document
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Passport, driver&apos;s license, or government-issued ID.
                </p>
              </div>

              {/* Drop Zone */}
              <button
                type="button"
                onClick={handleFileSelect}
                disabled={uploading}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-700 bg-[#070e1a] p-8 transition-all hover:border-[#c6a86b]/40 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#c6a86b]" />
                ) : idFile ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                ) : (
                  <Upload className="h-8 w-8 text-slate-500" />
                )}
                <span className="text-xs text-slate-400">
                  {uploading
                    ? "Uploading…"
                    : idFile
                      ? `Uploaded: ${idFile}`
                      : "Click to select or drag & drop"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleUploadContinue}
                disabled={!idFile}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  backgroundColor: idFile ? BRAND_GOLD : undefined,
                  color: idFile ? "#0a1128" : "#64748b",
                  border: idFile ? "none" : "1px solid #334155",
                }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ═══ STEP: Corporate Identity ═══ */}
          {step === "corporate" && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Corporate Identity
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tell us about your organization.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="corp-name"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    Company Name
                  </label>
                  <input
                    id="corp-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Holdings Ltd."
                    className="w-full rounded-xl border border-slate-700 bg-[#070e1a] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-[#c6a86b]/50 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-number"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    Registration Number
                  </label>
                  <input
                    id="reg-number"
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g., 12345678"
                    className="w-full rounded-xl border border-slate-700 bg-[#070e1a] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-[#c6a86b]/50 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="country"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    Country of Incorporation
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#070e1a] px-4 py-3 text-sm text-white focus:border-[#c6a86b]/50 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/30"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CH">Switzerland</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="HK">Hong Kong</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCorporateSubmit}
                disabled={!companyName || !regNumber || !country}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  backgroundColor:
                    companyName && regNumber && country
                      ? BRAND_GOLD
                      : undefined,
                  color:
                    companyName && regNumber && country
                      ? "#0a1128"
                      : "#64748b",
                  border:
                    companyName && regNumber && country
                      ? "none"
                      : "1px solid #334155",
                }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ═══ STEP: AML/OFAC Screening ═══ */}
          {step === "screening" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Compliance Screening
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Automated AML & OFAC sanctions check.
                </p>
              </div>

              {!screening && !screeningDone && (
                <button
                  type="button"
                  onClick={handleStartScreening}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#070e1a] px-4 py-6 text-sm font-semibold text-slate-300 transition-all hover:border-[#c6a86b]/40 hover:text-white"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Begin Screening
                </button>
              )}

              {screening && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-[#c6a86b]" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">
                      Screening in progress…
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Checking against global sanctions databases.
                    </p>
                  </div>
                </div>
              )}

              {screeningDone && (
                <>
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-400">
                        Screening Complete
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        No adverse findings. You&apos;re cleared to proceed.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleComplete}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: BRAND_GOLD,
                      color: "#0a1128",
                    }}
                  >
                    Continue to Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
