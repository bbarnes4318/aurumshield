"use client";

/* ================================================================
   PLATFORM OVERVIEW — LP Telemetry Dashboard
   ================================================================
   Zero-Scroll: absolute inset-0 flex flex-col overflow-hidden.
   KPI strip is shrink-0. Body is flex-1 min-h-0 with two panels
   whose internal lists scroll independently.
   ================================================================ */

import {
  Vault,
  ArrowUpDown,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Users,
} from "lucide-react";

/* ================================================================
   MOCK DATA
   ================================================================ */

const KPI_CARDS = [
  { id: "aum", label: "Total Vaulted AUM", value: "$318M", sub: "120,480 oz", change: "+2.8%", positive: true, icon: Vault },
  { id: "volume", label: "30-Day Clearing Volume", value: "$1.2B", sub: "482 settlements", change: "+14.3%", positive: true, icon: ArrowUpDown },
  { id: "yield", label: "Avg Platform Yield", value: "18 bps", sub: "captured / settlement", change: "+1 bp", positive: true, icon: TrendingUp },
  { id: "escrow", label: "Active DvP Escrow", value: "$45M", sub: "locked in escrow", change: "-3.1%", positive: false, icon: ShieldCheck },
] as const;

interface SettlementRow {
  id: string; origin: string; destination: string; volume: string;
  weightOz: string; rail: string; tts: string;
  status: "SETTLED" | "PROCESSING" | "AUTHORIZED"; timestamp: string;
}

const SETTLEMENT_ROWS: SettlementRow[] = [
  { id: "STL-2026-0419", origin: "Zurich Custody Vault", destination: "New York Trading Floor", volume: "$125.0M", weightOz: "47,200 oz", rail: "RTGS", tts: "4h 12m", status: "SETTLED", timestamp: "2026-03-19 14:15 UTC" },
  { id: "STL-2026-0418", origin: "London Clearing Centre", destination: "Singapore Settlement Node", volume: "$89.5M", weightOz: "33,800 oz", rail: "WIRE", tts: "3h 48m", status: "SETTLED", timestamp: "2026-03-19 11:02 UTC" },
  { id: "STL-2026-0417", origin: "Frankfurt Settlement Hub", destination: "Dubai Trade Gateway", volume: "$230.0M", weightOz: "86,900 oz", rail: "RTGS", tts: "6h 31m", status: "SETTLED", timestamp: "2026-03-18 16:44 UTC" },
  { id: "STL-2026-0416", origin: "New York Trading Floor", destination: "London Clearing Centre", volume: "$67.2M", weightOz: "25,400 oz", rail: "WIRE", tts: "2h 56m", status: "SETTLED", timestamp: "2026-03-18 09:30 UTC" },
  { id: "STL-2026-0415", origin: "Singapore Settlement Node", destination: "Zurich Custody Vault", volume: "$312.0M", weightOz: "117,900 oz", rail: "RTGS", tts: "\u2014", status: "PROCESSING", timestamp: "2026-03-20 08:15 UTC" },
  { id: "STL-2026-0414", origin: "Dubai Trade Gateway", destination: "Frankfurt Settlement Hub", volume: "$54.8M", weightOz: "20,700 oz", rail: "WIRE", tts: "\u2014", status: "AUTHORIZED", timestamp: "2026-03-20 07:02 UTC" },
];

const RISK_DATA = {
  ecr: { current: 12.4, required: 8.0, label: "Economic Capital Ratio", status: "ADEQUATE" as const },
  triCounterparties: { green: 1083, amber: 142, red: 22, total: 1247 },
  capitalMetrics: [
    { label: "Total Capital Base", value: "$4.82B" },
    { label: "Risk-Weighted Assets", value: "$38.9B" },
    { label: "Tier 1 Ratio", value: "11.2%" },
    { label: "Leverage Ratio", value: "6.8%" },
    { label: "Hardstop Utilization", value: "72.4%" },
    { label: "Liquidity Buffer", value: "$890M" },
  ],
};

/* ================================================================
   PAGE
   ================================================================ */

export default function InvestorDashboard() {
  const chartBars = [
    42, 58, 35, 71, 49, 63, 28, 55, 67, 44,
    73, 38, 61, 52, 47, 69, 33, 56, 78, 41,
    65, 50, 36, 72, 59, 45, 68, 54, 76, 62,
  ];
  const maxBar = Math.max(...chartBars);

  return (
    <div className="absolute inset-0 flex flex-col p-3 gap-3 overflow-hidden bg-slate-950">
      {/* ── KPI Strip (shrink-0) ── */}
      <div className="shrink-0 grid grid-cols-4 gap-2">
        {KPI_CARDS.map((kpi) => {
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
                  <span className="font-mono text-[9px] text-slate-500 tabular-nums">{kpi.sub}</span>
                </div>
                <span className={`font-mono text-[9px] font-semibold tabular-nums ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>
                  {kpi.change} <span className="text-slate-600 font-normal">vs 30d</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BODY: two panels absorb remaining space ── */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* LEFT — Liquidity Velocity (col ~8/12) */}
        <div className="flex-2 min-w-0 flex flex-col rounded-md border border-slate-800 bg-slate-900/60">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">30-Day Liquidity Velocity</span>
            </div>
            <span className="font-mono text-[9px] text-slate-600">Last 30 calendar days</span>
          </div>

          {/* Bar chart (shrink-0) */}
          <div className="shrink-0 px-3 pt-2 pb-1">
            <div className="flex items-end gap-[2px] h-12">
              {chartBars.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[1px] bg-cyan-500/30 hover:bg-cyan-500/60 transition-colors"
                  style={{ height: `${(val / maxBar) * 100}%` }}
                  title={`Day ${i + 1}: $${val}M`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="font-mono text-[7px] text-slate-700">30d ago</span>
              <span className="font-mono text-[7px] text-slate-700">Today</span>
            </div>
          </div>

          {/* Settlement table — internal scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">ID</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Origin</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Destination</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Volume</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Weight</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center">Rail</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">TTS</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {SETTLEMENT_ROWS.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-[10px] text-cyan-400 font-semibold">{row.id}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-300 truncate max-w-[140px]">{row.origin}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-300 truncate max-w-[140px]">{row.destination}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-white font-semibold text-right tabular-nums">{row.volume}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400 text-right tabular-nums">{row.weightOz}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`font-mono text-[8px] font-bold tracking-wider ${row.rail === "RTGS" ? "text-amber-400" : "text-slate-500"}`}>{row.rail}</span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400 text-right tabular-nums">{row.tts}</td>
                    <td className="px-3 py-1.5 text-center"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — Systemic Risk & Capital (col ~4/12) */}
        <div className="flex-1 min-w-0 flex flex-col rounded-md border border-slate-800 bg-slate-900/60">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-800 px-3 py-2 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Systemic Risk & Capital</span>
          </div>

          {/* ECR Gauge */}
          <div className="shrink-0 px-3 py-2 border-b border-slate-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">{RISK_DATA.ecr.label}</span>
              <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${RISK_DATA.ecr.current >= RISK_DATA.ecr.required ? "text-emerald-400" : "text-red-400"}`}>{RISK_DATA.ecr.status}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-mono text-xl font-bold text-white tabular-nums">{RISK_DATA.ecr.current}%</span>
              <span className="font-mono text-[9px] text-slate-600 tabular-nums">/ {RISK_DATA.ecr.required}% required</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min((RISK_DATA.ecr.current / 20) * 100, 100)}%` }} />
              <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${(RISK_DATA.ecr.required / 20) * 100}%` }} />
            </div>
          </div>

          {/* TRI Bands */}
          <div className="shrink-0 px-3 py-2 border-b border-slate-800/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="h-3 w-3 text-slate-500" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">TRI Bands — Counterparty Risk</span>
            </div>
            <TriBar green={RISK_DATA.triCounterparties.green} amber={RISK_DATA.triCounterparties.amber} red={RISK_DATA.triCounterparties.red} total={RISK_DATA.triCounterparties.total} />
          </div>

          {/* Active Counterparties */}
          <div className="shrink-0 px-3 py-2 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-slate-500" />
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Active Counterparties</span>
              </div>
              <span className="font-mono text-sm font-bold text-white tabular-nums">{RISK_DATA.triCounterparties.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Capital Metrics — scrollable list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Capital Adequacy Metrics</span>
            <div className="space-y-1.5">
              {RISK_DATA.capitalMetrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{metric.label}</span>
                  <span className="font-mono text-[10px] text-white font-semibold tabular-nums">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatusBadge({ status }: { status: SettlementRow["status"] }) {
  const styles: Record<SettlementRow["status"], string> = {
    SETTLED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PROCESSING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    AUTHORIZED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-mono font-semibold tracking-wider uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

function TriBar({ green, amber, red, total }: { green: number; amber: number; red: number; total: number }) {
  const gPct = (green / total) * 100;
  const aPct = (amber / total) * 100;
  const rPct = (red / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 w-full rounded-sm overflow-hidden flex bg-slate-800">
        <div className="bg-emerald-500" style={{ width: `${gPct}%` }} title={`Green: ${green}`} />
        <div className="bg-amber-500" style={{ width: `${aPct}%` }} title={`Amber: ${amber}`} />
        <div className="bg-red-500" style={{ width: `${rPct}%` }} title={`Red: ${red}`} />
      </div>
      <div className="flex items-center gap-3 text-[9px]">
        <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-emerald-500" /><span className="text-slate-400">Green</span><span className="font-mono text-emerald-400 font-semibold">{green.toLocaleString()}</span></div>
        <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-amber-500" /><span className="text-slate-400">Amber</span><span className="font-mono text-amber-400 font-semibold">{amber.toLocaleString()}</span></div>
        <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-sm bg-red-500" /><span className="text-slate-400">Red</span><span className="font-mono text-red-400 font-semibold">{red.toLocaleString()}</span></div>
      </div>
    </div>
  );
}
