"use client";

/* ================================================================
   INVESTOR REPORTS — /investor/reports
   ================================================================
   Consolidated reports page combining yield & revenue data with
   systemic risk metrics. Two-panel split view.
   ================================================================ */

import { PieChart, ShieldCheck, AlertTriangle } from "lucide-react";

/* ── Mock yield/revenue data ── */
const YIELD_DATA = [
  { label: "Platform Fee Revenue (1% Sweep)", value: "$2.84M", period: "YTD 2026", trend: "+18.4%" },
  { label: "Settlement Volume", value: "$284.0M", period: "YTD 2026", trend: "+22.1%" },
  { label: "Avg. Premium Captured", value: "42 bps", period: "30-Day Avg", trend: "+3 bps" },
  { label: "Net Revenue Margin", value: "94.2%", period: "Current", trend: "+0.8%" },
] as const;

const REVENUE_BREAKDOWN = [
  { source: "Execution Fees (1% Sweep)", amount: 2_140_000, pct: 75.4 },
  { source: "Custodial Fees", amount: 380_000, pct: 13.4 },
  { source: "Transit & Insurance", amount: 220_000, pct: 7.7 },
  { source: "Premium Spread", amount: 100_000, pct: 3.5 },
] as const;

/* ── Mock risk data ── */
const RISK_METRICS = [
  { label: "Counterparty Risk Score", value: "LOW", color: "text-emerald-400", detail: "All counterparties KYC/AML verified" },
  { label: "Concentration Risk", value: "MODERATE", color: "text-yellow-400", detail: "Top 3 clients = 62% of volume" },
  { label: "Liquidity Coverage Ratio", value: "3.2x", color: "text-emerald-400", detail: "Above 2.5x minimum threshold" },
  { label: "Operational Risk Index", value: "LOW", color: "text-emerald-400", detail: "Zero settlement failures (90-day)" },
] as const;

const RISK_EVENTS = [
  { event: "Sanctions List Update — OFAC SDN", date: "Mar 20, 2026", severity: "INFO", color: "text-blue-400" },
  { event: "Counterparty CDD Renewal Required", date: "Mar 18, 2026", severity: "WARNING", color: "text-yellow-400" },
  { event: "Vault Insurance Policy Renewal", date: "Mar 15, 2026", severity: "INFO", color: "text-blue-400" },
  { event: "Concentration Limit Approaching (Dubai DMCC)", date: "Mar 12, 2026", severity: "CAUTION", color: "text-[#C6A86B]" },
] as const;

const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function InvestorReportsPage() {
  return (
    <div className="absolute inset-0 flex flex-col p-4 overflow-hidden gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Platform Reports
        </h1>
        <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider border border-slate-800 px-2 py-0.5">
          Read-Only
        </span>
      </div>

      {/* Two-Panel Split */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* ── LEFT: Yield & Revenue ── */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-[#C6A86B]" />
            <h2 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Yield & Revenue
            </h2>
          </div>

          {/* Yield KPIs */}
          <div className="grid grid-cols-2 gap-2">
            {YIELD_DATA.map((item) => (
              <div key={item.label} className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">
                  {item.label}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-lg font-mono font-bold text-white tabular-nums">{item.value}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">{item.trend}</span>
                </div>
                <p className="text-[9px] text-slate-600 font-mono mt-0.5">{item.period}</p>
              </div>
            ))}
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-3">
              Revenue Breakdown
            </h3>
            <div className="space-y-2.5">
              {REVENUE_BREAKDOWN.map((item) => (
                <div key={item.source} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{item.source}</span>
                      <span className="font-mono text-xs text-white tabular-nums">{fmtUsd(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C6A86B] rounded-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 w-12 text-right tabular-nums">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Systemic Risk ── */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Systemic Risk
            </h2>
          </div>

          {/* Risk Metrics */}
          <div className="space-y-2">
            {RISK_METRICS.map((metric) => (
              <div key={metric.label} className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{metric.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{metric.detail}</p>
                  </div>
                  <span className={`font-mono text-sm font-bold uppercase ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Risk Events */}
          <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-3">
              Recent Risk Events
            </h3>
            <div className="space-y-2">
              {RISK_EVENTS.map((evt, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-800/50 last:border-0">
                  <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${evt.color}`} />
                  <div className="flex-1">
                    <p className="text-xs text-slate-300">{evt.event}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`font-mono text-[9px] font-bold uppercase tracking-wider ${evt.color}`}>
                        {evt.severity}
                      </span>
                      <span className="font-mono text-[9px] text-slate-600">{evt.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
