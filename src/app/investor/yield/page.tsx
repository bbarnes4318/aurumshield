"use client";

/* ================================================================
   YIELD & REVENUE — LP Telemetry Terminal
   ================================================================
   Revenue decomposition dashboard for Limited Partners.
   Shows fee waterfall, revenue by category, monthly trend,
   and per-settlement unit economics.

   All financial figures: font-mono + tabular-nums.
   Typography: text-sm / text-xs. Max padding: p-4.
   ================================================================ */

import { useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Percent,
  ArrowUpDown,
  BarChart3,
  Layers,
} from "lucide-react";

/* ================================================================
   MOCK DATA
   ================================================================ */

const REVENUE_KPIS = [
  {
    id: "total-rev",
    label: "30-Day Gross Revenue",
    value: "$2.16M",
    sub: "from 482 settlements",
    change: "+18.4%",
    positive: true,
    icon: DollarSign,
  },
  {
    id: "net-rev",
    label: "Net Revenue (post-COGS)",
    value: "$1.89M",
    sub: "87.5% margin",
    change: "+16.1%",
    positive: true,
    icon: TrendingUp,
  },
  {
    id: "avg-fee",
    label: "Avg Fee Per Settlement",
    value: "$4,481",
    sub: "18 bps effective",
    change: "+$120",
    positive: true,
    icon: Percent,
  },
  {
    id: "recurring",
    label: "Recurring Custody Fees",
    value: "$340K",
    sub: "monthly vault storage",
    change: "+8.2%",
    positive: true,
    icon: Layers,
  },
] as const;

/** Revenue waterfall — cumulative margin per transaction */
interface WaterfallRow {
  label: string;
  bps: number;
  cumBps: number;
  color: string;
}

const WATERFALL: WaterfallRow[] = [
  { label: "Wholesale Sourcing Spread",   bps: 45,  cumBps: 45,  color: "bg-cyan-500"    },
  { label: "Indemnification Fee",          bps: 25,  cumBps: 70,  color: "bg-emerald-500" },
  { label: "Settlement Rail Fee",          bps: 12,  cumBps: 82,  color: "bg-amber-500"   },
  { label: "Custody & Vault Charge",       bps: 8,   cumBps: 90,  color: "bg-violet-500"  },
  { label: "Insurance Surcharge",          bps: 5,   cumBps: 95,  color: "bg-rose-500"    },
  { label: "Add-On Services",              bps: 3,   cumBps: 98,  color: "bg-sky-500"     },
];

const MAX_BPS = 100;

/** Monthly revenue trend */
interface MonthRevenue {
  month: string;
  grossK: number;
  netK: number;
  settlements: number;
}

const MONTHLY_TREND: MonthRevenue[] = [
  { month: "Oct 2025",  grossK: 980,  netK: 840,  settlements: 218 },
  { month: "Nov 2025",  grossK: 1120, netK: 960,  settlements: 251 },
  { month: "Dec 2025",  grossK: 890,  netK: 760,  settlements: 199 },
  { month: "Jan 2026",  grossK: 1340, netK: 1170, settlements: 302 },
  { month: "Feb 2026",  grossK: 1780, netK: 1560, settlements: 398 },
  { month: "Mar 2026",  grossK: 2160, netK: 1890, settlements: 482 },
];

const maxGrossK = Math.max(...MONTHLY_TREND.map((m) => m.grossK));

/** Top settlements by fee revenue */
interface TopSettlement {
  id: string;
  counterparty: string;
  notional: string;
  feeCaptured: string;
  effectiveBps: number;
  rail: string;
  date: string;
}

const TOP_SETTLEMENTS: TopSettlement[] = [
  { id: "STL-2026-0417", counterparty: "Meridian Capital Partners",    notional: "$230.0M", feeCaptured: "$41,400", effectiveBps: 18,  rail: "RTGS", date: "Mar 18" },
  { id: "STL-2026-0415", counterparty: "Pacific Bullion Trust",       notional: "$312.0M", feeCaptured: "$56,160", effectiveBps: 18,  rail: "RTGS", date: "Mar 20" },
  { id: "STL-2026-0419", counterparty: "Aurelia Sovereign Fund",      notional: "$125.0M", feeCaptured: "$22,500", effectiveBps: 18,  rail: "RTGS", date: "Mar 19" },
  { id: "STL-2026-0418", counterparty: "Helvetia Private Bank",       notional: "$89.5M",  feeCaptured: "$16,110", effectiveBps: 18,  rail: "WIRE", date: "Mar 19" },
  { id: "STL-2026-0416", counterparty: "Fjordbank Holding ASA",       notional: "$67.2M",  feeCaptured: "$12,096", effectiveBps: 18,  rail: "WIRE", date: "Mar 18" },
  { id: "STL-2026-0414", counterparty: "Nordström Reinsurance AG",    notional: "$54.8M",  feeCaptured: "$9,864",  effectiveBps: 18,  rail: "WIRE", date: "Mar 20" },
  { id: "STL-2026-0413", counterparty: "Caspian Trade Finance Ltd.",   notional: "$42.1M",  feeCaptured: "$7,578",  effectiveBps: 18,  rail: "WIRE", date: "Mar 17" },
  { id: "STL-2026-0412", counterparty: "Banco del Plata S.A.",        notional: "$33.6M",  feeCaptured: "$6,048",  effectiveBps: 18,  rail: "WIRE", date: "Mar 17" },
];

/** Revenue by category */
interface RevenueCategory {
  category: string;
  amountK: number;
  pct: number;
  color: string;
}

const REV_CATEGORIES: RevenueCategory[] = [
  { category: "Sourcing Spread",        amountK: 990,  pct: 45.8, color: "bg-cyan-500"    },
  { category: "Indemnification Fees",    amountK: 540,  pct: 25.0, color: "bg-emerald-500" },
  { category: "Settlement Rail Fees",    amountK: 259,  pct: 12.0, color: "bg-amber-500"   },
  { category: "Custody & Vault",         amountK: 173,  pct: 8.0,  color: "bg-violet-500"  },
  { category: "Insurance",              amountK: 108,  pct: 5.0,  color: "bg-rose-500"    },
  { category: "Add-On Services",        amountK: 90,   pct: 4.2,  color: "bg-sky-500"     },
];

/* ================================================================
   PAGE
   ================================================================ */

export default function YieldRevenuePage() {
  // Deterministic bar heights for monthly chart
  const barData = useMemo(() => MONTHLY_TREND, []);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── KPI Strip ── */}
      <div className="col-span-12 grid grid-cols-4 gap-3">
        {REVENUE_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-md border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-slate-800 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold text-white tabular-nums">{kpi.value}</span>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">{kpi.sub}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-mono text-[10px] font-semibold tabular-nums ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                <span className="text-[10px] text-slate-600">vs prior 30d</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
         LEFT COL — Waterfall + Monthly Trend (col-span-8)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-8 space-y-4">
        {/* ── Fee Waterfall ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Revenue Waterfall — Per-Transaction Margin Stack
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-600">
              Cumulative bps captured
            </span>
          </div>
          <div className="px-4 py-4 space-y-2.5">
            {WATERFALL.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-48 shrink-0 text-[11px] text-slate-400 text-right truncate">{row.label}</span>
                <div className="flex-1 h-5 bg-slate-800 rounded-sm overflow-hidden relative">
                  <div
                    className={`absolute inset-y-0 left-0 ${row.color} rounded-sm transition-all duration-700`}
                    style={{ width: `${(row.cumBps / MAX_BPS) * 100}%` }}
                  />
                  {/* Individual segment highlight */}
                  <div
                    className={`absolute inset-y-0 ${row.color} opacity-60 rounded-sm`}
                    style={{
                      left: `${((row.cumBps - row.bps) / MAX_BPS) * 100}%`,
                      width: `${(row.bps / MAX_BPS) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 font-mono text-[11px] text-white font-semibold tabular-nums text-right">
                  +{row.bps} bps
                </span>
                <span className="w-16 shrink-0 font-mono text-[10px] text-slate-500 tabular-nums text-right">
                  Σ {row.cumBps}
                </span>
              </div>
            ))}
            {/* Total bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
              <span className="w-48 shrink-0 text-[11px] text-white font-semibold text-right">Total Gross Margin</span>
              <div className="flex-1 h-5 bg-slate-800 rounded-sm overflow-hidden">
                <div className="h-full bg-linear-to-r from-cyan-500 via-emerald-500 to-amber-500 rounded-sm" style={{ width: "98%" }} />
              </div>
              <span className="w-16 shrink-0 font-mono text-[11px] text-cyan-400 font-bold tabular-nums text-right">
                98 bps
              </span>
              <span className="w-16 shrink-0" />
            </div>
          </div>
        </div>

        {/* ── Monthly Revenue Trend ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                6-Month Revenue Trend
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-cyan-500" />
                <span className="text-slate-500">Gross</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                <span className="text-slate-500">Net</span>
              </div>
            </div>
          </div>
          <div className="px-4 py-4">
            {/* Bar chart */}
            <div className="flex items-end gap-2 h-32">
              {barData.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: "100%" }}>
                    {/* Gross bar */}
                    <div
                      className="flex-1 bg-cyan-500/30 rounded-t-[2px] hover:bg-cyan-500/50 transition-colors"
                      style={{ height: `${(m.grossK / maxGrossK) * 100}%` }}
                      title={`Gross: $${m.grossK}K`}
                    />
                    {/* Net bar */}
                    <div
                      className="flex-1 bg-emerald-500/40 rounded-t-[2px] hover:bg-emerald-500/60 transition-colors"
                      style={{ height: `${(m.netK / maxGrossK) * 100}%` }}
                      title={`Net: $${m.netK}K`}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Labels */}
            <div className="flex gap-2 mt-2">
              {barData.map((m) => (
                <div key={m.month} className="flex-1 text-center">
                  <span className="font-mono text-[8px] text-slate-600">{m.month.split(" ")[0].substring(0, 3)}</span>
                </div>
              ))}
            </div>
            {/* Monthly detail table */}
            <div className="mt-4 border-t border-slate-800/50 pt-3">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Month</th>
                    <th className="pb-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Gross</th>
                    <th className="pb-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Net</th>
                    <th className="pb-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Margin</th>
                    <th className="pb-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Settlements</th>
                  </tr>
                </thead>
                <tbody>
                  {barData.map((m) => (
                    <tr key={m.month} className="border-t border-slate-800/30">
                      <td className="py-1.5 text-slate-300">{m.month}</td>
                      <td className="py-1.5 font-mono text-white font-semibold text-right tabular-nums">${m.grossK.toLocaleString()}K</td>
                      <td className="py-1.5 font-mono text-emerald-400 text-right tabular-nums">${m.netK.toLocaleString()}K</td>
                      <td className="py-1.5 font-mono text-slate-400 text-right tabular-nums">{((m.netK / m.grossK) * 100).toFixed(1)}%</td>
                      <td className="py-1.5 font-mono text-slate-500 text-right tabular-nums">{m.settlements.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         RIGHT COL — Revenue by Category + Top Settlements (col-span-4)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-4 space-y-4">
        {/* ── Revenue by Category ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Revenue by Category
            </span>
          </div>
          {/* Stacked bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="h-4 w-full rounded-sm overflow-hidden flex">
              {REV_CATEGORIES.map((cat) => (
                <div
                  key={cat.category}
                  className={`${cat.color} transition-all duration-500`}
                  style={{ width: `${cat.pct}%` }}
                  title={`${cat.category}: $${cat.amountK}K (${cat.pct}%)`}
                />
              ))}
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            {REV_CATEGORIES.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-sm ${cat.color}`} />
                  <span className="text-[11px] text-slate-400">{cat.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-white font-semibold tabular-nums">${cat.amountK.toLocaleString()}K</span>
                  <span className="font-mono text-[10px] text-slate-600 tabular-nums w-10 text-right">{cat.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Fee-Generating Settlements ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Top Fee Settlements
            </span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {TOP_SETTLEMENTS.map((s) => (
              <div key={s.id} className="px-4 py-2.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-cyan-400 font-semibold">{s.id}</span>
                  <span className="font-mono text-[10px] text-slate-600">{s.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 truncate mr-2">{s.counterparty}</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold tabular-nums shrink-0">{s.feeCaptured}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[9px] text-slate-600 tabular-nums">{s.notional}</span>
                  <span className="font-mono text-[9px] text-slate-700">·</span>
                  <span className={`font-mono text-[9px] font-bold tracking-wider ${s.rail === "RTGS" ? "text-amber-400/60" : "text-slate-600"}`}>{s.rail}</span>
                  <span className="font-mono text-[9px] text-slate-700">·</span>
                  <span className="font-mono text-[9px] text-slate-600 tabular-nums">{s.effectiveBps} bps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
