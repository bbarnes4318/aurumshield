"use client";

/* ================================================================
   PRODUCER COMMAND CENTER UI — Client Component
   ================================================================
   Interactive dashboard UI for the Producer Command Center.
   Receives all data (mock or live) as props from the Server
   Component wrapper. Handles zero-state toggle (demo only).
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
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

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
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtUsd(value: number): string {
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/* ================================================================
   MOCK DATA — Preserved for demo/investor presentations
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
   COMPONENT
   ================================================================ */
export default function CommandCenterUI({
  inventory: liveInventory,
  settlements: liveSettlements,
  metrics: liveMetrics,
  isDemo,
}: CommandCenterUIProps) {
  /* Toggle between populated and empty state for demonstration */
  const [showZeroState, setShowZeroState] = useState(false);

  /* ── Dual-mode data resolution ── */
  const inventory = isDemo
    ? showZeroState
      ? []
      : MOCK_INVENTORY
    : liveInventory;

  const settlements = isDemo
    ? showZeroState
      ? []
      : MOCK_SETTLEMENTS
    : liveSettlements;

  const metrics = isDemo
    ? showZeroState
      ? ZERO_METRICS
      : MOCK_METRICS
    : liveMetrics;

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-7xl w-full mx-auto px-4 py-3">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Radio className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Producer Command Center
            </span>
            {isDemo && (
              <span className="ml-1 font-mono text-[8px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 tracking-wider uppercase">
                DEMO
              </span>
            )}
          </div>
          {/* Dev toggle for zero-state preview — only in demo mode */}
          {isDemo && (
            <button
              onClick={() => setShowZeroState(!showZeroState)}
              className="font-mono text-[9px] text-slate-700 hover:text-slate-400 tracking-wider uppercase transition-colors cursor-pointer"
            >
              [{showZeroState ? "SHOW DATA" : "SHOW ZERO-STATE"}]
            </button>
          )}
        </div>
        <h1 className="font-mono text-2xl text-white font-bold tracking-tight mb-1">
          Industrial Operations Overview
        </h1>
        <p className="font-mono text-[11px] text-slate-600 mb-3">
          REAL-TIME VAULTING · REFINERY PIPELINE · SETTLEMENT RADAR
        </p>

        {/* ════════════════════════════════════════════════════════
           METRICS STRIP (4 blocks)
           ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800 border border-slate-800 mb-3 shrink-0">
          <MetricBlock
            icon={<Vault className="h-4 w-4 text-emerald-400" />}
            label="Vaulted Good Delivery"
            value={`${fmtOz(metrics.vaultedGoodDeliveryOz)} oz`}
            accent="emerald"
          />
          <MetricBlock
            icon={<FlaskConical className="h-4 w-4 text-amber-400" />}
            label="Doré in Refinery (Est.)"
            value={`${fmtOz(metrics.doreInRefineryOz)} oz`}
            accent="amber"
          />
          <MetricBlock
            icon={<DollarSign className="h-4 w-4 text-gold-primary" />}
            label="Pending Capital Inbound"
            value={fmtUsd(metrics.pendingCapital)}
            accent="gold"
          />
          <MetricBlock
            icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
            label="YTD Cleared Capital"
            value={fmtUsd(metrics.ytdClearedCapital)}
            accent="emerald"
          />
        </div>

        {/* ════════════════════════════════════════════════════════
           ZERO STATE
           ════════════════════════════════════════════════════════ */}
        {inventory.length === 0 ? (
          <ZeroState />
        ) : (
          /* ════════════════════════════════════════════════════════
             TWO-COLUMN LAYOUT: Inventory Grid + Capital Radar
             ════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">

            {/* ─── INVENTORY & YIELD GRID (Left — 3/5) ─── */}
            <div className="xl:col-span-3">
              <div className="bg-slate-900 border border-slate-800">
                {/* Grid Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <h2 className="font-mono text-xs text-slate-400 tracking-[0.15em] uppercase">
                    Active Inventory
                  </h2>
                  <Link
                    href="/producer/inventory/new"
                    className="group flex items-center gap-2 bg-gold-primary/10 border border-gold-primary/30 px-3 py-1.5 hover:bg-gold-primary/20 transition-colors"
                  >
                    <Plus className="h-3 w-3 text-gold-primary" />
                    <span className="font-mono text-[10px] text-gold-primary font-bold tracking-wider uppercase">
                      Ingest New Asset
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-pulse" />
                  </Link>
                </div>

                {/* Dense Data Table */}
                <div className="overflow-x-auto flex-1 min-h-0 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left font-mono text-[9px] text-slate-600 tracking-wider uppercase px-4 py-3">
                          Asset ID
                        </th>
                        <th className="text-left font-mono text-[9px] text-slate-600 tracking-wider uppercase px-4 py-3">
                          Form
                        </th>
                        <th className="text-right font-mono text-[9px] text-slate-600 tracking-wider uppercase px-4 py-3">
                          Weight
                        </th>
                        <th className="text-left font-mono text-[9px] text-slate-600 tracking-wider uppercase px-4 py-3">
                          Status
                        </th>
                        <th className="text-right font-mono text-[9px] text-slate-600 tracking-wider uppercase px-4 py-3">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((asset) => (
                        <tr
                          key={asset.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Asset ID */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-white tracking-wide">
                              {asset.id}
                            </span>
                          </td>

                          {/* Form */}
                          <td className="px-4 py-3">
                            <span className={`font-mono text-[10px] tracking-wider uppercase ${
                              asset.form === "RAW_DORE"
                                ? "text-amber-400"
                                : "text-slate-400"
                            }`}>
                              {asset.form === "RAW_DORE" ? "RAW DORÉ" : "GOOD DELIVERY"}
                            </span>
                          </td>

                          {/* Weight */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-xs text-white tabular-nums">
                              {asset.estimated && (
                                <span className="text-amber-400/70 mr-1 text-[10px]">(Est)</span>
                              )}
                              {fmtOz(asset.weightOz)} oz
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3">
                            {asset.form === "RAW_DORE" ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span className="font-mono text-[9px] text-amber-400 tracking-wider uppercase font-bold">
                                  LBMA Refinery: Processing
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-bold">
                                  Vault Verified
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/producer/orders/${asset.id}/settlement${isDemo ? '?demo=active' : ''}`}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-gold-primary tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grid Footer */}
                <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
                    {inventory.length} Active Assets
                  </span>
                  <span className="font-mono text-[9px] text-slate-700 tracking-wider uppercase">
                    TOKEN_STANDARD: ERC-3643 · PROVENANCE: IMMUTABLE
                  </span>
                </div>
              </div>
            </div>

            {/* ─── INBOUND CAPITAL RADAR (Right — 2/5) ─── */}
            <div className="xl:col-span-2">
              <div className="bg-slate-900 border border-slate-800 h-full flex flex-col">
                {/* Radar Header */}
                <div className="p-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gold-primary animate-pulse" />
                    <h2 className="font-mono text-xs text-slate-400 tracking-[0.15em] uppercase">
                      Inbound Capital Radar
                    </h2>
                  </div>
                  <p className="font-mono text-[9px] text-slate-700 tracking-wider mt-1 uppercase">
                    Settlement Engine → Producer Payout Tracking
                  </p>
                </div>

                {/* Settlement List */}
                <div className="flex-1 divide-y divide-slate-800/50">
                  {settlements.map((s) => (
                    <Link
                      key={s.orderId}
                      href={`/producer/orders/${s.orderId}/settlement${isDemo ? '?demo=active' : ''}`}
                      className="block px-4 py-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      {/* Top row: Order + Amount */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs text-white tracking-wide">
                          {s.orderId}
                        </span>
                        <span className={`font-mono text-sm font-bold tabular-nums ${
                          s.rail === "FEDWIRE" ? "text-gold-primary" : "text-cyan-400"
                        }`}>
                          {fmtUsd(s.amount)}
                        </span>
                      </div>

                      {/* Bottom row: Rail + Status */}
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[9px] tracking-wider uppercase ${
                          s.rail === "FEDWIRE" ? "text-gold-primary/60" : "text-cyan-400/60"
                        }`}>
                          RAIL: {s.railLabel}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {(s.status === "IN_FLIGHT" || s.status === "BROADCASTED") && (
                            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                              s.rail === "FEDWIRE" ? "bg-gold-primary" : "bg-cyan-400"
                            }`} />
                          )}
                          <span className={`font-mono text-[9px] tracking-wider uppercase font-bold ${
                            s.status === "SETTLED"
                              ? "text-emerald-400"
                              : s.status === "IN_FLIGHT"
                                ? s.rail === "FEDWIRE" ? "text-gold-primary" : "text-cyan-400"
                                : s.rail === "FEDWIRE" ? "text-gold-primary/80" : "text-cyan-400/80"
                          }`}>
                            {s.status === "IN_FLIGHT" ? "IN FLIGHT" : s.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Radar Footer */}
                <div className="px-4 py-3 border-t border-slate-800 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
                        <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                          Fedwire
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                          USDT
                        </span>
                      </span>
                    </div>
                    <span className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
                      Column Bank · Turnkey MPC
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Producer Command Center · LBMA Fire-Assay Pipeline · Goldwire Settlement Engine
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (Inlined — no broken imports)
   ════════════════════════════════════════════════════════════════ */

/* ── Metric Block ── */
function MetricBlock({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "amber" | "gold";
}) {
  const borderAccent =
    accent === "emerald"
      ? "border-t-emerald-500/40"
      : accent === "amber"
        ? "border-t-amber-500/40"
        : "border-t-gold-primary/40";

  return (
    <div className={`bg-slate-900 p-5 border-t-2 ${borderAccent}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="font-mono text-xl text-white font-bold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

/* ── Zero State ── */
function ZeroState() {
  return (
    <div className="bg-slate-900 border border-slate-800 py-20 px-8 flex flex-col items-center justify-center text-center">
      {/* Imposing target icon */}
      <div className="h-20 w-20 border-2 border-dashed border-slate-700 flex items-center justify-center mb-8">
        <Target className="h-10 w-10 text-slate-600" />
      </div>

      <h2 className="font-mono text-lg text-white font-bold tracking-tight mb-3">
        No Active Inventory
      </h2>
      <p className="font-mono text-xs text-slate-500 max-w-md leading-relaxed mb-2">
        Your inventory registry is empty. Upload a certified Fire Assay Report
        to mint your first cryptographic title and register physical bullion
        on the AurumShield ledger.
      </p>
      <p className="font-mono text-[10px] text-slate-600 max-w-sm mb-8">
        Once minted, your Digital Twin (ERC-3643) becomes tradeable on the
        Goldwire Settlement Network.
      </p>

      <Link
        href="/producer/inventory/new"
        className="group flex items-center gap-2 bg-gold-primary text-slate-950 px-6 py-3 font-mono text-sm font-bold tracking-wider uppercase hover:bg-gold-hover transition-colors"
      >
        <Plus className="h-4 w-4" />
        Ingest First Asset
        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>

      <span className="font-mono text-[9px] text-slate-700 uppercase tracking-wider mt-4">
        ASSAY REPORT REQUIRED · VLM PARSER ENGAGED
      </span>
    </div>
  );
}
