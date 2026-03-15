"use client";

/* ================================================================
   SETTLEMENT LEDGER & FUNDING TRACKER
   ================================================================
   Phase 1, Steps 6 & 7 — Post-Execution immutable ledger.
   The Offtaker has confirmed execution; this screen presents the
   deterministic settlement pipeline as a mission-control state
   machine: Asset & Custody Registry, Fedwire Instructions, and
   a strict Settlement State Timeline.
   ================================================================ */

import { CheckCircle2, Lock, Radio, Radar } from "lucide-react";
import Link from "next/link";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK ORDER DATA (mirrors checkout)
   ---------------------------------------------------------------- */
const ORDER = {
  orderId: "ORD-8842-XAU",
  status: "AWAITING_FUNDS",
  rail: "FEDWIRE",
  asset: "400 oz LBMA Good Delivery Bar",
  quantity: 10,
  totalWeightOz: 4_000,
  fineness: "≥995.0",
  custody: "Allocated Vaulting (Zurich — Malca-Amit)",
  totalNotional: 10_610_600.0,
  offtakerEntity: "Aureus Capital Partners Ltd.",
};

const WIRE_INSTRUCTIONS = {
  receivingInstitution: "Column N.A.",
  abaRouting: "121000248",
  beneficiary: `AurumShield Institutional Escrow FBO ${ORDER.offtakerEntity}`,
  virtualAccount: "•••• •••• 8842",
  amount: ORDER.totalNotional,
  reference: ORDER.orderId,
};

/* ----------------------------------------------------------------
   SETTLEMENT TIMELINE STEPS
   ---------------------------------------------------------------- */
type StepStatus = "completed" | "active" | "locked";

interface TimelineStep {
  id: number;
  label: string;
  subtext: string;
  status: StepStatus;
}

const TIMELINE: TimelineStep[] = [
  {
    id: 1,
    label: "Order Placed & Price Locked",
    subtext: "Execution confirmed at locked spot + premium.",
    status: "completed",
  },
  {
    id: 2,
    label: "Escrow Instructions Issued",
    subtext: "Fedwire routing packet dispatched to Offtaker.",
    status: "completed",
  },
  {
    id: 3,
    label: "Fedwire Funds Received",
    subtext: "Monitoring Column FBO virtual account.",
    status: "active",
  },
  {
    id: 4,
    label: "Cryptographic Title Minted",
    subtext: "Immutable proof-of-ownership token issued on settlement.",
    status: "locked",
  },
  {
    id: 5,
    label: "Physical Allocation Confirmed",
    subtext: "Vault allocation receipt from Malca-Amit (Zurich).",
    status: "locked",
  },
];

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
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono flex items-center gap-2 w-fit">
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
export default function SettlementLedgerPage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-7xl mx-auto p-8 pt-12">
        {/* ════════════════════════════════════════════════════════
            HEADER RIBBON
            ════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border-b border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="font-mono text-slate-500 uppercase text-xs tracking-[0.3em] block mb-2">
              Settlement Ledger
            </span>
            <HashBadge value={ORDER.orderId} />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 font-mono px-3 py-1 text-sm whitespace-nowrap">
            STATUS: {ORDER.status} ({ORDER.rail})
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            3-COLUMN LEDGER GRID
            ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ──────────────────────────────────────────────────────
              COLUMN 1 — Asset & Custody Registry
              ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 h-full">
              <span className="font-mono text-gold-primary text-xs tracking-[0.2em] uppercase block mb-5">
                Reserved Allocation
              </span>

              <div className="space-y-3">
                <LedgerField
                  label="Instrument"
                  value={`${ORDER.quantity}x ${ORDER.asset}`}
                />
                <LedgerField
                  label="Total Weight"
                  value={`${fmt(ORDER.totalWeightOz, 0)} troy oz`}
                  mono
                />
                <LedgerField label="Fineness" value={ORDER.fineness} mono />
                <LedgerField label="Custody" value={ORDER.custody} />
              </div>

              {/* Notional Value */}
              <div className="border-t border-slate-800 mt-6 pt-5">
                <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">
                  Notional Value
                </span>
                <span className="font-mono text-2xl text-white font-bold tabular-nums block">
                  ${fmt(ORDER.totalNotional)}
                </span>
              </div>

              {/* ── Logistics Radar Entry Point ── */}
              <div className="border-t border-slate-800 mt-6 pt-5">
                <Link href={`/offtaker/orders/ORD-8842-XAU/logistics`}>
                  <button
                    type="button"
                    className="w-full relative group cursor-pointer"
                  >
                    {/* Animated glow border */}
                    <div className="absolute -inset-px bg-linear-to-r from-cyan-500 via-gold-primary to-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
                    <div className="relative bg-slate-950 border border-transparent px-4 py-3 flex items-center justify-center gap-3">
                      <Radar className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="font-mono text-xs text-cyan-400 font-bold tracking-[0.2em] uppercase">
                        Initiate Logistics Radar
                      </span>
                    </div>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────
              COLUMN 2 — Wire Instructions (Mission Control)
              ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 h-full flex flex-col">
              <span className="font-mono text-slate-400 text-xs tracking-[0.2em] uppercase block mb-5">
                Pending Inbound Transfer
              </span>

              <div className="space-y-4 flex-1">
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
                    ${fmt(WIRE_INSTRUCTIONS.amount)}
                  </span>
                </div>
              </div>

              {/* RTGS Warning */}
              <div className="bg-slate-800/50 border border-slate-700 p-3 mt-5">
                <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                  Awaiting webhook confirmation from Federal Reserve RTGS.
                </p>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────
              COLUMN 3 — Settlement State Timeline
              ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 h-full">
              <span className="font-mono text-slate-400 text-xs tracking-[0.2em] uppercase block mb-6">
                Settlement State Machine
              </span>

              <div className="relative ml-3">
                {/* Vertical border line */}
                <div className="absolute left-[5px] top-0 bottom-0 border-l border-slate-700" />

                <div className="space-y-6">
                  {TIMELINE.map((step) => (
                    <TimelineNode key={step.id} step={step} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="mt-12 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · Fedwire RTGS · LBMA Good Delivery ·
          Immutable Settlement Ledger
        </p>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ================================================================
   INLINE HELPERS
   ================================================================ */

/* ── Ledger Field ── */
function LedgerField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
        {label}
      </span>
      <span
        className={`font-mono text-sm text-right text-white ${
          mono ? "tabular-nums" : ""
        }`}
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

/* ── Timeline Node ── */
function TimelineNode({ step }: { step: TimelineStep }) {
  const isLocked = step.status === "locked";

  return (
    <div
      className={`relative pl-6 ${
        isLocked
          ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]"
          : ""
      }`}
    >
      {/* Dot / Icon */}
      <div className="absolute left-0 top-[3px] flex items-center justify-center">
        {step.status === "completed" && (
          <CheckCircle2 className="h-[11px] w-[11px] text-emerald-500" />
        )}
        {step.status === "active" && (
          <span className="relative flex h-[11px] w-[11px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-primary opacity-75" />
            <Radio className="relative inline-flex h-[11px] w-[11px] text-gold-primary" />
          </span>
        )}
        {step.status === "locked" && (
          <Lock className="h-[11px] w-[11px] text-slate-700" />
        )}
      </div>

      {/* Text */}
      <div>
        <span
          className={`font-mono text-xs block leading-tight ${
            step.status === "completed"
              ? "text-slate-500"
              : step.status === "active"
                ? "text-white font-semibold"
                : "text-slate-700"
          }`}
        >
          {step.label}
        </span>
        <span
          className={`font-mono text-[10px] block mt-1 leading-snug ${
            step.status === "active" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          {step.subtext}
        </span>
      </div>
    </div>
  );
}
