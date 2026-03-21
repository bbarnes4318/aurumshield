"use client";

/* ================================================================
   BROKER DEAL STRUCTURING WIZARD — 3-Step Settlement Pipeline Init
   ================================================================
   Triggered from "Structure New Deal" button on the Command Center.

   Steps:
     1. Counterparty Selection — buyer/seller emails + unverified warning
     2. Asset Definition — weight, purity, partner refinery
     3. Commission & Settlement — basis points, payout calc, initiate

   State: 100% client-side useState wizard. No SSR state.
   Validation: Zod schemas per step.
   ================================================================ */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Shield,
  Scale,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useGoldPrice } from "@/hooks/use-gold-price";

/* ── Zod Schemas ── */
const Step1Schema = z.object({
  buyerEmail: z.string().email("Valid buyer email required"),
  sellerEmail: z.string().email("Valid seller email required"),
});

const Step2Schema = z.object({
  weightOz: z.number().min(100, "Minimum 100 oz").max(50000, "Maximum 50,000 oz"),
  purity: z.number().min(0.900, "Minimum 90.0%").max(1, "Maximum 100%"),
  partnerRefinery: z.string().min(1, "Select a partner refinery"),
});

const Step3Schema = z.object({
  commissionBps: z.number().min(5, "Minimum 5 bps").max(200, "Maximum 200 bps"),
});

/* ── Partner Refineries ── */
const PARTNER_REFINERIES = [
  "Valcambi SA",
  "PAMP SA",
  "Argor-Heraeus",
  "Heraeus",
  "MKS PAMP Group",
  "Johnson Matthey",
  "Metalor Technologies",
  "Tanaka Kikinzoku",
] as const;

/* ── Formatters ── */
const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

/* ================================================================
   COMPONENT
   ================================================================ */

export default function DealStructuringWizard() {
  const router = useRouter();
  const gold = useGoldPrice();
  const spotPrice = gold.data?.spotPriceUsd ?? 2653;

  /* ── Wizard step state ── */
  const [step, setStep] = useState(1);

  /* ── Step 1: Counterparties ── */
  const [buyerEmail, setBuyerEmail] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  /* ── Step 2: Asset definition ── */
  const [weightOz, setWeightOz] = useState("");
  const [purity, setPurity] = useState("99.99");
  const [partnerRefinery, setPartnerRefinery] = useState("");
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});

  /* ── Step 3: Commission ── */
  const [commissionBps, setCommissionBps] = useState("50");
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Derived calculations ── */
  const parsedWeight = parseFloat(weightOz) || 0;
  const parsedPurity = parseFloat(purity) / 100 || 0;
  const parsedBps = parseInt(commissionBps) || 0;

  const notionalUsd = useMemo(() => parsedWeight * spotPrice, [parsedWeight, spotPrice]);
  const commissionUsd = useMemo(() => (notionalUsd * parsedBps) / 10_000, [notionalUsd, parsedBps]);

  /* ── Step navigation ── */
  const handleNext1 = () => {
    const result = Step1Schema.safeParse({ buyerEmail, sellerEmail });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => { errs[String(e.path[0])] = e.message; });
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep(2);
  };

  const handleNext2 = () => {
    const result = Step2Schema.safeParse({
      weightOz: parsedWeight,
      purity: parsedPurity,
      partnerRefinery,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => { errs[String(e.path[0])] = e.message; });
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});
    setStep(3);
  };

  const handleSubmit = async () => {
    const result = Step3Schema.safeParse({ commissionBps: parsedBps });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => { errs[String(e.path[0])] = e.message; });
      setStep3Errors(errs);
      return;
    }
    setStep3Errors({});
    setIsSubmitting(true);
    // TODO: Wire to real API endpoint for deal creation
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  /* ── Step indicator ── */
  const STEPS = [
    { num: 1, label: "Counterparties" },
    { num: 2, label: "Asset Definition" },
    { num: 3, label: "Commission & Settlement" },
  ];

  if (submitted) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        <h1 className="text-xl font-semibold text-slate-100">Deal Pipeline Initialized</h1>
        <p className="font-mono text-[11px] text-slate-500 uppercase tracking-wider text-center max-w-md">
          Settlement pipeline created. Counterparties will receive escrow instructions via secure channel.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push("/broker/pipeline")}
            className="px-6 py-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            View Pipeline
          </button>
          <button
            onClick={() => router.push("/broker")}
            className="px-6 py-2.5 rounded border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Command Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Header + Step Indicators ── */}
      <div className="shrink-0">
        <h1 className="text-sm font-semibold text-slate-200 tracking-tight">Structure New Deal</h1>
        <div className="flex items-center gap-2 mt-3">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-mono font-bold ${
                    step === s.num
                      ? "bg-amber-500 text-slate-950"
                      : step > s.num
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span
                  className={`text-[11px] font-mono uppercase tracking-wider ${
                    step === s.num ? "text-amber-400" : step > s.num ? "text-emerald-400/60" : "text-slate-600"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-px ${step > s.num ? "bg-emerald-500/30" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="flex-1 min-h-0 flex items-start justify-center overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* ═══════ STEP 1: Counterparties ═══════ */}
          {step === 1 && (
            <div className="rounded border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Counterparty Selection</h2>
              <p className="text-[11px] text-slate-500 font-mono mb-6">
                Identify the buyer and seller for this settlement pipeline.
              </p>

              {/* Warning Banner */}
              <div className="flex items-start gap-3 rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-6">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400/80 font-mono leading-relaxed">
                  Unverified counterparties will be forced through the AML/KYB gauntlet before the deal can proceed.
                  Ensure both parties have completed identity verification to avoid settlement delays.
                </p>
              </div>

              <div className="space-y-4">
                {/* Buyer Email */}
                <div>
                  <label htmlFor="buyer-email" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    Buyer Email
                  </label>
                  <input
                    id="buyer-email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="buyer@institution.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors"
                  />
                  {step1Errors.buyerEmail && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step1Errors.buyerEmail}</p>
                  )}
                </div>

                {/* Seller Email */}
                <div>
                  <label htmlFor="seller-email" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    Seller Email
                  </label>
                  <input
                    id="seller-email"
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="seller@refinery.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors"
                  />
                  {step1Errors.sellerEmail && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step1Errors.sellerEmail}</p>
                  )}
                </div>
              </div>

              {/* Next */}
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleNext1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 2: Asset Definition ═══════ */}
          {step === 2 && (
            <div className="rounded border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Asset Definition</h2>
              <p className="text-[11px] text-slate-500 font-mono mb-6">
                Define the physical gold parameters and select the AurumShield Partner Refinery for mandatory assay testing.
              </p>

              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <label htmlFor="asset-weight" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    Total Weight (Troy Ounces)
                  </label>
                  <input
                    id="asset-weight"
                    type="number"
                    value={weightOz}
                    onChange={(e) => setWeightOz(e.target.value)}
                    placeholder="1200"
                    min="100"
                    max="50000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors tabular-nums"
                  />
                  {step2Errors.weightOz && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step2Errors.weightOz}</p>
                  )}
                </div>

                {/* Purity */}
                <div>
                  <label htmlFor="asset-purity" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    Purity (%)
                  </label>
                  <input
                    id="asset-purity"
                    type="number"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    placeholder="99.99"
                    step="0.01"
                    min="90"
                    max="100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors tabular-nums"
                  />
                  {step2Errors.purity && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step2Errors.purity}</p>
                  )}
                </div>

                {/* Partner Refinery */}
                <div>
                  <label htmlFor="partner-refinery" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    AurumShield Partner Refinery
                  </label>
                  <select
                    id="partner-refinery"
                    value={partnerRefinery}
                    onChange={(e) => setPartnerRefinery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors"
                  >
                    <option value="">Select Partner Refinery…</option>
                    {PARTNER_REFINERIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {step2Errors.partnerRefinery && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step2Errors.partnerRefinery}</p>
                  )}
                  <p className="text-[10px] text-slate-600 font-mono mt-1.5">
                    All gold is routed through the selected refinery for mandatory assay testing and LBMA certification.
                  </p>
                </div>

                {/* Notional Preview */}
                {parsedWeight > 0 && (
                  <div className="rounded border border-slate-800 bg-black/40 px-4 py-3 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Estimated Notional</span>
                      <span className="text-lg font-mono font-bold text-slate-100 tabular-nums">{fmtUsd(notionalUsd)}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-1">
                      @ {fmtUsd(spotPrice)}/oz · {parsedWeight.toLocaleString()} oz
                    </p>
                  </div>
                )}
              </div>

              {/* Nav */}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded border border-slate-700 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext2}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 3: Commission & Settlement ═══════ */}
          {step === 3 && (
            <div className="rounded border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Commission & Settlement</h2>
              <p className="text-[11px] text-slate-500 font-mono mb-6">
                Define your commission rate and initialize the settlement pipeline.
              </p>

              <div className="space-y-4">
                {/* Commission BPS */}
                <div>
                  <label htmlFor="commission-bps" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                    Commission (Basis Points)
                  </label>
                  <input
                    id="commission-bps"
                    type="number"
                    value={commissionBps}
                    onChange={(e) => setCommissionBps(e.target.value)}
                    placeholder="50"
                    min="5"
                    max="200"
                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-colors tabular-nums"
                  />
                  {step3Errors.commissionBps && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">{step3Errors.commissionBps}</p>
                  )}
                  <p className="text-[10px] text-slate-600 font-mono mt-1.5">
                    1 basis point = 0.01% of notional value
                  </p>
                </div>

                {/* Settlement Summary */}
                <div className="rounded border border-slate-800 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Settlement Summary</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-xs font-mono">
                    <span className="text-slate-500">Counterparties</span>
                    <span className="text-right text-slate-300 truncate">{buyerEmail || "—"} ↔ {sellerEmail || "—"}</span>

                    <span className="text-slate-500">Weight</span>
                    <span className="text-right text-slate-300 tabular-nums">{parsedWeight > 0 ? `${parsedWeight.toLocaleString()} oz` : "—"}</span>

                    <span className="text-slate-500">Purity</span>
                    <span className="text-right text-slate-300 tabular-nums">{parsedPurity > 0 ? `${(parsedPurity * 100).toFixed(2)}%` : "—"}</span>

                    <span className="text-slate-500">Refinery</span>
                    <span className="text-right text-slate-300">{partnerRefinery || "—"}</span>

                    <span className="text-slate-500">Notional Value</span>
                    <span className="text-right text-slate-200 font-semibold tabular-nums">{fmtUsd(notionalUsd)}</span>

                    <span className="text-slate-500">Commission ({parsedBps} bps)</span>
                    <span className="text-right text-emerald-400 font-semibold tabular-nums">{fmtUsd(commissionUsd)}</span>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded border border-slate-700 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded text-sm font-semibold transition-colors ${
                    isSubmitting
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Initializing Pipeline…
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Initialize Settlement Pipeline
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
