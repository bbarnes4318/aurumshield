"use client";

/* ================================================================
   BROKER DEAL PIPELINE — Dense Data Table + Live Transit Drawer
   ================================================================
   Flat, high-density table view of all brokered deals.
   Clickable rows open the LiveTransitDrawer for logistics tracking.

   Layout:
     ┌──────────────────────────────────────────────┐
     │  HEADER: 3 KPI Cards (shrink-0)              │
     ├──────────────────────────────────────────────┤
     │  DEAL TABLE (flex-1, internal scroll)         │
     │  Columns: Deal ID, Asset, Notional, Status,  │
     │           Last Ping                           │
     └──────────────────────────────────────────────┘
   ================================================================ */

import { useState } from "react";
import { LiveTransitDrawer } from "@/components/broker/LiveTransitDrawer";

/* ── Mock deal data with LBMA bars and Doré ── */
const MOCK_DEALS = [
  { id: "BRK-001", asset: "LBMA 400oz Good Delivery × 12",   notionalUsd: 12_734_400, status: "AWAITING FUNDING",  statusColor: "text-yellow-400",  feeBps: 50, escrowLocked: false, lastPing: "2 min ago" },
  { id: "BRK-002", asset: "LBMA 400oz Good Delivery × 3",    notionalUsd: 3_183_600,  status: "IN TRANSIT",         statusColor: "text-blue-400",    feeBps: 35, escrowLocked: true,  lastPing: "45 sec ago" },
  { id: "BRK-003", asset: "Unrefined Doré — 3,200 oz gross", notionalUsd: 8_489_600,  status: "CLEARING",           statusColor: "text-emerald-400", feeBps: 45, escrowLocked: true,  lastPing: "5 min ago" },
  { id: "BRK-004", asset: "LBMA 400oz Good Delivery × 5",    notionalUsd: 5_306_000,  status: "AWAITING FUNDING",   statusColor: "text-yellow-400",  feeBps: 50, escrowLocked: false, lastPing: "12 min ago" },
  { id: "BRK-005", asset: "LBMA 400oz Good Delivery × 20",   notionalUsd: 21_224_000, status: "ESCROW OPEN",        statusColor: "text-yellow-400",   feeBps: 40, escrowLocked: false, lastPing: "1 min ago" },
  { id: "BRK-006", asset: "LBMA 400oz Good Delivery × 2",    notionalUsd: 2_122_400,  status: "SETTLED",            statusColor: "text-slate-500",   feeBps: 50, escrowLocked: false, lastPing: "3 days ago" },
  { id: "BRK-007", asset: "Unrefined Doré — 2,400 oz gross", notionalUsd: 6_367_200,  status: "IN TRANSIT",         statusColor: "text-blue-400",    feeBps: 30, escrowLocked: true,  lastPing: "30 sec ago" },
  { id: "BRK-008", asset: "LBMA 400oz Good Delivery × 15",   notionalUsd: 15_918_000, status: "CLEARING",           statusColor: "text-emerald-400", feeBps: 25, escrowLocked: true,  lastPing: "8 min ago" },
  { id: "BRK-009", asset: "LBMA 400oz Good Delivery × 4",    notionalUsd: 4_244_800,  status: "ESCROW OPEN",        statusColor: "text-yellow-400",   feeBps: 50, escrowLocked: false, lastPing: "22 min ago" },
  { id: "BRK-010", asset: "Unrefined Doré — 4,000 oz gross", notionalUsd: 10_612_000, status: "AWAITING FUNDING",   statusColor: "text-yellow-400",  feeBps: 40, escrowLocked: false, lastPing: "6 min ago" },
] as const;

/* ── Formatters ── */
const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const fmtUsdShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return fmtUsd(v);
};

/* ================================================================
   COMPONENT
   ================================================================ */

export default function BrokerPipelinePage() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  /* ── KPI calculations ── */
  const activeDeals = MOCK_DEALS.filter((d) => d.status !== "SETTLED");
  const totalPipelineNotional = activeDeals.reduce((s, d) => s + d.notionalUsd, 0);
  const expectedCommission = activeDeals.reduce((s, d) => s + (d.notionalUsd * d.feeBps) / 10_000, 0);
  const pendingEscrowLocks = activeDeals.filter((d) => !d.escrowLocked).length;

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Header: 3 KPI Cards ── */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        {/* Total Pipeline Notional */}
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Total Pipeline Notional
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-100 leading-none tabular-nums">
            {fmtUsdShort(totalPipelineNotional)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">
            {activeDeals.length} active deals
          </p>
        </div>

        {/* Expected Commission */}
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Expected Commission (bps)
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-emerald-400 leading-none tabular-nums">
            {fmtUsdShort(expectedCommission)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">
            avg {(activeDeals.reduce((s, d) => s + d.feeBps, 0) / activeDeals.length).toFixed(0)} bps
          </p>
        </div>

        {/* Pending Escrow Locks */}
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Pending Escrow Locks
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-yellow-400 leading-none tabular-nums">
            {pendingEscrowLocks}
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">
            of {activeDeals.length} require funding
          </p>
        </div>
      </div>

      {/* ── Dense Data Table ── */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm font-mono">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
            <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="text-left px-4 py-2.5 font-medium">Deal ID</th>
              <th className="text-left px-4 py-2.5 font-medium">Asset</th>
              <th className="text-right px-4 py-2.5 font-medium">Notional</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-right px-4 py-2.5 font-medium">Last Ping</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DEALS.map((deal) => {
              const isSelected = selectedDealId === deal.id;

              return (
                <tr
                  key={deal.id}
                  className={[
                    "border-b border-slate-800/50 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-slate-800/50 ring-1 ring-inset ring-slate-600/30"
                      : "hover:bg-slate-900/50",
                  ].join(" ")}
                  onClick={() => setSelectedDealId(deal.id)}
                >
                  {/* Deal ID */}
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-semibold">
                    {deal.id}
                  </td>

                  {/* Asset */}
                  <td className="px-4 py-2.5 text-xs text-slate-300">
                    {deal.asset}
                  </td>

                  {/* Notional */}
                  <td className="px-4 py-2.5 text-right text-xs text-slate-200 tabular-nums">
                    {fmtUsd(deal.notionalUsd)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${deal.statusColor}`}
                    >
                      {deal.status}
                    </span>
                  </td>

                  {/* Last Ping */}
                  <td className="px-4 py-2.5 text-right text-[11px] text-slate-500">
                    {deal.lastPing}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Live Transit Drawer (slide-out) ── */}
      <LiveTransitDrawer
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
      />
    </div>
  );
}
