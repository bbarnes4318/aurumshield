"use client";

/* ================================================================
   BROKER DEAL PIPELINE — Kanban Stage Board
   ================================================================
   Visual pipeline management view. Deals are organized into
   vertical stage columns so brokers can track progression at a
   glance. Fundamentally different from the Command Center's
   summary-focused dashboard.

   Layout:
     ┌──────────────────────────────────────────────┐
     │  HEADER + PIPELINE STATS  (shrink-0)          │
     ├──────────────────────────────────────────────┤
     │  STAGE COLUMNS  (horizontal flex, each col   │
     │  scrolls independently, cards inside)         │
     └──────────────────────────────────────────────┘
   ================================================================ */

import { useState } from "react";
import Link from "next/link";

/* ── Stage definitions ── */
const STAGES = [
  { key: "ESCROW OPEN",       label: "Escrow Open",       color: "amber",   borderColor: "border-amber-500/30",   bgColor: "bg-amber-500/5",   textColor: "text-amber-400",   dotColor: "bg-amber-400" },
  { key: "AWAITING FUNDING",  label: "Awaiting Funding",  color: "yellow",  borderColor: "border-yellow-500/30",  bgColor: "bg-yellow-500/5",  textColor: "text-yellow-400",  dotColor: "bg-yellow-400" },
  { key: "CLEARING",          label: "Clearing",          color: "emerald", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/5", textColor: "text-emerald-400", dotColor: "bg-emerald-400" },
  { key: "IN TRANSIT",        label: "In Transit",        color: "blue",    borderColor: "border-blue-500/30",    bgColor: "bg-blue-500/5",    textColor: "text-blue-400",    dotColor: "bg-blue-400" },
  { key: "SETTLED",           label: "Settled",           color: "slate",   borderColor: "border-slate-700/50",   bgColor: "bg-slate-800/20",  textColor: "text-slate-500",   dotColor: "bg-slate-500" },
] as const;

/* ── Mock deal data (with richer detail for pipeline view) ── */
const MOCK_DEALS = [
  { id: "BRK-001", buyer: "Aurelia Sovereign Fund",     seller: "Perth Mint",           bars: 12, weightOz: 4800,  notionalUsd: 12_734_400, feeBps: 50, status: "AWAITING FUNDING",  daysInStage: 2,  escrowAgent: "Brink's London",       assignedTo: "J. Harrington" },
  { id: "BRK-002", buyer: "Meridian Capital Partners",   seller: "Valcambi SA",          bars: 3,  weightOz: 1200,  notionalUsd: 3_183_600,  feeBps: 35, status: "IN TRANSIT",        daysInStage: 1,  escrowAgent: "Loomis International", assignedTo: "S. Nakamura" },
  { id: "BRK-003", buyer: "Pacific Bullion Trust",       seller: "Argor-Heraeus",        bars: 8,  weightOz: 3200,  notionalUsd: 8_489_600,  feeBps: 45, status: "CLEARING",          daysInStage: 3,  escrowAgent: "Malca-Amit",           assignedTo: "J. Harrington" },
  { id: "BRK-004", buyer: "Nordic Reserve AG",           seller: "Rand Refinery",        bars: 5,  weightOz: 2000,  notionalUsd: 5_306_000,  feeBps: 50, status: "AWAITING FUNDING",  daysInStage: 5,  escrowAgent: "Brink's Zurich",       assignedTo: "A. Volkov" },
  { id: "BRK-005", buyer: "Caspian Trade Finance",       seller: "PAMP SA",              bars: 20, weightOz: 8000,  notionalUsd: 21_224_000, feeBps: 40, status: "ESCROW OPEN",       daysInStage: 1,  escrowAgent: "G4S Cash Solutions",   assignedTo: "S. Nakamura" },
  { id: "BRK-006", buyer: "Emirates Gold DMCC",          seller: "Royal Canadian Mint",   bars: 2,  weightOz: 800,   notionalUsd: 2_122_400,  feeBps: 50, status: "SETTLED",           daysInStage: 0,  escrowAgent: "Brink's Dubai",        assignedTo: "J. Harrington" },
  { id: "BRK-007", buyer: "Helvetia Heritage SA",        seller: "Metalor Technologies",  bars: 6,  weightOz: 2400,  notionalUsd: 6_367_200,  feeBps: 30, status: "IN TRANSIT",        daysInStage: 4,  escrowAgent: "Loomis International", assignedTo: "A. Volkov" },
  { id: "BRK-008", buyer: "Shanghai Gold Exchange",      seller: "Tanaka Kikinzoku",      bars: 15, weightOz: 6000,  notionalUsd: 15_918_000, feeBps: 25, status: "CLEARING",          daysInStage: 1,  escrowAgent: "Malca-Amit",           assignedTo: "S. Nakamura" },
  { id: "BRK-009", buyer: "Rand Refinery Ltd",           seller: "Perth Mint",            bars: 4,  weightOz: 1600,  notionalUsd: 4_244_800,  feeBps: 50, status: "ESCROW OPEN",       daysInStage: 3,  escrowAgent: "Brink's London",       assignedTo: "J. Harrington" },
  { id: "BRK-010", buyer: "Banco del Oro SA",            seller: "PAMP SA",               bars: 10, weightOz: 4000,  notionalUsd: 10_612_000, feeBps: 40, status: "AWAITING FUNDING",  daysInStage: 1,  escrowAgent: "G4S Cash Solutions",   assignedTo: "A. Volkov" },
] as const;

/* ── Formatters ── */
const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtOz = (v: number) =>
  new Intl.NumberFormat("en-US").format(v);
const fmtUsdShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return fmtUsd(v);
};

/* ── Stage-specific CTA labels ── */
const STAGE_ACTIONS: Record<string, string> = {
  "ESCROW OPEN":      "Fund Escrow",
  "AWAITING FUNDING":  "Chase Counterparty",
  "CLEARING":          "Verify Settlement",
  "IN TRANSIT":        "Track Shipment",
  "SETTLED":           "View Receipt",
};

/* ================================================================
   COMPONENT
   ================================================================ */

export default function BrokerPipelinePage() {
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  /* ── Pipeline stats ── */
  const activeDeals = MOCK_DEALS.filter((d) => d.status !== "SETTLED");
  const totalPipelineValue = activeDeals.reduce((s, d) => s + d.notionalUsd, 0);
  const totalCommission = activeDeals.reduce((s, d) => s + (d.notionalUsd * d.feeBps) / 10_000, 0);
  const avgDaysInStage = activeDeals.length
    ? (activeDeals.reduce((s, d) => s + d.daysInStage, 0) / activeDeals.length).toFixed(1)
    : "0";

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
              Deal Pipeline
            </h1>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Visual stage tracker &middot; {activeDeals.length} active deals
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Pipeline mini-stats */}
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Pipeline Value</p>
                <p className="text-sm font-mono font-semibold text-slate-200">{fmtUsdShort(totalPipelineValue)}</p>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-right">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Pending Commission</p>
                <p className="text-sm font-mono font-semibold text-emerald-400">{fmtUsdShort(totalCommission)}</p>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-right">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Avg Days / Stage</p>
                <p className="text-sm font-mono font-semibold text-slate-200">{avgDaysInStage}</p>
              </div>
            </div>

            <Link
              href="/broker/deals/new"
              className="px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              + New Deal
            </Link>
          </div>
        </div>
      </div>

      {/* ── Kanban Stage Columns ── */}
      <div className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
        {STAGES.map((stage) => {
          const stageDeals = MOCK_DEALS.filter((d) => d.status === stage.key);
          const stageValue = stageDeals.reduce((s, d) => s + d.notionalUsd, 0);

          return (
            <div
              key={stage.key}
              className={`flex flex-col min-w-[240px] flex-1 rounded border ${stage.borderColor} ${stage.bgColor}`}
            >
              {/* Column header */}
              <div className="shrink-0 px-3 py-2.5 border-b border-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${stage.dotColor}`} />
                    <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${stage.textColor}`}>
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">
                    {stageDeals.length}
                  </span>
                </div>
                {stageDeals.length > 0 && (
                  <p className="text-[9px] font-mono text-slate-600 mt-1">
                    {fmtUsdShort(stageValue)} total
                  </p>
                )}
              </div>

              {/* Scrollable deal cards */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                {stageDeals.length === 0 && (
                  <div className="flex items-center justify-center h-20">
                    <span className="text-[10px] font-mono text-slate-700 italic">No deals</span>
                  </div>
                )}

                {stageDeals.map((deal) => {
                  const commission = (deal.notionalUsd * deal.feeBps) / 10_000;
                  const isExpanded = expandedDeal === deal.id;
                  const isStale = deal.daysInStage >= 4;

                  return (
                    <div
                      key={deal.id}
                      className={[
                        "rounded border bg-slate-900/80 transition-all cursor-pointer",
                        isStale && stage.key !== "SETTLED"
                          ? "border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
                          : "border-slate-800/60",
                        isExpanded ? "ring-1 ring-amber-500/20" : "",
                      ].join(" ")}
                      onClick={() => setExpandedDeal(isExpanded ? null : deal.id)}
                    >
                      {/* Card header */}
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-amber-400/80 font-semibold">{deal.id}</span>
                          <span className="text-[9px] font-mono text-slate-600">
                            {deal.daysInStage}d
                            {isStale && stage.key !== "SETTLED" && (
                              <span className="text-red-400 ml-1">⚠</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 truncate">{deal.buyer}</p>
                        <p className="text-[10px] text-slate-500 truncate">↔ {deal.seller}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-200">{fmtUsdShort(deal.notionalUsd)}</span>
                          <span className="font-mono text-[10px] text-slate-500">{deal.bars} bars</span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/40 space-y-2">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Weight</p>
                              <p className="text-[11px] font-mono text-slate-300">{fmtOz(deal.weightOz)} oz</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Notional</p>
                              <p className="text-[11px] font-mono text-slate-300">{fmtUsd(deal.notionalUsd)}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Fee</p>
                              <p className="text-[11px] font-mono text-slate-300">{deal.feeBps} bps</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Commission</p>
                              <p className="text-[11px] font-mono text-emerald-400">{fmtUsd(commission)}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Escrow</p>
                              <p className="text-[11px] font-mono text-slate-300">{deal.escrowAgent}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-mono text-slate-600 uppercase">Broker</p>
                              <p className="text-[11px] font-mono text-slate-300">{deal.assignedTo}</p>
                            </div>
                          </div>

                          {/* Stage-specific action button */}
                          <button
                            className={`w-full mt-1 px-2 py-1.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors border ${
                              stage.key === "SETTLED"
                                ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                                : `${stage.borderColor} ${stage.textColor} hover:bg-slate-800`
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Wire to actual stage action handler
                            }}
                          >
                            {STAGE_ACTIONS[stage.key] ?? "View"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
