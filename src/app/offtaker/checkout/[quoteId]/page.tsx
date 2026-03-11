"use client";

/* ================================================================
   OFFTAKER EXECUTION & SETTLEMENT TERMS
   ================================================================
   The Offtaker has requested a quote from the marketplace. This
   screen presents the locked price, asset summary, fulfillment
   options, and Fedwire routing instructions as a legally-binding
   term sheet. The CTA initializes escrow and routes to the
   post-purchase settlement ledger.
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
  Building2,
  Vault,
  Truck,
  FileText,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK LOCKED QUOTE DATA
   ---------------------------------------------------------------- */
const MOCK_QUOTE = {
  quoteId: "QTE-2026-8842-XAU",
  orderId: "ORD-8842-XAU",
  asset: "400 oz LBMA Good Delivery Bar",
  quantity: 10,
  weightPerUnit: 400,
  totalWeightOz: 4000,
  fineness: "≥995.0",
  spotAtLock: 2650.0,
  premiumPct: 0.1,
  lockedPricePerOz: 2652.65,
  totalNotional: 10610600.0,
  lockDurationSec: 300,
  offtakerEntity: "Aureus Capital Partners Ltd.",
  lei: "5493001KJTIIGC8Y1R12",
};

/* ----------------------------------------------------------------
   FULFILLMENT OPTIONS
   ---------------------------------------------------------------- */
type FulfillmentType = "vaulting" | "delivery";

interface FulfillmentOption {
  id: FulfillmentType;
  label: string;
  provider: string;
  description: string;
  recommended: boolean;
  note?: string;
}

const FULFILLMENT_OPTIONS: FulfillmentOption[] = [
  {
    id: "vaulting",
    label: "Allocated Vaulting",
    provider: "Zurich — Malca-Amit",
    description:
      "Segregated allocated custody in LBMA-accredited vaulting facility. Full title remains with Offtaker.",
    recommended: true,
  },
  {
    id: "delivery",
    label: "Armored Delivery",
    provider: "Brink's / Loomis",
    description:
      "Physical delivery to designated secure facility or port of entry.",
    recommended: false,
    note: "Requires additional insurance underwriting & tarmac extraction fees.",
  },
];

/* ----------------------------------------------------------------
   FEDWIRE ROUTING DATA
   ---------------------------------------------------------------- */
const WIRE_INSTRUCTIONS = {
  receivingInstitution: "Column N.A.",
  abaRouting: "121000248",
  beneficiary: `AurumShield Institutional Escrow FBO ${MOCK_QUOTE.offtakerEntity}`,
  virtualAccount: "•••• •••• 8842",
  reference: MOCK_QUOTE.quoteId,
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
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("vaulting");
  const [secondsLeft, setSecondsLeft] = useState(MOCK_QUOTE.lockDurationSec);
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

  /* ── Execute & Route ── */
  const handleConfirmExecution = useCallback(() => {
    if (isExpired || isExecuting) return;
    setIsExecuting(true);
    // TODO: Submit execution to API
    console.log("[Checkout] Confirming execution:", MOCK_QUOTE.quoteId);
    setTimeout(() => {
      router.push(`/offtaker/orders/${MOCK_QUOTE.orderId}`);
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

        {/* ── Two-Column Term Sheet ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* ─────────────────────────────────────────────────────
             LEFT COLUMN — Asset & Custody Logistics
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
                {/* Quote ID — Hash Badge */}
                <div className="flex items-start justify-between py-1">
                  <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
                    Quote ID
                  </span>
                  <HashBadge value={MOCK_QUOTE.quoteId} />
                </div>
                <TermRow
                  label="Instrument"
                  value={`${MOCK_QUOTE.quantity}x ${MOCK_QUOTE.asset}`}
                />
                <TermRow
                  label="Weight (Per Unit)"
                  value={`${MOCK_QUOTE.weightPerUnit} troy oz`}
                  mono
                />
                <TermRow
                  label="Weight (Total)"
                  value={`${fmt(MOCK_QUOTE.totalWeightOz, 0)} troy oz`}
                  mono
                />
                <TermRow label="Fineness" value={MOCK_QUOTE.fineness} mono />

                <div className="border-t border-slate-800 pt-3 mt-3">
                  <TermRow
                    label="Spot at Lock"
                    value={`$${fmt(MOCK_QUOTE.spotAtLock)}`}
                    mono
                  />
                  <TermRow
                    label="Premium"
                    value={`+${MOCK_QUOTE.premiumPct.toFixed(2)}%`}
                    highlight
                  />
                  <TermRow
                    label="Locked Price/oz"
                    value={`$${fmt(MOCK_QUOTE.lockedPricePerOz)}`}
                    mono
                  />
                </div>
              </div>
            </div>

            {/* Fulfillment Selection */}
            <div>
              <h3 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Custody &amp; Fulfillment
              </h3>

              <div className="space-y-3">
                {FULFILLMENT_OPTIONS.map((opt) => {
                  const isSelected = fulfillment === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setFulfillment(opt.id)}
                      className={`w-full text-left p-4 border transition-colors cursor-pointer shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] ${
                        isSelected
                          ? "bg-slate-900 border-gold-primary/50"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {opt.id === "vaulting" ? (
                            <Vault className="h-4 w-4 text-slate-500" />
                          ) : (
                            <Truck className="h-4 w-4 text-slate-500" />
                          )}
                          <span className="font-mono text-sm text-white">
                            {opt.label}
                          </span>
                          {opt.recommended && (
                            <span className="font-mono text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 uppercase tracking-wider">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-gold-primary bg-gold-primary"
                              : "border-slate-700"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                          )}
                        </div>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 mb-1">
                        {opt.provider}
                      </p>
                      <p className="font-mono text-[10px] text-slate-600 leading-relaxed">
                        {opt.description}
                      </p>
                      {opt.note && (
                        <p className="font-mono text-[10px] text-slate-500 mt-2 flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500/60 shrink-0 mt-px" />
                          {opt.note}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────
             RIGHT COLUMN — Fedwire Instructions & Execution
             ───────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Wire Packet */}
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

                {/* Settlement Amount */}
                <div className="border-t border-slate-800 pt-4 mt-4">
                  <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">
                    Exact Settlement Amount
                  </span>
                  <span className="font-mono text-2xl text-white font-bold tabular-nums block">
                    ${fmt(MOCK_QUOTE.totalNotional)}
                  </span>
                </div>
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
                  value={MOCK_QUOTE.offtakerEntity}
                />
                <TermRow label="LEI" value={MOCK_QUOTE.lei} mono />
                <TermRow
                  label="Fulfillment"
                  value={
                    fulfillment === "vaulting"
                      ? "Allocated Vaulting (Zurich)"
                      : "Armored Delivery (Brink's)"
                  }
                />
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4">
              <p className="font-mono text-[10px] text-slate-600 leading-relaxed">
                By clicking &quot;Confirm Execution &amp; Initialize Escrow&quot; you
                acknowledge that this constitutes a binding commitment to
                purchase the specified asset(s) at the locked price. The
                settlement amount must be remitted in full via Fedwire RTGS
                within the specified window. AurumShield acts as principal
                counterparty under the Master Commercial Agreement executed
                during onboarding.
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
                EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
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

/* ── Inline Helper: Term Sheet Row ── */
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

/* ── Inline Helper: Wire Instruction Field ── */
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
