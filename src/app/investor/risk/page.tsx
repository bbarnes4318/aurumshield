"use client";

/* ================================================================
   SYSTEMIC RISK — LP Telemetry Terminal
   ================================================================
   Comprehensive systemic risk dashboard for Limited Partners.
   Shows ECR gauge, TRI bands, VaR, stress tests, concentration
   risk, counterparty exposure, and risk event log.

   All financial figures: font-mono + tabular-nums.
   Typography: text-sm / text-xs. Max padding: p-4.
   ================================================================ */

import {
  ShieldCheck,
  TrendingDown,
  Activity,
  Users,
  Zap,
  BarChart3,
  Target,
} from "lucide-react";

/* ================================================================
   MOCK DATA
   ================================================================ */

const RISK_KPIS = [
  {
    id: "ecr",
    label: "Economic Capital Ratio",
    value: "12.4%",
    sub: "8.0% required",
    change: "+0.3pp",
    positive: true,
    icon: ShieldCheck,
    status: "ADEQUATE",
  },
  {
    id: "var",
    label: "1-Day VaR (99%)",
    value: "$8.2M",
    sub: "limit: $15M",
    change: "-$1.1M",
    positive: true,
    icon: TrendingDown,
    status: "WITHIN LIMIT",
  },
  {
    id: "stress",
    label: "Worst Stress Scenario",
    value: "$42.6M",
    sub: "Gold -15% shock",
    change: "+$2.1M",
    positive: false,
    icon: Zap,
    status: "MONITORED",
  },
  {
    id: "breaches",
    label: "Limit Breaches (30d)",
    value: "0",
    sub: "zero tolerance",
    change: "0",
    positive: true,
    icon: Target,
    status: "CLEAN",
  },
] as const;

const STATUS_COLORS: Record<string, string> = {
  "ADEQUATE": "text-emerald-400",
  "WITHIN LIMIT": "text-emerald-400",
  "MONITORED": "text-amber-400",
  "CLEAN": "text-emerald-400",
};

/** Counterparty exposure by tier */
interface CounterpartyTier {
  tier: string;
  count: number;
  exposureM: number;
  maxSingleM: number;
  triColor: string;
  dotClass: string;
}

const COUNTERPARTY_TIERS: CounterpartyTier[] = [
  { tier: "Tier 1 — Sovereign/Central Bank",   count: 12,   exposureM: 1420, maxSingleM: 280, triColor: "Green", dotClass: "bg-emerald-500" },
  { tier: "Tier 2 — Global Systemics",         count: 48,   exposureM: 2180, maxSingleM: 120, triColor: "Green", dotClass: "bg-emerald-500" },
  { tier: "Tier 3 — Regional Institutions",    count: 186,  exposureM: 890,  maxSingleM: 45,  triColor: "Green", dotClass: "bg-emerald-500" },
  { tier: "Tier 4 — Corporate Offtakers",      count: 837,  exposureM: 310,  maxSingleM: 12,  triColor: "Amber", dotClass: "bg-amber-500" },
  { tier: "Tier 5 — Monitored / Watchlist",    count: 142,  exposureM: 18,   maxSingleM: 3,   triColor: "Amber", dotClass: "bg-amber-500" },
  { tier: "Tier 6 — Restricted",              count: 22,   exposureM: 2,    maxSingleM: 0.5,  triColor: "Red",   dotClass: "bg-red-500" },
];

/** Stress test scenarios */
interface StressScenario {
  scenario: string;
  trigger: string;
  pnlImpactM: number;
  capitalPost: string;
  verdict: "PASS" | "WARN" | "FAIL";
}

const STRESS_TESTS: StressScenario[] = [
  { scenario: "Gold Flash Crash",         trigger: "XAU -15% in 1h",              pnlImpactM: -42.6,  capitalPost: "9.8%",  verdict: "PASS" },
  { scenario: "Counterparty Default",     trigger: "Top-3 default simultaneously", pnlImpactM: -28.4,  capitalPost: "10.2%", verdict: "PASS" },
  { scenario: "Liquidity Drought",        trigger: "No clearing for 48h",          pnlImpactM: -18.9,  capitalPost: "11.1%", verdict: "PASS" },
  { scenario: "Regulatory Halt",          trigger: "LBMA suspends clearing",       pnlImpactM: -55.1,  capitalPost: "8.4%",  verdict: "WARN" },
  { scenario: "FX Dislocation",           trigger: "USD +8% vs basket",            pnlImpactM: -12.3,  capitalPost: "11.6%", verdict: "PASS" },
  { scenario: "Systemic Contagion",       trigger: "3+ sovereigns freeze",         pnlImpactM: -71.2,  capitalPost: "6.9%",  verdict: "WARN" },
];

/** Concentration risk — top 5 exposures */
interface ConcentrationExposure {
  entity: string;
  exposureM: number;
  pctOfTotal: number;
  limit: number;
}

const TOP_CONCENTRATIONS: ConcentrationExposure[] = [
  { entity: "Aurelia Sovereign Fund",      exposureM: 280, pctOfTotal: 5.8,  limit: 8.0 },
  { entity: "Pacific Bullion Trust",       exposureM: 245, pctOfTotal: 5.1,  limit: 8.0 },
  { entity: "Meridian Capital Partners",   exposureM: 218, pctOfTotal: 4.5,  limit: 8.0 },
  { entity: "Helvetia Private Bank",       exposureM: 192, pctOfTotal: 4.0,  limit: 8.0 },
  { entity: "Nordic Reserve Systems",      exposureM: 168, pctOfTotal: 3.5,  limit: 8.0 },
];

/** Risk event log */
interface RiskEvent {
  timestamp: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  event: string;
  resolution: string;
}

const RISK_EVENTS: RiskEvent[] = [
  { timestamp: "2026-03-20 09:14 UTC", severity: "INFO",     event: "TRI band recalibration completed",              resolution: "Automated" },
  { timestamp: "2026-03-19 22:30 UTC", severity: "WARN",     event: "Gold volatility exceeded 2σ threshold",          resolution: "Margin call triggered" },
  { timestamp: "2026-03-19 16:05 UTC", severity: "INFO",     event: "ECR ratio refreshed — 12.4% (no change)",       resolution: "N/A" },
  { timestamp: "2026-03-18 11:22 UTC", severity: "WARN",     event: "Counterparty OTC-441 delayed settlement 4h",     resolution: "Manual override" },
  { timestamp: "2026-03-17 08:45 UTC", severity: "INFO",     event: "Monthly stress test suite completed",            resolution: "All scenarios PASS" },
  { timestamp: "2026-03-16 14:18 UTC", severity: "CRITICAL", event: "Near-breach: Tier-4 exposure at 97% of limit",   resolution: "Exposure reduced" },
  { timestamp: "2026-03-15 10:30 UTC", severity: "INFO",     event: "VaR model recalibrated with latest vol surface", resolution: "Automated" },
];

const SEVERITY_STYLES: Record<RiskEvent["severity"], string> = {
  INFO:     "bg-slate-500/10 text-slate-400 border-slate-500/20",
  WARN:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const VERDICT_STYLES: Record<StressScenario["verdict"], string> = {
  PASS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  WARN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FAIL: "bg-red-500/10 text-red-400 border-red-500/20",
};

/* ================================================================
   PAGE
   ================================================================ */

export default function SystemicRiskPage() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── KPI Strip ── */}
      <div className="col-span-12 grid grid-cols-4 gap-3">
        {RISK_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-md border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded bg-slate-800 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</span>
                </div>
                <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${STATUS_COLORS[kpi.status] ?? "text-slate-400"}`}>
                  {kpi.status}
                </span>
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
         LEFT COL — Stress Tests + Counterparty Exposure (col-span-8)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-8 space-y-4">
        {/* ── Stress Test Results ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Stress Test Results — Regulatory Scenarios
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-600">Last run: 2026-03-17</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Scenario</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Trigger</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">P&L Impact</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Capital Post</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-center">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {STRESS_TESTS.map((s) => (
                <tr key={s.scenario} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-200 font-medium">{s.scenario}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{s.trigger}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-red-400 font-semibold text-right tabular-nums">
                    ${Math.abs(s.pnlImpactM).toFixed(1)}M
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white text-right tabular-nums">{s.capitalPost}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-semibold tracking-wider uppercase ${VERDICT_STYLES[s.verdict]}`}>
                      {s.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Counterparty Exposure by Tier ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Counterparty Exposure by Tier
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Tier</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Count</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Exposure</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Max Single</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-center">TRI</th>
              </tr>
            </thead>
            <tbody>
              {COUNTERPARTY_TIERS.map((t) => (
                <tr key={t.tier} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-300">{t.tier}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 text-right tabular-nums">{t.count.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white font-semibold text-right tabular-nums">${t.exposureM.toLocaleString()}M</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 text-right tabular-nums">${t.maxSingleM}M</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${t.dotClass}`} />
                      <span className="font-mono text-[10px] text-slate-500">{t.triColor}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         RIGHT COL — Concentration Risk + Event Log (col-span-4)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-4 space-y-4">
        {/* ── Concentration Risk — Top 5 ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Concentration Risk — Top 5
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {TOP_CONCENTRATIONS.map((c) => (
              <div key={c.entity}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-300 truncate mr-2">{c.entity}</span>
                  <span className="font-mono text-[11px] text-white font-semibold tabular-nums shrink-0">${c.exposureM}M</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${c.pctOfTotal > 6 ? "bg-amber-500" : "bg-cyan-500"}`}
                    style={{ width: `${(c.pctOfTotal / c.limit) * 100}%` }}
                  />
                  {/* Limit marker */}
                  <div className="absolute inset-y-0 w-px bg-red-500/50" style={{ left: "100%" }} />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono text-[9px] text-slate-600 tabular-nums">{c.pctOfTotal}% of portfolio</span>
                  <span className="font-mono text-[9px] text-slate-700 tabular-nums">Limit: {c.limit}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Risk Event Log ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Risk Event Log
            </span>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-80 overflow-y-auto">
            {RISK_EVENTS.map((e, i) => (
              <div key={i} className="px-4 py-2.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold tracking-wider uppercase ${SEVERITY_STYLES[e.severity]}`}>
                    {e.severity}
                  </span>
                  <span className="font-mono text-[9px] text-slate-600">{e.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-300 mb-0.5">{e.event}</p>
                <p className="text-[10px] text-slate-600">
                  Resolution: <span className="text-slate-500">{e.resolution}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
