"use client";

/* ================================================================
   DEAL STRUCTURING WIZARD — Brokered Settlement Pipeline
   ================================================================
   3-step wizard for structuring a brokered gold settlement.

   Step 1 — Counterparty Identification & KYB Hook
   Step 2 — Asset Definition & Mandatory Refinery Routing
   Step 3 — Commission & Deal Instantiation

   Business rules:
     • External gold MUST route to a partner refinery for assay
     • External counterparties MUST pass AML/KYB/KYC gauntlet
   ================================================================ */

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Scale,
  Factory,
  AlertTriangle,
  CheckCircle2,
  Mail,
  MapPin,
  Percent,
  Weight,
  Banknote,
  Rocket,
} from "lucide-react";

/* ── Partner Refineries ── */
const PARTNER_REFINERIES = [
  { id: "ref-vcb", name: "Valcambi SA", location: "Balerna, Switzerland", lbmaCode: "VCB-CH" },
  { id: "ref-pmp", name: "PAMP SA", location: "Castel San Pietro, Switzerland", lbmaCode: "PAMP-CH" },
  { id: "ref-arh", name: "Argor-Heraeus", location: "Mendrisio, Switzerland", lbmaCode: "ARH-CH" },
  { id: "ref-mtl", name: "Metalor Technologies", location: "Neuchâtel, Switzerland", lbmaCode: "MTL-CH" },
  { id: "ref-rnd", name: "Rand Refinery", location: "Germiston, South Africa", lbmaCode: "RND-ZA" },
  { id: "ref-pth", name: "Perth Mint", location: "Perth, Australia", lbmaCode: "PTH-AU" },
] as const;

/* ── Origin Vault Locations ── */
const VAULT_LOCATIONS = [
  "Zurich Free Port, Switzerland",
  "London LBMA Vault, UK",
  "Singapore Freeport, Singapore",
  "Dubai Gold Souk Vault, UAE",
  "New York Federal Reserve, USA",
  "Frankfurt Settlement Hub, Germany",
  "Hong Kong Exchange Vault, HK",
  "Other / Private Storage",
] as const;

/* ── Step definitions ── */
const STEPS = [
  { num: 1, label: "Counterparty ID", icon: Users },
  { num: 2, label: "Asset & Refinery", icon: Factory },
  { num: 3, label: "Commission & Lock", icon: Banknote },
] as const;

/* ── Formatters ── */
const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

/* ================================================================
   COMPONENT
   ================================================================ */

export default function DealStructuringWizard() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Step 1 State ── */
  const [buyerEmail, setBuyerEmail] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [dealTitle, setDealTitle] = useState("");

  /* ── Step 2 State ── */
  const [weightKg, setWeightKg] = useState("");
  const [purity, setPurity] = useState("999.9");
  const [originVault, setOriginVault] = useState("");
  const [targetRefinery, setTargetRefinery] = useState("");

  /* ── Step 3 State ── */
  const [commissionBps, setCommissionBps] = useState("50");

  /* ── Validation ── */
  const step1Valid = buyerEmail.includes("@") && sellerEmail.includes("@") && dealTitle.trim().length > 0;
  const step2Valid = parseFloat(weightKg) > 0 && originVault.length > 0 && targetRefinery.length > 0;
  const step3Valid = parseInt(commissionBps) >= 0;

  /* ── Computed ── */
  const estimatedOz = parseFloat(weightKg || "0") * 32.1507;
  const estimatedNotional = estimatedOz * 4662; // approximate spot
  const commissionPct = parseInt(commissionBps || "0") / 100;
  const commissionUsd = estimatedNotional * (commissionPct / 100);
  const selectedRefinery = PARTNER_REFINERIES.find((r) => r.id === targetRefinery);

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    // TODO: Wire to server action — create settlement_case with status AWAITING_COUNTERPARTY_ONBOARDING
    console.log("[DealWizard] Submitting:", {
      dealTitle,
      buyerEmail,
      sellerEmail,
      weightKg,
      purity,
      originVault,
      targetRefinery,
      commissionBps,
    });
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  }, [dealTitle, buyerEmail, sellerEmail, weightKg, purity, originVault, targetRefinery, commissionBps]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-300">
      {/* ── HEADER ── */}
      <div className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <Link
            href="/broker"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Cancel
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            Structure Brokered Settlement
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = s.num === step;
            const isDone = s.num < step || submitted;
            return (
              <div key={s.num} className="flex items-center gap-1">
                {s.num > 1 && <div className={`w-6 h-px ${isDone ? "bg-amber-500" : "bg-slate-800"}`} />}
                <div
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    isCurrent
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : isDone
                        ? "text-emerald-400"
                        : "text-slate-600"
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span className="hidden lg:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto p-6">
          {submitted ? (
            /* ── SUCCESS STATE ── */
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Settlement Pipeline Initialized</h2>
              <p className="text-sm text-slate-400 text-center max-w-md">
                The deal has been created with status <span className="font-mono text-amber-400">AWAITING_COUNTERPARTY_ONBOARDING</span>.
                Secure invite links have been dispatched to both counterparties.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/broker"
                  className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Return to Dashboard
                </Link>
                <Link
                  href="/broker/pipeline"
                  className="rounded bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  View Pipeline
                </Link>
              </div>
            </div>
          ) : step === 1 ? (
            /* ════════════════════════════════════════════════════
               STEP 1 — Counterparty Identification & KYB Hook
               ════════════════════════════════════════════════════ */
            <div className="space-y-5">
              {/* Section header */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Users className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Step 1 of 3 — Counterparty Identification
                </h2>
              </div>

              {/* KYB Alert */}
              <div className="rounded border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Mandatory AML/KYB Screening
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If counterparties are not recognized in the AurumShield network,
                    they will receive a secure invite link to complete mandatory AML/KYB
                    screening before the deal can proceed to settlement.
                  </p>
                </div>
              </div>

              {/* Deal Title */}
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                  Deal Reference / Title
                </label>
                <input
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="e.g. Meridian–Nordic 400oz Block Trade"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                />
              </div>

              {/* Buyer / Seller Emails */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                    <Mail className="h-3 w-3 inline mr-1" />
                    Buyer Email
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="buyer@institution.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                    <Mail className="h-3 w-3 inline mr-1" />
                    Seller Email
                  </label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="seller@refinery.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className={`flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold font-mono transition-colors ${
                    step1Valid
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                      : "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  Continue to Asset Definition
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : step === 2 ? (
            /* ════════════════════════════════════════════════════
               STEP 2 — Asset Definition & Mandatory Refinery
               ════════════════════════════════════════════════════ */
            <div className="space-y-5">
              {/* Section header */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Factory className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Step 2 of 3 — Asset Definition & Refinery Routing
                </h2>
              </div>

              {/* Refinery Routing Alert */}
              <div className="rounded border border-blue-500/30 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
                <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                    Mandatory Refinery Verification
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All external assets must clear an AurumShield partner refinery for
                    independent assay verification before LBMA certification and settlement.
                    This is a non-negotiable compliance requirement.
                  </p>
                </div>
              </div>

              {/* Weight & Purity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                    <Weight className="h-3 w-3 inline mr-1" />
                    Estimated Total Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="12.44"
                    step="0.01"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors tabular-nums"
                  />
                  {parseFloat(weightKg) > 0 && (
                    <p className="mt-1 text-[10px] font-mono text-slate-600">
                      ≈ {estimatedOz.toFixed(2)} troy oz · ≈ {fmtUsd(estimatedNotional)} notional
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                    <Percent className="h-3 w-3 inline mr-1" />
                    Declared Purity (‰)
                  </label>
                  <select
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                  >
                    <option value="999.9">999.9 — Four Nines Fine</option>
                    <option value="999.5">999.5 — LBMA Minimum</option>
                    <option value="999.0">999.0</option>
                    <option value="995.0">995.0 — Standard Delivery</option>
                    <option value="990.0">990.0</option>
                    <option value="unknown">Unknown — Requires Assay</option>
                  </select>
                </div>
              </div>

              {/* Origin Vault */}
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Origin Vault / Current Location
                </label>
                <select
                  value={originVault}
                  onChange={(e) => setOriginVault(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                >
                  <option value="">Select origin vault...</option>
                  {VAULT_LOCATIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Target Refinery — MANDATORY */}
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                  <Factory className="h-3 w-3 inline mr-1" />
                  Target Assay Refinery
                  <span className="text-red-400 ml-1">*REQUIRED</span>
                </label>
                <select
                  value={targetRefinery}
                  onChange={(e) => setTargetRefinery(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/30 rounded px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors"
                >
                  <option value="">Select partner refinery...</option>
                  {PARTNER_REFINERIES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.location} ({r.lbmaCode})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-600 font-mono">
                  Gold will be routed here for independent assay before entering the clearing ledger.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className={`flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold font-mono transition-colors ${
                    step2Valid
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                      : "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  Continue to Commission
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ════════════════════════════════════════════════════
               STEP 3 — Commission & Deal Instantiation
               ════════════════════════════════════════════════════ */
            <div className="space-y-5">
              {/* Section header */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Scale className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Step 3 of 3 — Commission & Deal Lock
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* LEFT: Commission Input */}
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] block mb-1.5">
                      Broker Commission (Basis Points)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={commissionBps}
                        onChange={(e) => setCommissionBps(e.target.value)}
                        placeholder="50"
                        min="0"
                        max="500"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-colors tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-600">
                        bps
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600 font-mono">
                      {commissionPct.toFixed(2)}% = {fmtUsd(commissionUsd)} estimated yield
                    </p>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                      Fee Structure
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Broker commission</span>
                        <span className="font-mono text-slate-300">{commissionPct.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Platform fee (AurumShield)</span>
                        <span className="font-mono text-slate-300">1.00%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Refinery assay fee</span>
                        <span className="font-mono text-slate-300">0.15%</span>
                      </div>
                      <div className="h-px bg-slate-800 my-1" />
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Total all-in cost</span>
                        <span className="font-mono text-white">{(commissionPct + 1.00 + 0.15).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Deal Summary */}
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-[0.15em] mb-3 font-bold">
                    Settlement Summary
                  </p>
                  <div className="space-y-2.5">
                    <SummaryRow label="Deal" value={dealTitle || "—"} />
                    <SummaryRow label="Buyer" value={buyerEmail || "—"} />
                    <SummaryRow label="Seller" value={sellerEmail || "—"} />
                    <div className="h-px bg-amber-500/10" />
                    <SummaryRow label="Weight" value={`${weightKg || "0"} kg (≈${estimatedOz.toFixed(1)} oz)`} />
                    <SummaryRow label="Purity" value={`${purity}‰`} />
                    <SummaryRow label="Origin" value={originVault || "—"} />
                    <SummaryRow label="Refinery" value={selectedRefinery?.name ?? "—"} />
                    <div className="h-px bg-amber-500/10" />
                    <SummaryRow label="Est. Notional" value={fmtUsd(estimatedNotional)} highlight />
                    <SummaryRow label="Commission" value={`${fmtUsd(commissionUsd)} (${commissionPct.toFixed(2)}%)`} />
                    <div className="h-px bg-amber-500/10" />
                    <SummaryRow label="Initial Status" value="AWAITING_COUNTERPARTY_ONBOARDING" mono />
                  </div>
                </div>
              </div>

              {/* Navigation + CTA */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!step3Valid || isSubmitting}
                  onClick={handleSubmit}
                  className={`flex items-center gap-2 rounded px-6 py-3 text-sm font-bold font-mono transition-colors ${
                    step3Valid && !isSubmitting
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                      : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Initializing Pipeline...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
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

/* ── Summary Row Helper ── */
function SummaryRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between text-xs gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-right truncate ${
          highlight
            ? "font-mono font-bold text-white"
            : mono
              ? "font-mono text-amber-400 text-[10px]"
              : "font-mono text-slate-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
