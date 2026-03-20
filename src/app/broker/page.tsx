"use client";

/* ================================================================
   BROKER COMMAND CENTER — Zero-Scroll Telemetry Terminal
   ================================================================
   High-density dashboard for broker intermediaries. No global scroll.

   Layout:
     ┌──────────────────────────────────────────────┐
     │  KPI ROW  (shrink-0)  — 4 metric cards       │
     ├────────────────────────┬─────────────────────┤
     │  DEAL PIPELINE (w-2/3) │ MARKET & ACTIONS    │
     │  internal-scroll table  │ (w-1/3)            │
     │                         │ XAU/USD + payouts  │
     └────────────────────────┴─────────────────────┘
   ================================================================ */

import Link from "next/link";
import { useGoldPrice, formatSpotPrice } from "@/hooks/use-gold-price";

/* ── Mock deal pipeline data ── */
const MOCK_DEALS = [
  { id: "BRK-001", counterparty: "Aurelia Sovereign Fund",   bars: 12, weightOz: 4800,  notional: 12_734_400, status: "AWAITING FUNDING",    statusColor: "text-yellow-400" },
  { id: "BRK-002", counterparty: "Meridian Capital Partners", bars: 3,  weightOz: 1200,  notional: 3_183_600,  status: "IN TRANSIT",          statusColor: "text-blue-400" },
  { id: "BRK-003", counterparty: "Pacific Bullion Trust",     bars: 8,  weightOz: 3200,  notional: 8_489_600,  status: "CLEARING",            statusColor: "text-emerald-400" },
  { id: "BRK-004", counterparty: "Nordic Reserve AG",         bars: 5,  weightOz: 2000,  notional: 5_306_000,  status: "AWAITING FUNDING",    statusColor: "text-yellow-400" },
  { id: "BRK-005", counterparty: "Caspian Trade Finance",     bars: 20, weightOz: 8000,  notional: 21_224_000, status: "ESCROW OPEN",         statusColor: "text-amber-400" },
  { id: "BRK-006", counterparty: "Emirates Gold DMCC",        bars: 2,  weightOz: 800,   notional: 2_122_400,  status: "SETTLED",             statusColor: "text-slate-500" },
  { id: "BRK-007", counterparty: "Helvetia Heritage SA",      bars: 6,  weightOz: 2400,  notional: 6_367_200,  status: "IN TRANSIT",          statusColor: "text-blue-400" },
  { id: "BRK-008", counterparty: "Shanghai Gold Exchange",    bars: 15, weightOz: 6000,  notional: 15_918_000, status: "CLEARING",            statusColor: "text-emerald-400" },
  { id: "BRK-009", counterparty: "Rand Refinery Ltd",         bars: 4,  weightOz: 1600,  notional: 4_244_800,  status: "AWAITING FUNDING",    statusColor: "text-yellow-400" },
  { id: "BRK-010", counterparty: "Banco del Oro SA",          bars: 10, weightOz: 4000,  notional: 10_612_000, status: "ESCROW OPEN",         statusColor: "text-amber-400" },
] as const;

/* ── Mock commission payouts ── */
const MOCK_PAYOUTS = [
  { id: "COM-001", deal: "BRK-006", amount: 5306.00,  date: "Mar 18" },
  { id: "COM-002", deal: "BRK-003", amount: 12_734.40, date: "Mar 17" },
  { id: "COM-003", deal: "BRK-002", amount: 7_959.00,  date: "Mar 15" },
  { id: "COM-004", deal: "BRK-008", amount: 15_918.00, date: "Mar 12" },
] as const;

/* ── Formatters ── */
const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const fmtOz = (v: number) =>
  new Intl.NumberFormat("en-US").format(v);

/* ── KPI definitions ── */
const useKpis = () => {
  const activeDealCount = MOCK_DEALS.filter((d) => d.status !== "SETTLED").length;
  const totalAum = MOCK_DEALS.reduce((s, d) => s + d.notional, 0);
  const commissionYield = MOCK_PAYOUTS.reduce((s, p) => s + p.amount, 0);
  const pendingClearances = MOCK_DEALS.filter((d) => d.status === "CLEARING").length;

  return [
    { label: "Active Deals",           value: String(activeDealCount), sub: `of ${MOCK_DEALS.length} total` },
    { label: "AUM",                    value: fmtUsd(totalAum),       sub: `${fmtOz(MOCK_DEALS.reduce((s, d) => s + d.weightOz, 0))} oz` },
    { label: "30-Day Commission Yield", value: fmtUsd(commissionYield), sub: `${MOCK_PAYOUTS.length} payouts` },
    { label: "Pending Clearances",     value: String(pendingClearances), sub: "awaiting settlement" },
  ] as const;
};

/* ================================================================
   COMPONENT
   ================================================================ */

export default function BrokerCommandCenter() {
  const kpis = useKpis();
  const gold = useGoldPrice();

  return (
    <div className="absolute inset-0 flex flex-col p-4 overflow-hidden gap-4">
      {/* ── TOP KPIs ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3"
          >
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
              {kpi.label}
            </p>
            <p className="mt-1.5 text-xl font-semibold font-mono text-slate-100 leading-none">
              {kpi.value}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ── LEFT: Deal Pipeline ── */}
        <div className="w-2/3 flex flex-col rounded border border-slate-800 bg-slate-900/40">
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
            <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              Live Deal Pipeline
            </h2>
            <span className="text-[10px] font-mono text-slate-600">
              {MOCK_DEALS.length} deals
            </span>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="text-left px-4 py-2 font-medium">Deal</th>
                  <th className="text-left px-4 py-2 font-medium">Counterparty</th>
                  <th className="text-right px-4 py-2 font-medium">Bars</th>
                  <th className="text-right px-4 py-2 font-medium">Weight</th>
                  <th className="text-right px-4 py-2 font-medium">Notional</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DEALS.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-amber-400/80">
                      {deal.id}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {deal.counterparty}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                      {deal.bars}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                      {fmtOz(deal.weightOz)} oz
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-200">
                      {fmtUsd(deal.notional)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${deal.statusColor}`}
                      >
                        {deal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Market & Action Telemetry ── */}
        <div className="w-1/3 flex flex-col gap-3">
          {/* XAU/USD Spot */}
          <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              XAU/USD Spot
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-slate-100">
                {gold.data ? formatSpotPrice(gold.data.spotPriceUsd) : "—"}
              </span>
              {gold.data && (
                <span
                  className={`text-xs font-mono font-semibold ${
                    gold.data.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {gold.data.change24h >= 0 ? "+" : ""}
                  {gold.data.change24h.toFixed(2)} ({gold.data.changePct24h.toFixed(2)}%)
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-600 font-mono">
              {gold.isLoading ? "Connecting…" : gold.data ? `Updated ${new Date(gold.data.updatedAt).toLocaleTimeString()}` : "—"}
            </p>
          </div>

          {/* Recent Commission Payouts */}
          <div className="flex-1 min-h-0 flex flex-col rounded border border-slate-800 bg-slate-900/40">
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-800">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Recent Commissions
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {MOCK_PAYOUTS.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/40"
                >
                  <div>
                    <p className="text-xs text-slate-300 font-mono">{payout.deal}</p>
                    <p className="text-[10px] text-slate-600">{payout.date}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-emerald-400">
                    +{fmtUsd(payout.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action */}
          <Link
            href="/broker/pipeline"
            className="shrink-0 flex items-center justify-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Structure New Deal
          </Link>
        </div>
      </div>
    </div>
  );
}
