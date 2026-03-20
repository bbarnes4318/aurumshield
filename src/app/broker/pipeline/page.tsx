"use client";

/* ================================================================
   BROKER DEAL PIPELINE — Active Transaction Management
   ================================================================
   Dense data table of all brokered DvP deals with status tracking,
   counterparty info, and settlement progress.
   ================================================================ */

import Link from "next/link";

/* ── Mock pipeline data ── */
const MOCK_PIPELINE = [
  { id: "BRK-001", buyer: "Aurelia Sovereign Fund",    seller: "Perth Mint",              bars: 12, weightOz: 4800,  notionalUsd: 12_734_400, feeBps: 50,  status: "AWAITING FUNDING",  statusColor: "text-yellow-400", created: "2026-03-18" },
  { id: "BRK-002", buyer: "Meridian Capital Partners",  seller: "Valcambi SA",             bars: 3,  weightOz: 1200,  notionalUsd: 3_183_600,  feeBps: 35,  status: "IN TRANSIT",         statusColor: "text-blue-400",    created: "2026-03-17" },
  { id: "BRK-003", buyer: "Pacific Bullion Trust",      seller: "Argor-Heraeus",           bars: 8,  weightOz: 3200,  notionalUsd: 8_489_600,  feeBps: 45,  status: "CLEARING",           statusColor: "text-emerald-400", created: "2026-03-16" },
  { id: "BRK-004", buyer: "Nordic Reserve AG",          seller: "Rand Refinery",           bars: 5,  weightOz: 2000,  notionalUsd: 5_306_000,  feeBps: 50,  status: "AWAITING FUNDING",   statusColor: "text-yellow-400",  created: "2026-03-15" },
  { id: "BRK-005", buyer: "Caspian Trade Finance",      seller: "PAMP SA",                 bars: 20, weightOz: 8000,  notionalUsd: 21_224_000, feeBps: 40,  status: "ESCROW OPEN",        statusColor: "text-amber-400",   created: "2026-03-14" },
  { id: "BRK-006", buyer: "Emirates Gold DMCC",         seller: "Royal Canadian Mint",     bars: 2,  weightOz: 800,   notionalUsd: 2_122_400,  feeBps: 50,  status: "SETTLED",            statusColor: "text-slate-500",   created: "2026-03-12" },
  { id: "BRK-007", buyer: "Helvetia Heritage SA",       seller: "Metalor Technologies",    bars: 6,  weightOz: 2400,  notionalUsd: 6_367_200,  feeBps: 30,  status: "IN TRANSIT",         statusColor: "text-blue-400",    created: "2026-03-10" },
  { id: "BRK-008", buyer: "Shanghai Gold Exchange",     seller: "Tanaka Kikinzoku",        bars: 15, weightOz: 6000,  notionalUsd: 15_918_000, feeBps: 25,  status: "CLEARING",           statusColor: "text-emerald-400", created: "2026-03-08" },
] as const;

const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function BrokerPipelinePage() {
  const active = MOCK_PIPELINE.filter((d) => d.status !== "SETTLED").length;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            Deal Pipeline
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            {active} active &middot; {MOCK_PIPELINE.length} total deals
          </p>
        </div>
        <Link
          href="/broker"
          className="px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          + Structure New Deal
        </Link>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm">
            <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="text-left px-4 py-2 font-medium">Deal</th>
              <th className="text-left px-4 py-2 font-medium">Buyer</th>
              <th className="text-left px-4 py-2 font-medium">Seller</th>
              <th className="text-right px-4 py-2 font-medium">Bars</th>
              <th className="text-right px-4 py-2 font-medium">Notional</th>
              <th className="text-right px-4 py-2 font-medium">Fee (bps)</th>
              <th className="text-right px-4 py-2 font-medium">Commission</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PIPELINE.map((deal) => {
              const commission = (deal.notionalUsd * deal.feeBps) / 10_000;
              return (
                <tr key={deal.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-amber-400/80">{deal.id}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-300">{deal.buyer}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-400">{deal.seller}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">{deal.bars}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-200">{fmtUsd(deal.notionalUsd)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">{deal.feeBps}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-400">{fmtUsd(commission)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${deal.statusColor}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{deal.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
