"use client";

/* ================================================================
   PRODUCER COMMAND CENTER UI — Client Component
   ================================================================
   Zero-scroll viewport: absolute inset-0 flex flex-col overflow-hidden.
   Tables and lists use internal scrolling only.
   ================================================================ */

import { useState } from "react";
import Link from "next/link";
import {
  Vault,
  FlaskConical,
  DollarSign,
  TrendingUp,
  Plus,
  Target,
  ArrowUpRight,
  Eye,
  Radio,
} from "lucide-react";

/* ----------------------------------------------------------------
   TYPES
   ---------------------------------------------------------------- */
type AssetForm = "RAW_DORE" | "GOOD_DELIVERY";

export interface InventoryAsset {
  id: string;
  form: AssetForm;
  weightOz: number;
  estimated: boolean;
  status: "REFINERY_PROCESSING" | "VAULT_VERIFIED" | "IN_TRANSIT";
}

type PaymentRail = "FEDWIRE" | "USDT";
type SettlementStatus = "IN_FLIGHT" | "BROADCASTED" | "SETTLED" | "PENDING";

export interface Settlement {
  orderId: string;
  amount: number;
  rail: PaymentRail;
  railLabel: string;
  status: SettlementStatus;
}

export interface CommandCenterMetrics {
  vaultedGoodDeliveryOz: number;
  doreInRefineryOz: number;
  pendingCapital: number;
  ytdClearedCapital: number;
}

interface CommandCenterUIProps {
  inventory: InventoryAsset[];
  settlements: Settlement[];
  metrics: CommandCenterMetrics;
  isDemo: boolean;
}

/* ================================================================
   FORMATTERS
   ================================================================ */
function fmtOz(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtUsd(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ================================================================
   MOCK DATA
   ================================================================ */
const MOCK_INVENTORY: InventoryAsset[] = [
  { id: "AUR-GD-7721", form: "GOOD_DELIVERY", weightOz: 400.125, estimated: false, status: "VAULT_VERIFIED" },
  { id: "AUR-GD-7722", form: "GOOD_DELIVERY", weightOz: 399.870, estimated: false, status: "VAULT_VERIFIED" },
  { id: "AUR-DR-0094", form: "RAW_DORE", weightOz: 500.0, estimated: true, status: "REFINERY_PROCESSING" },
  { id: "AUR-GD-7723", form: "GOOD_DELIVERY", weightOz: 401.330, estimated: false, status: "VAULT_VERIFIED" },
  { id: "AUR-DR-0095", form: "RAW_DORE", weightOz: 320.0, estimated: true, status: "REFINERY_PROCESSING" },
  { id: "AUR-GD-7724", form: "GOOD_DELIVERY", weightOz: 400.000, estimated: false, status: "VAULT_VERIFIED" },
];

const MOCK_SETTLEMENTS: Settlement[] = [
  { orderId: "ORDER-8842", amount: 2_052_000, rail: "FEDWIRE", railLabel: "COLUMN (FEDWIRE)", status: "IN_FLIGHT" },
  { orderId: "ORDER-9910", amount: 500_000, rail: "USDT", railLabel: "TURNKEY MPC (USDT)", status: "BROADCASTED" },
  { orderId: "ORDER-8801", amount: 1_250_000, rail: "FEDWIRE", railLabel: "COLUMN (FEDWIRE)", status: "SETTLED" },
  { orderId: "ORDER-9001", amount: 780_000, rail: "USDT", railLabel: "TURNKEY MPC (USDT)", status: "IN_FLIGHT" },
  { orderId: "ORDER-8790", amount: 3_100_000, rail: "FEDWIRE", railLabel: "COLUMN (FEDWIRE)", status: "SETTLED" },
];

const MOCK_METRICS: CommandCenterMetrics = {
  vaultedGoodDeliveryOz: MOCK_INVENTORY
    .filter((a) => a.form === "GOOD_DELIVERY" && a.status === "VAULT_VERIFIED")
    .reduce((sum, a) => sum + a.weightOz, 0),
  doreInRefineryOz: MOCK_INVENTORY
    .filter((a) => a.form === "RAW_DORE" && a.status === "REFINERY_PROCESSING")
    .reduce((sum, a) => sum + a.weightOz, 0),
  pendingCapital: MOCK_SETTLEMENTS
    .filter((s) => s.status === "IN_FLIGHT" || s.status === "BROADCASTED")
    .reduce((sum, s) => sum + s.amount, 0),
  ytdClearedCapital: MOCK_SETTLEMENTS
    .filter((s) => s.status === "SETTLED")
    .reduce((sum, s) => sum + s.amount, 0),
};

const ZERO_METRICS: CommandCenterMetrics = {
  vaultedGoodDeliveryOz: 0,
  doreInRefineryOz: 0,
  pendingCapital: 0,
  ytdClearedCapital: 0,
};

/* ================================================================
   COMPONENT — ZERO-SCROLL VIEWPORT
   ================================================================ */
export default function CommandCenterUI({
  inventory: liveInventory,
  settlements: liveSettlements,
  metrics: liveMetrics,
  isDemo,
}: CommandCenterUIProps) {
  const [showZeroState, setShowZeroState] = useState(false);

  const inventory = isDemo ? (showZeroState ? [] : MOCK_INVENTORY) : liveInventory;
  const settlements = isDemo ? (showZeroState ? [] : MOCK_SETTLEMENTS) : liveSettlements;
  const metrics = isDemo ? (showZeroState ? ZERO_METRICS : MOCK_METRICS) : liveMetrics;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-3.5 w-3.5 text-[#C6A86B]" />
            <span className="font-mono text-[#C6A86B] text-[10px] tracking-[0.3em] uppercase">
              Producer Command Center
            </span>
            {isDemo && (
              <span className="font-mono text-[8px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 tracking-wider uppercase">
                DEMO
              </span>
            )}
          </div>
          {isDemo && (
            <button
              onClick={() => setShowZeroState(!showZeroState)}
              className="font-mono text-[9px] text-slate-700 hover:text-slate-400 tracking-wider uppercase transition-colors cursor-pointer"
            >
              [{showZeroState ? "SHOW DATA" : "SHOW ZERO-STATE"}]
            </button>
          )}
        </div>
      </div>

      {/* ── Metrics Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <MetricBlock
          icon={<Vault className="h-3.5 w-3.5 text-emerald-400" />}
          label="Vaulted Good Delivery"
          value={`${fmtOz(metrics.vaultedGoodDeliveryOz)} oz`}
          accent="emerald"
        />
        <MetricBlock
          icon={<FlaskConical className="h-3.5 w-3.5 text-slate-400" />}
          label="Doré in Refinery (Est.)"
          value={`${fmtOz(metrics.doreInRefineryOz)} oz`}
          accent="slate"
        />
        <MetricBlock
          icon={<DollarSign className="h-3.5 w-3.5 text-[#C6A86B]" />}
          label="Pending Capital Inbound"
          value={fmtUsd(metrics.pendingCapital)}
          accent="gold"
        />
        <MetricBlock
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          label="YTD Cleared Capital"
          value={fmtUsd(metrics.ytdClearedCapital)}
          accent="emerald"
        />
      </div>

      {/* ── Main Content — fills remaining viewport ── */}
      {inventory.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <ZeroState />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex gap-0">
          {/* ─── LEFT: Inventory Table (3/5) ─── */}
          <div className="flex-[3] flex flex-col border-r border-slate-800">
            {/* Table Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
              <h2 className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">
                Active Inventory
              </h2>
              <Link
                href="/producer/inventory/new"
                className="group flex items-center gap-1.5 bg-[#C6A86B]/10 border border-[#C6A86B]/30 px-2.5 py-1 hover:bg-[#C6A86B]/20 transition-colors"
              >
                <Plus className="h-3 w-3 text-[#C6A86B]" />
                <span className="font-mono text-[9px] text-[#C6A86B] font-bold tracking-wider uppercase">
                  Ingest New Asset
                </span>
              </Link>
            </div>

            {/* Column Headers */}
            <div className="shrink-0 grid grid-cols-12 gap-2 px-4 py-2 border-b border-slate-800 bg-black/40">
              <span className="col-span-3 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Asset ID</span>
              <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Form</span>
              <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Weight</span>
              <span className="col-span-3 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Status</span>
              <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Action</span>
            </div>

            {/* Scrollable Rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {inventory.map((asset) => (
                <div
                  key={asset.id}
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                >
                  <span className="col-span-3 font-mono text-xs text-white tracking-wide">{asset.id}</span>
                  <span className={`col-span-2 font-mono text-[10px] tracking-wider uppercase ${
                    asset.form === "RAW_DORE" ? "text-yellow-400" : "text-slate-400"
                  }`}>
                    {asset.form === "RAW_DORE" ? "RAW DORÉ" : "GOOD DELIVERY"}
                  </span>
                  <span className="col-span-2 font-mono text-xs text-white tabular-nums text-right">
                    {asset.estimated && <span className="text-slate-500 mr-1 text-[9px]">(Est)</span>}
                    {fmtOz(asset.weightOz)} oz
                  </span>
                  <span className="col-span-3">
                    {asset.form === "RAW_DORE" ? (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="font-mono text-[8px] text-yellow-400 tracking-wider uppercase font-bold">
                          Refinery: Processing
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="font-mono text-[8px] text-emerald-400 tracking-wider uppercase font-bold">
                          Vault Verified
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="col-span-2 text-right">
                    <Link
                      href={`/producer/orders/${asset.id}/settlement${isDemo ? '?demo=active' : ''}`}
                      className="inline-flex items-center gap-1 font-mono text-[9px] text-slate-500 hover:text-[#C6A86B] tracking-wider uppercase transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </span>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="shrink-0 px-4 py-2 border-t border-slate-800 flex items-center justify-between bg-black/40">
              <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
                {inventory.length} Active Assets
              </span>
              <span className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
                ERC-3643 · IMMUTABLE PROVENANCE
              </span>
            </div>
          </div>

          {/* ─── RIGHT: Capital Radar (2/5) ─── */}
          <div className="flex-[2] flex flex-col">
            {/* Radar Header */}
            <div className="shrink-0 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#C6A86B] animate-pulse" />
                <h2 className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">
                  Inbound Capital Radar
                </h2>
              </div>
              <p className="font-mono text-[8px] text-slate-700 tracking-wider mt-0.5 uppercase">
                Settlement Engine → Producer Payout Tracking
              </p>
            </div>

            {/* Scrollable Settlement List */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/50">
              {settlements.map((s) => (
                <Link
                  key={s.orderId}
                  href={`/producer/orders/${s.orderId}/settlement${isDemo ? '?demo=active' : ''}`}
                  className="block px-4 py-2.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-white tracking-wide">{s.orderId}</span>
                    <span className={`font-mono text-sm font-bold tabular-nums ${
                      s.rail === "FEDWIRE" ? "text-[#C6A86B]" : "text-cyan-400"
                    }`}>
                      {fmtUsd(s.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[8px] tracking-wider uppercase ${
                      s.rail === "FEDWIRE" ? "text-[#C6A86B]/60" : "text-cyan-400/60"
                    }`}>
                      RAIL: {s.railLabel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(s.status === "IN_FLIGHT" || s.status === "BROADCASTED") && (
                        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                          s.rail === "FEDWIRE" ? "bg-[#C6A86B]" : "bg-cyan-400"
                        }`} />
                      )}
                      <span className={`font-mono text-[9px] tracking-wider uppercase font-bold ${
                        s.status === "SETTLED"
                          ? "text-emerald-400"
                          : s.status === "IN_FLIGHT"
                            ? s.rail === "FEDWIRE" ? "text-[#C6A86B]" : "text-cyan-400"
                            : s.rail === "FEDWIRE" ? "text-[#C6A86B]/80" : "text-cyan-400/80"
                      }`}>
                        {s.status === "IN_FLIGHT" ? "IN FLIGHT" : s.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Radar Footer */}
            <div className="shrink-0 px-4 py-2 border-t border-slate-800 bg-black/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C6A86B]" />
                    <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">Fedwire</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">USDT</span>
                  </span>
                </div>
                <span className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
                  Column Bank · Turnkey MPC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

function MetricBlock({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "slate" | "gold";
}) {
  const borderAccent =
    accent === "emerald"
      ? "border-t-emerald-500/40"
      : accent === "slate"
        ? "border-t-slate-500/40"
        : "border-t-[#C6A86B]/40";

  return (
    <div className={`bg-slate-900 px-4 py-3 border-t-2 ${borderAccent}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="font-mono text-[8px] text-slate-500 tracking-wider uppercase">{label}</span>
      </div>
      <p className="font-mono text-lg text-white font-bold tabular-nums tracking-tight leading-none">
        {value}
      </p>
    </div>
  );
}

function ZeroState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8">
      <div className="h-16 w-16 border-2 border-dashed border-slate-700 flex items-center justify-center mb-6">
        <Target className="h-8 w-8 text-slate-600" />
      </div>
      <h2 className="font-mono text-lg text-white font-bold tracking-tight mb-2">
        No Active Inventory
      </h2>
      <p className="font-mono text-xs text-slate-500 max-w-md leading-relaxed mb-6">
        Upload a certified Fire Assay Report to mint your first cryptographic title
        and register physical bullion on the AurumShield ledger.
      </p>
      <Link
        href="/producer/inventory/new"
        className="group flex items-center gap-2 bg-[#C6A86B] text-slate-950 px-6 py-3 font-mono text-sm font-bold tracking-wider uppercase hover:bg-[#d4b94d] transition-colors"
      >
        <Plus className="h-4 w-4" />
        Ingest First Asset
        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  );
}
