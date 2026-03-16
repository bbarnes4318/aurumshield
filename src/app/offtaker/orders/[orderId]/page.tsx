"use client";

/* ================================================================
   SETTLEMENT LEDGER & FUNDING TRACKER
   ================================================================
   Post-Execution immutable ledger with 3-Tab Horizontal Navigation:
     Tab 1: Allocation — Asset & Custody Registry + Order Context
     Tab 2: Funding — Wire/USDT Instructions
     Tab 3: Timeline — Settlement State Machine

   Dual-Rail Support:
     - FEDWIRE: Bank wire instructions (Column FBO)
     - TURNKEY_USDT: QR code + copyable deposit address, 5s polling
   ================================================================ */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Lock, Radio, Radar, Copy, Shield, Landmark, CreditCard, Clock } from "lucide-react";
import Link from "next/link";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK ORDER DATA (mirrors checkout)
   ---------------------------------------------------------------- */
const ORDER = {
  orderId: "ORD-8842-XAU",
  settlementId: "stl-001",
  status: "AWAITING_FUNDS",
  rail: "FEDWIRE" as "FEDWIRE" | "TURNKEY_USDT",
  fundingRoute: "fedwire" as "fedwire" | "stablecoin",
  asset: "400 oz LBMA Good Delivery Bar",
  quantity: 10,
  totalWeightOz: 4_000,
  fineness: "≥995.0",
  custody: "Allocated Vaulting (Zurich — Malca-Amit)",
  totalNotional: 10_610_600.0,
  offtakerEntity: "Aureus Capital Partners Ltd.",
  depositAddress: null as string | null,
  fundsConfirmedFinal: false,
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

function getTimeline(rail: "FEDWIRE" | "TURNKEY_USDT"): TimelineStep[] {
  const isCrypto = rail === "TURNKEY_USDT";
  return [
    { id: 1, label: "Order Placed & Price Locked", subtext: "Execution confirmed at locked spot + premium.", status: "completed" },
    { id: 2, label: isCrypto ? "USDT Deposit Address Issued" : "Escrow Instructions Issued", subtext: isCrypto ? "Turnkey MPC wallet generated. Awaiting USDT transfer." : "Fedwire routing packet dispatched to Offtaker.", status: "completed" },
    { id: 3, label: isCrypto ? "USDT Deposit Received" : "Fedwire Funds Received", subtext: isCrypto ? "Monitoring Turnkey MPC wallet for inbound ERC-20 USDT." : "Monitoring Column FBO virtual account.", status: "active" },
    { id: 4, label: "Cryptographic Title Minted", subtext: "Immutable proof-of-ownership token issued on settlement.", status: "locked" },
    { id: 5, label: "Physical Allocation Confirmed", subtext: "Vault allocation receipt from Malca-Amit (Zurich).", status: "locked" },
  ];
}

/* ----------------------------------------------------------------
   CURRENCY FORMATTER
   ---------------------------------------------------------------- */
function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono flex items-center gap-2 w-fit">
      {value}
      <button onClick={handleCopy} className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer">
        {copied ? "[ COPIED ]" : "[ COPY ]"}
      </button>
    </span>
  );
}

/* ── QR Code Component (lightweight SVG-based) ── */
function DepositQRCode({ address }: { address: string }) {
  const chars = address.replace("0x", "");
  const gridSize = 21;
  const cellSize = 8;
  const svgSize = gridSize * cellSize;
  const cells: boolean[][] = [];
  for (let row = 0; row < gridSize; row++) {
    cells[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const idx = (row * gridSize + col) % chars.length;
      const charCode = chars.charCodeAt(idx);
      const isFinderPattern = (row < 7 && col < 7) || (row < 7 && col >= gridSize - 7) || (row >= gridSize - 7 && col < 7);
      if (isFinderPattern) {
        const localRow = row < 7 ? row : row - (gridSize - 7);
        const localCol = col < 7 ? col : col - (gridSize - 7);
        const isOuter = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const isInner = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        cells[row][col] = isOuter || isInner;
      } else {
        cells[row][col] = charCode % 3 !== 0;
      }
    }
  }
  return (
    <div className="bg-white p-3 inline-block">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {cells.map((row, rowIdx) =>
          row.map((filled, colIdx) =>
            filled ? <rect key={`${rowIdx}-${colIdx}`} x={colIdx * cellSize} y={rowIdx * cellSize} width={cellSize} height={cellSize} fill="black" /> : null,
          ),
        )}
      </svg>
    </div>
  );
}

/* ── Funds Confirmed Banner ── */
function FundsConfirmedBanner() {
  return (
    <div className="bg-emerald-950/50 border-2 border-emerald-500 p-4 animate-pulse">
      <div className="flex items-center gap-3 justify-center">
        <Shield className="h-5 w-5 text-emerald-400" />
        <span className="font-mono text-sm text-emerald-400 font-bold tracking-[0.2em] uppercase">
          BLOCKCHAIN CONFIRMATION: FUNDS SECURED
        </span>
        <Shield className="h-5 w-5 text-emerald-400" />
      </div>
      <p className="font-mono text-[10px] text-emerald-500/70 text-center mt-2">
        On-chain USDT deposit verified. Settlement advancing to title minting.
      </p>
    </div>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function SettlementLedgerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [fundsConfirmed, setFundsConfirmed] = useState(ORDER.fundsConfirmedFinal);
  const [timeline, setTimeline] = useState<TimelineStep[]>(getTimeline(ORDER.rail));

  /* ── Tab State ── */
  const [activeTab, setActiveTab] = useState<"allocation" | "funding" | "timeline">("allocation");

  const isCrypto = ORDER.rail === "TURNKEY_USDT";

  const TABS = [
    { id: "allocation" as const, label: "Allocation", icon: Landmark },
    { id: "funding" as const, label: isCrypto ? "USDT Deposit" : "Wire Instructions", icon: CreditCard },
    { id: "timeline" as const, label: "Settlement Timeline", icon: Clock },
  ];

  /* ── 5-Second Polling for USDT deposits ── */
  const pollSettlementStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/settlement-status/${ORDER.settlementId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.fundsConfirmedFinal && !fundsConfirmed) {
        setFundsConfirmed(true);
        setTimeline((prev) =>
          prev.map((step) => {
            if (step.id === 3) return { ...step, status: "completed" as StepStatus };
            if (step.id === 4) return { ...step, status: "active" as StepStatus };
            return step;
          }),
        );
      }
    } catch {
      // Silently fail — polling will retry
    }
  }, [fundsConfirmed]);

  const pollingActive = isCrypto && !fundsConfirmed;

  useEffect(() => {
    if (!isCrypto || fundsConfirmed) return;
    const interval = setInterval(pollSettlementStatus, 5000);
    return () => { clearInterval(interval); };
  }, [isCrypto, fundsConfirmed, pollSettlementStatus]);

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-7xl w-full mx-auto px-5 py-3">
        {/* ════════════════════════════════════════════════════════
            HEADER RIBBON
            ════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border-b border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] pb-4 mb-3 flex flex-col sm:flex-row justify-between items-start gap-3 shrink-0">
          <div>
            <span className="font-mono text-slate-500 uppercase text-xs tracking-[0.3em] block mb-2">
              Settlement Ledger
            </span>
            <HashBadge value={orderId} />
          </div>
          <div className="flex items-center gap-3">
            <div className={`border font-mono px-3 py-1 text-sm whitespace-nowrap ${
              fundsConfirmed
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : "bg-yellow-500/10 border-yellow-500/50 text-yellow-500"
            }`}>
              STATUS: {fundsConfirmed ? "FUNDS_CONFIRMED" : ORDER.status} ({isCrypto ? "USDT" : ORDER.rail})
            </div>
            {pollingActive && (
              <span className="font-mono text-[9px] text-cyan-400 flex items-center gap-1.5 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                POLLING
              </span>
            )}
          </div>
        </div>

        {/* ── Funds Confirmed Banner ── */}
        {isCrypto && fundsConfirmed && (
          <div className="mb-3 shrink-0">
            <FundsConfirmedBanner />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB BAR
            ════════════════════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center gap-0 border border-slate-800 bg-black mb-3">
          {TABS.map((tab, idx) => {
            const isActive = tab.id === activeTab;
            const isLast = idx === TABS.length - 1;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors cursor-pointer ${
                  !isLast ? "border-r border-slate-800" : ""
                } ${
                  isActive
                    ? "bg-gold-primary/10 text-gold-primary border-b-2 border-b-gold-primary"
                    : "text-slate-600 hover:text-slate-400 hover:bg-slate-900/50"
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════
            TAB CONTENT
            ════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 flex flex-col">

          {/* ── TAB: ALLOCATION ── */}
          {activeTab === "allocation" && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Asset & Custody Registry */}
              <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
                <span className="font-mono text-gold-primary text-xs tracking-[0.2em] uppercase block mb-5">
                  Reserved Allocation
                </span>
                <div className="space-y-3">
                  <LedgerField label="Instrument" value={`${ORDER.quantity}x ${ORDER.asset}`} />
                  <LedgerField label="Total Weight" value={`${fmt(ORDER.totalWeightOz, 0)} troy oz`} mono />
                  <LedgerField label="Fineness" value={ORDER.fineness} mono />
                  <LedgerField label="Custody" value={ORDER.custody} />
                </div>
                <div className="border-t border-slate-800 mt-6 pt-5">
                  <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">Notional Value</span>
                  <span className="font-mono text-2xl text-white font-bold tabular-nums block">${fmt(ORDER.totalNotional)}</span>
                </div>
                <div className="border-t border-slate-800 mt-6 pt-5">
                  <Link href={`/offtaker/orders/${orderId}/logistics`}>
                    <button type="button" className="w-full relative group cursor-pointer">
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

              {/* Order Context */}
              <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
                <span className="font-mono text-slate-400 text-xs tracking-[0.2em] uppercase block mb-5">Order Context</span>
                <div className="space-y-3">
                  <LedgerField label="Order ID" value={orderId} />
                  <LedgerField label="Offtaker" value={ORDER.offtakerEntity} />
                  <LedgerField label="Settlement Rail" value={isCrypto ? "TURNKEY_USDT" : "FEDWIRE"} />
                  <LedgerField label="Status" value={fundsConfirmed ? "FUNDS_CONFIRMED" : ORDER.status} />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: FUNDING ── */}
          {activeTab === "funding" && (
            <div className="flex-1 min-h-0">
              <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 h-full flex flex-col">
                <span className="font-mono text-slate-400 text-xs tracking-[0.2em] uppercase block mb-5">
                  {isCrypto ? "USDT Deposit Instructions" : "Pending Inbound Transfer"}
                </span>

                {isCrypto ? (
                  <div className="space-y-4 flex-1">
                    {ORDER.depositAddress && (
                      <div className="flex justify-center">
                        <DepositQRCode address={ORDER.depositAddress} />
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">Deposit Address (ERC-20 USDT)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white break-all">{ORDER.depositAddress ?? "Generating..."}</span>
                        {ORDER.depositAddress && (
                          <button
                            onClick={() => { if (ORDER.depositAddress) navigator.clipboard.writeText(ORDER.depositAddress); }}
                            className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <WireField label="Network" value="Ethereum Mainnet" />
                    <WireField label="Token" value="USDT (Tether)" />
                    <WireField label="Contract" value="0xdAC1...1ec7" />
                    <div className="border-t border-slate-800 pt-4 mt-4">
                      <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">Exact USDT Required</span>
                      <span className="font-mono text-2xl text-white font-bold tabular-nums block">{fmt(ORDER.totalNotional)} USDT</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/30 p-3 mt-2">
                      <p className="font-mono text-[10px] text-amber-500 leading-relaxed">
                        Send exactly the amount shown above. Partial deposits will be held pending. Only ERC-20 USDT on Ethereum mainnet is accepted.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    <WireField label="Receiving Institution" value={WIRE_INSTRUCTIONS.receivingInstitution} />
                    <WireField label="ABA Routing Number" value={WIRE_INSTRUCTIONS.abaRouting} />
                    <WireField label="Beneficiary" value={WIRE_INSTRUCTIONS.beneficiary} />
                    <WireField label="Virtual Account Number" value={WIRE_INSTRUCTIONS.virtualAccount} />
                    <WireField label="Reference / Memo" value={WIRE_INSTRUCTIONS.reference} />
                    <div className="border-t border-slate-800 pt-4 mt-4">
                      <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">Exact Settlement Amount</span>
                      <span className="font-mono text-2xl text-white font-bold tabular-nums block">${fmt(WIRE_INSTRUCTIONS.amount)}</span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-800/50 border border-slate-700 p-3 mt-5">
                  <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                    {isCrypto
                      ? "Monitoring Turnkey MPC wallet for inbound ERC-20 USDT. Auto-confirmation every 5 seconds."
                      : "Awaiting webhook confirmation from Federal Reserve RTGS."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: TIMELINE ── */}
          {activeTab === "timeline" && (
            <div className="flex-1 min-h-0">
              <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 h-full">
                <span className="font-mono text-slate-400 text-xs tracking-[0.2em] uppercase block mb-6">
                  Settlement State Machine
                </span>
                <div className="relative ml-3">
                  <div className="absolute left-[5px] top-0 bottom-0 border-l border-slate-700" />
                  <div className="space-y-6">
                    {timeline.map((step) => (
                      <TimelineNode key={step.id} step={step} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <p className="mt-3 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · {isCrypto ? "Turnkey MPC · ERC-20 USDT" : "Fedwire RTGS"} · LBMA Good Delivery ·
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
function LedgerField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">{label}</span>
      <span className={`font-mono text-sm text-right text-white ${mono ? "tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

/* ── Wire Instruction Field ── */
function WireField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">{label}</span>
      <span className="font-mono text-sm text-white block">{value}</span>
    </div>
  );
}

/* ── Timeline Node ── */
function TimelineNode({ step }: { step: TimelineStep }) {
  const isLocked = step.status === "locked";
  return (
    <div className={`relative pl-6 ${isLocked ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]" : ""}`}>
      <div className="absolute left-0 top-[3px] flex items-center justify-center">
        {step.status === "completed" && <CheckCircle2 className="h-[11px] w-[11px] text-emerald-500" />}
        {step.status === "active" && (
          <span className="relative flex h-[11px] w-[11px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-primary opacity-75" />
            <Radio className="relative inline-flex h-[11px] w-[11px] text-gold-primary" />
          </span>
        )}
        {step.status === "locked" && <Lock className="h-[11px] w-[11px] text-slate-700" />}
      </div>
      <div>
        <span className={`font-mono text-xs block leading-tight ${
          step.status === "completed" ? "text-slate-500" : step.status === "active" ? "text-white font-semibold" : "text-slate-700"
        }`}>
          {step.label}
        </span>
        <span className={`font-mono text-[10px] block mt-1 leading-snug ${step.status === "active" ? "text-slate-400" : "text-slate-600"}`}>
          {step.subtext}
        </span>
      </div>
    </div>
  );
}
