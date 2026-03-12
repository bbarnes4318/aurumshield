"use client";

/* ================================================================
   OFFTAKER EXECUTION & SETTLEMENT TERMS — Institutional Term Sheet
   ================================================================
   Live pricing oracle (via useGoldPrice), dynamic custody/logistics
   toggle, and line-item fee derivation for 10x 400oz Good Delivery.
   ================================================================ */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Clock,
  Lock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Vault,
  Truck,
  FileText,
  Activity,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { useGoldPrice } from "@/hooks/use-gold-price";

/* ----------------------------------------------------------------
   ORDER PARAMETERS (10x 400oz Good Delivery)
   ---------------------------------------------------------------- */
const ORDER = {
  quantity: 10,
  weightPerUnit: 400,
  get totalWeightOz() {
    return this.quantity * this.weightPerUnit;
  },
  asset: "400 oz LBMA Good Delivery Bar",
  fineness: "≥995.0",
  lockDurationSec: 300,
  offtakerEntity: "Aureus Capital Partners Ltd.",
  lei: "5493001KJTIIGC8Y1R12",
  quoteId: "QTE-2026-8842-XAU",
  orderId: "ORD-8842-XAU",
};

/* ----------------------------------------------------------------
   FEE SCHEDULE (basis points)
   ---------------------------------------------------------------- */
const FEES = {
  physicalPremiumPct: 0.0005, // 0.05%
  executionFeePct: 0.0005, // 0.05%
  malcaAmitTransitPct: 0.0015, // 0.15%
};

/* ----------------------------------------------------------------
   CUSTODY MODES
   ---------------------------------------------------------------- */
type CustodyMode = "vaulting" | "extraction";

/* ----------------------------------------------------------------
   FEDWIRE ROUTING DATA
   ---------------------------------------------------------------- */
const WIRE_INSTRUCTIONS = {
  receivingInstitution: "Column N.A.",
  abaRouting: "121000248",
  beneficiary: `AurumShield Institutional Escrow FBO ${ORDER.offtakerEntity}`,
  virtualAccount: "•••• •••• 8842",
  reference: ORDER.quoteId,
};

/* ----------------------------------------------------------------
   CURRENCY FORMATTER
   ---------------------------------------------------------------- */
function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono text-sm flex items-center gap-2 w-fit">
      {value}
      <button
        onClick={handleCopy}
        className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer"
      >
        [ COPY ]
      </button>
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function CheckoutPage() {
  const router = useRouter();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();

  const [custodyMode, setCustodyMode] = useState<CustodyMode>("vaulting");
  const [secondsLeft, setSecondsLeft] = useState(ORDER.lockDurationSec);
  const [isExecuting, setIsExecuting] = useState(false);

  /* ── Countdown Timer ── */
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isExpired = secondsLeft <= 0;

  /* ── Live Spot Price ── */
  const spotPrice = goldPrice?.spotPriceUsd ?? 2650.0;

  /* ── Institutional Fee Math ── */
  const baseSpotValue = ORDER.totalWeightOz * spotPrice;
  const physicalPremium = baseSpotValue * FEES.physicalPremiumPct;
  const executionFee = baseSpotValue * FEES.executionFeePct;
  const logisticsCost =
    custodyMode === "extraction"
      ? baseSpotValue * FEES.malcaAmitTransitPct
      : 0;
  const totalFedwireAmount =
    baseSpotValue + physicalPremium + executionFee + logisticsCost;

  /* ── Execute & Route ── */
  const handleConfirmExecution = useCallback(() => {
    if (isExpired || isExecuting) return;
    setIsExecuting(true);
    // TODO: Submit execution to API
    console.log("[Checkout] Confirming execution:", ORDER.quoteId);
    setTimeout(() => {
      router.push(`/offtaker/orders/${ORDER.orderId}`);
    }, 600);
  }, [isExpired, isExecuting, router]);

  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-6xl mx-auto p-8 pt-12">
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Execution Terminal
          </span>
        </div>

        <h1 className="text-3xl text-white font-bold tracking-tight mb-6">
          Execution &amp; Settlement Terms
        </h1>

        {/* ════════════════════════════════════════════════════════
           LIVE PRICING ORACLE TICKER
           ════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] h-12 flex items-center px-5 mb-6">
          <div className="flex items-center gap-3 w-full">
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-xs text-slate-500">
              XAU/USD SPOT:
            </span>
            {priceLoading ? (
              <span className="font-mono text-sm text-slate-600 animate-pulse">
                SYNCING...
              </span>
            ) : (
              <span className="font-mono text-sm text-white font-bold tabular-nums">
                ${fmt(spotPrice)}
              </span>
            )}
            <span className="font-mono text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE ORACLE SYNC
            </span>

            {goldPrice && (
              <span
                className={`font-mono text-[10px] tabular-nums ml-auto ${goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {goldPrice.change24h >= 0 ? "+" : ""}
                {goldPrice.change24h} ({goldPrice.changePct24h}%)
              </span>
            )}
          </div>
        </div>

        {/* ── Price Lock Timer Bar ── */}
        <div
          className={`border p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
            isExpired
              ? "bg-red-950/30 border-red-500/50"
              : "bg-slate-900 border-gold-primary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            {isExpired ? (
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-gold-primary shrink-0" />
            )}
            <span className="font-mono text-xs text-white tracking-wider uppercase">
              {isExpired
                ? "QUOTE EXPIRED — RETURN TO MARKETPLACE"
                : "Guaranteed Execution Price Locked"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-slate-500" />
            <span
              className={`font-mono text-xl tabular-nums font-bold ${
                isExpired
                  ? "text-red-400"
                  : secondsLeft <= 60
                    ? "text-red-400 animate-pulse"
                    : "text-gold-primary"
              }`}
            >
              {timerDisplay}
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
           TWO-COLUMN TERM SHEET
           ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* ─────────────────────────────────────────────────────
             LEFT COLUMN — Asset & Logistics
             ───────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Asset Summary */}
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Locked Asset Summary
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between py-1">
                  <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
                    Quote ID
                  </span>
                  <HashBadge value={ORDER.quoteId} />
                </div>
                <TermRow
                  label="Instrument"
                  value={`${ORDER.quantity}x ${ORDER.asset}`}
                />
                <TermRow
                  label="Weight (Per Unit)"
                  value={`${ORDER.weightPerUnit} troy oz`}
                  mono
                />
                <TermRow
                  label="Weight (Total)"
                  value={`${fmt(ORDER.totalWeightOz, 0)} troy oz`}
                  mono
                />
                <TermRow label="Fineness" value={ORDER.fineness} mono />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
               LOGISTICS & CUSTODY TOGGLE
               ════════════════════════════════════════════════════ */}
            <div>
              <h3 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase mb-3 flex items-center gap-2">
                <Vault className="h-3.5 w-3.5" />
                Custody &amp; Logistics
              </h3>

              <div className="space-y-3">
                {/* Option A — Vaulting */}
                <button
                  onClick={() => setCustodyMode("vaulting")}
                  className={`w-full text-left p-4 border transition-colors cursor-pointer shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] ${
                    custodyMode === "vaulting"
                      ? "bg-slate-900 border-gold-primary/50"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Vault className="h-4 w-4 text-slate-500" />
                      <span className="font-mono text-sm text-white">
                        Allocated Vaulting (Zurich FTZ)
                      </span>
                      <span className="font-mono text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 uppercase tracking-wider">
                        Recommended
                      </span>
                    </div>
                    <RadioDot selected={custodyMode === "vaulting"} />
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                    Absolute bankruptcy remoteness under bailee jurisprudence.
                    Annual Cost: 8 bps.
                  </p>
                </button>

                {/* Option B — Extraction */}
                <button
                  onClick={() => setCustodyMode("extraction")}
                  className={`w-full text-left p-4 border transition-colors cursor-pointer shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] ${
                    custodyMode === "extraction"
                      ? "bg-slate-900 border-gold-primary/50"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-500" />
                      <span className="font-mono text-sm text-white">
                        Armored Transit (Malca-Amit)
                      </span>
                    </div>
                    <RadioDot selected={custodyMode === "extraction"} />
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                    Tarmac extraction &amp; Specie Insurance via Lloyd&apos;s.
                    Transit Cost: 0.15%.
                  </p>
                  <p className="font-mono text-[10px] text-slate-600 mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500/60 shrink-0 mt-px" />
                    Requires additional insurance underwriting &amp; tarmac
                    extraction fees.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────
             RIGHT COLUMN — Fee Breakdown, Wire, Execution
             ───────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* ════════════════════════════════════════════════════
               INSTITUTIONAL MATH BREAKDOWN
               ════════════════════════════════════════════════════ */}
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Fee &amp; Cost Derivation
                </h2>
              </div>

              <div className="space-y-0">
                {/* Row 1: Base Spot Value */}
                <FeeRow
                  label={`Base Spot Value (${fmt(ORDER.totalWeightOz, 0)} oz × $${fmt(spotPrice)})`}
                  value={baseSpotValue}
                />
                {/* Row 2: Physical Premium */}
                <FeeRow
                  label="Physical Premium (0.05%)"
                  value={physicalPremium}
                  accent
                />
                {/* Row 3: Execution Fee */}
                <FeeRow
                  label="Execution Fee (0.05%)"
                  value={executionFee}
                  accent
                />
                {/* Row 4: Logistics Cost */}
                <FeeRow
                  label={
                    custodyMode === "extraction"
                      ? "Malca-Amit Transit (0.15%)"
                      : "Logistics (Allocated Vaulting)"
                  }
                  value={logisticsCost}
                  accent={custodyMode === "extraction"}
                  zero={custodyMode === "vaulting"}
                />

                {/* Divider */}
                <div className="border-t border-gold-primary/30 my-2" />

                {/* Row 5: Total */}
                <div className="flex items-center justify-between py-3">
                  <span className="font-mono text-xs text-gold-primary tracking-widest uppercase font-bold">
                    Exact Fedwire Amount Required
                  </span>
                  <span className="font-mono text-2xl text-gold-primary font-bold tabular-nums">
                    ${fmt(totalFedwireAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Wire Instructions */}
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Funds Routing Instructions (Fedwire RTGS)
                </h2>
              </div>

              <div className="space-y-4">
                <WireField
                  label="Receiving Institution"
                  value={WIRE_INSTRUCTIONS.receivingInstitution}
                />
                <WireField
                  label="ABA Routing Number"
                  value={WIRE_INSTRUCTIONS.abaRouting}
                />
                <WireField
                  label="Beneficiary"
                  value={WIRE_INSTRUCTIONS.beneficiary}
                />
                <WireField
                  label="Virtual Account Number"
                  value={WIRE_INSTRUCTIONS.virtualAccount}
                />
                <WireField
                  label="Reference / Memo"
                  value={WIRE_INSTRUCTIONS.reference}
                />
              </div>

              {/* Fedwire Warning */}
              <div className="bg-amber-500/5 border border-amber-500/20 p-3 mt-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                  <p className="font-mono text-[10px] text-amber-400/80 leading-relaxed">
                    Funds must be received via Fedwire before 18:45 ET to
                    guarantee T+0 clearing. Late receipts will settle T+1.
                  </p>
                </div>
              </div>
            </div>

            {/* Offtaker Entity Attestation */}
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                <h3 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Executing Entity
                </h3>
              </div>
              <div className="space-y-2">
                <TermRow
                  label="Legal Entity"
                  value={ORDER.offtakerEntity}
                />
                <TermRow label="LEI" value={ORDER.lei} mono />
                <TermRow
                  label="Custody Mode"
                  value={
                    custodyMode === "vaulting"
                      ? "Allocated Vaulting (Zurich FTZ)"
                      : "Armored Transit (Malca-Amit)"
                  }
                />
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4">
              <p className="font-mono text-[10px] text-slate-600 leading-relaxed">
                By clicking &quot;Confirm Execution &amp; Initialize
                Escrow&quot; you acknowledge that this constitutes a binding
                commitment to purchase the specified asset(s) at the locked
                price. The settlement amount must be remitted in full via
                Fedwire RTGS within the specified window. AurumShield acts as
                principal counterparty under the Master Commercial Agreement
                executed during onboarding.
              </p>
            </div>

            {/* CTA — Confirm Execution */}
            <div>
              <button
                onClick={handleConfirmExecution}
                disabled={isExpired || isExecuting}
                className={`w-full font-bold text-sm tracking-wide py-4 flex items-center justify-center gap-2 transition-colors ${
                  isExpired || isExecuting
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
                }`}
              >
                {isExecuting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Initializing Escrow...
                  </>
                ) : isExpired ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Quote Expired — Return to Marketplace
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Confirm Execution &amp; Initialize Escrow
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
                EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER
                BSA/AML PROTOCOLS.
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="mt-10 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · Fedwire RTGS · LBMA Good Delivery ·
          Sovereign Financial Infrastructure
        </p>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ================================================================
   INLINE HELPERS
   ================================================================ */

/* ── Radio Dot Indicator ── */
function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div
      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
        selected ? "border-gold-primary bg-gold-primary" : "border-slate-700"
      }`}
    >
      {selected && (
        <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
      )}
    </div>
  );
}

/* ── Fee Derivation Row ── */
function FeeRow({
  label,
  value,
  accent = false,
  zero = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  zero?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50">
      <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase pr-4">
        {label}
      </span>
      <span
        className={`font-mono text-sm tabular-nums font-bold ${
          zero
            ? "text-slate-600"
            : accent
              ? "text-gold-primary"
              : "text-white"
        }`}
      >
        {zero ? "$0.00" : `$${fmt(value)}`}
      </span>
    </div>
  );
}

/* ── Term Sheet Row ── */
function TermRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
        {label}
      </span>
      <span
        className={`font-mono text-sm text-right ${
          highlight ? "text-gold-primary font-bold" : "text-white"
        } ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Wire Instruction Field ── */
function WireField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
        {label}
      </span>
      <span className="font-mono text-sm text-white block">{value}</span>
    </div>
  );
}
