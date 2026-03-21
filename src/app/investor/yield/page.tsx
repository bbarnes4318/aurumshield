"use client";

/* ================================================================
   YIELD & REVENUE — LP Telemetry Terminal
   ================================================================
   Revenue decomposition dashboard for Limited Partners.
   ZERO-SCROLL: absolute inset-0, all content fits viewport.
   ================================================================ */

import { useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Percent,
  BarChart3,
  Layers,
} from "lucide-react";

/* ── MOCK DATA ── */

const REVENUE_KPIS = [
  { id: "total-rev", label: "30-Day Gross Revenue", value: "$2.16M", sub: "482 settlements", change: "+18.4%", positive: true, icon: DollarSign },
  { id: "net-rev",   label: "Net Revenue",          value: "$1.89M", sub: "87.5% margin",     change: "+16.1%", positive: true, icon: TrendingUp },
  { id: "avg-fee",   label: "Avg Fee / Settlement",  value: "$4,481", sub: "18 bps effective",  change: "+$120",  positive: true, icon: Percent },
  { id: "recurring", label: "Recurring Custody Fees", value: "$340K",  sub: "monthly vault",    change: "+8.2%",  positive: true, icon: Layers },
] as const;

interface WaterfallRow { label: string; bps: number; cumBps: number; color: string }
const WATERFALL: WaterfallRow[] = [
  { label: "Wholesale Sourcing Spread", bps: 45, cumBps: 45, color: "bg-cyan-500" },
  { label: "Indemnification Fee",       bps: 25, cumBps: 70, color: "bg-emerald-500" },
  { label: "Settlement Rail Fee",       bps: 12, cumBps: 82, color: "bg-amber-500" },
  { label: "Custody & Vault Charge",    bps: 8,  cumBps: 90, color: "bg-violet-500" },
  { label: "Insurance Surcharge",       bps: 5,  cumBps: 95, color: "bg-rose-500" },
  { label: "Add-On Services",           bps: 3,  cumBps: 98, color: "bg-sky-500" },
];
const MAX_BPS = 100;

interface MonthRevenue { month: string; grossK: number; netK: number; settlements: number }
const MONTHLY_TREND: MonthRevenue[] = [
  { month: "Oct 2025", grossK: 980,  netK: 840,  settlements: 218 },
  { month: "Nov 2025", grossK: 1120, netK: 960,  settlements: 251 },
  { month: "Dec 2025", grossK: 890,  netK: 760,  settlements: 199 },
  { month: "Jan 2026", grossK: 1340, netK: 1170, settlements: 302 },
  { month: "Feb 2026", grossK: 1780, netK: 1560, settlements: 398 },
  { month: "Mar 2026", grossK: 2160, netK: 1890, settlements: 482 },
];
const maxGrossK = Math.max(...MONTHLY_TREND.map((m) => m.grossK));

interface RevenueCategory { category: string; amountK: number; pct: number; color: string }
const REV_CATEGORIES: RevenueCategory[] = [
  { category: "Sourcing Spread",     amountK: 990, pct: 45.8, color: "bg-cyan-500" },
  { category: "Indemnification",     amountK: 540, pct: 25.0, color: "bg-emerald-500" },
  { category: "Settlement Rail",     amountK: 259, pct: 12.0, color: "bg-amber-500" },
  { category: "Custody & Vault",     amountK: 173, pct: 8.0,  color: "bg-violet-500" },
  { category: "Insurance",           amountK: 108, pct: 5.0,  color: "bg-rose-500" },
  { category: "Add-On Services",     amountK: 90,  pct: 4.2,  color: "bg-sky-500" },
];

/* ── PAGE ── */

export default function YieldRevenuePage() {
  const barData = useMemo(() => MONTHLY_TREND, []);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-3 gap-2">
      {/* ── KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-2">
        {REVENUE_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center shrink-0">
                <Icon className="h-3 w-3 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium truncate">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-bold text-white tabular-nums">{kpi.value}</span>
                  <span className={`font-mono text-[9px] font-semibold tabular-nums ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BODY: 2-column ── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-2">
        {/* LEFT COL — Waterfall + Monthly Trend */}
        <div className="col-span-8 flex flex-col gap-2 min-h-0">
          {/* Fee Waterfall */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 shrink-0">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Revenue Waterfall</span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {WATERFALL.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 text-[10px] text-slate-400 text-right truncate">{row.label}</span>
                  <div className="flex-1 h-3.5 bg-slate-800 rounded-sm overflow-hidden relative">
                    <div className={`absolute inset-y-0 left-0 ${row.color} rounded-sm`} style={{ width: `${(row.cumBps / MAX_BPS) * 100}%` }} />
                  </div>
                  <span className="w-14 shrink-0 font-mono text-[10px] text-white font-semibold tabular-nums text-right">+{row.bps} bps</span>
                  <span className="w-10 shrink-0 font-mono text-[9px] text-slate-500 tabular-nums text-right">Σ {row.cumBps}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <span className="w-40 shrink-0 text-[10px] text-white font-semibold text-right">Total Gross Margin</span>
                <div className="flex-1 h-3.5 bg-slate-800 rounded-sm overflow-hidden">
                  <div className="h-full bg-linear-to-r from-cyan-500 via-emerald-500 to-amber-500 rounded-sm" style={{ width: "98%" }} />
                </div>
                <span className="w-14 shrink-0 font-mono text-[10px] text-cyan-400 font-bold tabular-nums text-right">98 bps</span>
                <span className="w-10 shrink-0" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue Trend */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 flex-1 min-h-0 flex flex-col">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">6-Month Revenue Trend</span>
              </div>
              <div className="flex items-center gap-3 text-[9px]">
                <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-cyan-500" /><span className="text-slate-500">Gross</span></div>
                <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-emerald-500" /><span className="text-slate-500">Net</span></div>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-3 py-2 flex flex-col">
              <div className="flex items-end gap-1.5 flex-1 min-h-0">
                {barData.map((m) => (
                  <div key={m.month} className="flex-1 flex gap-0.5 items-end h-full">
                    <div className="flex-1 bg-cyan-500/30 rounded-t-[2px]" style={{ height: `${(m.grossK / maxGrossK) * 100}%` }} title={`Gross: $${m.grossK}K`} />
                    <div className="flex-1 bg-emerald-500/40 rounded-t-[2px]" style={{ height: `${(m.netK / maxGrossK) * 100}%` }} title={`Net: $${m.netK}K`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1 shrink-0">
                {barData.map((m) => (
                  <div key={m.month} className="flex-1 text-center">
                    <span className="font-mono text-[8px] text-slate-600">{m.month.split(" ")[0].substring(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL — Revenue by Category + Monthly Table */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          {/* Revenue by Category */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 shrink-0">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
              <Layers className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Revenue by Category</span>
            </div>
            <div className="px-3 pt-2 pb-1">
              <div className="h-3 w-full rounded-sm overflow-hidden flex">
                {REV_CATEGORIES.map((cat) => (
                  <div key={cat.category} className={`${cat.color}`} style={{ width: `${cat.pct}%` }} title={`${cat.category}: $${cat.amountK}K`} />
                ))}
              </div>
            </div>
            <div className="px-3 py-2 space-y-1">
              {REV_CATEGORIES.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-sm ${cat.color}`} />
                    <span className="text-[10px] text-slate-400">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white font-semibold tabular-nums">${cat.amountK.toLocaleString()}K</span>
                    <span className="font-mono text-[9px] text-slate-600 tabular-nums w-8 text-right">{cat.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Detail Table */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 flex-1 min-h-0 flex flex-col">
            <div className="border-b border-slate-800 px-3 py-1.5 shrink-0">
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Monthly Detail</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-left border-b border-slate-800">
                    <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Month</th>
                    <th className="px-2 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Gross</th>
                    <th className="px-2 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Net</th>
                    <th className="px-2 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Margin</th>
                    <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">#</th>
                  </tr>
                </thead>
                <tbody>
                  {barData.map((m) => (
                    <tr key={m.month} className="border-t border-slate-800/30">
                      <td className="px-3 py-1 text-slate-300">{m.month}</td>
                      <td className="px-2 py-1 font-mono text-white font-semibold text-right tabular-nums">${m.grossK.toLocaleString()}K</td>
                      <td className="px-2 py-1 font-mono text-emerald-400 text-right tabular-nums">${m.netK.toLocaleString()}K</td>
                      <td className="px-2 py-1 font-mono text-slate-400 text-right tabular-nums">{((m.netK / m.grossK) * 100).toFixed(1)}%</td>
                      <td className="px-3 py-1 font-mono text-slate-500 text-right tabular-nums">{m.settlements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
