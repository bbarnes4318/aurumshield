"use client";

/* ================================================================
   GOLDWIRE — Investor Portal Settlement Network View
   ================================================================
   Zero-Scroll: absolute inset-0 flex flex-col overflow-hidden.
   Shows the Goldwire Settlement Network from an LP's perspective:
   active settlement pipelines, network throughput, and recent
   wire movements.
   ================================================================ */

import {
  ArrowRightLeft,
  Activity,
  Shield,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

/* ── Mock Data ── */

const GW_KPIS = [
  { id: "throughput", label: "24h Network Throughput", value: "$284.6M", sub: "142 settlements", change: "+22.1%", positive: true, icon: Zap },
  { id: "avg-tts",    label: "Avg Time-to-Settle",    value: "3h 42m",   sub: "↓ from 5h 12m",  change: "-28.7%", positive: true, icon: Clock },
  { id: "success",    label: "Settlement Rate",        value: "99.94%",   sub: "3 retries / 0 fails", change: "+0.02%", positive: true, icon: CheckCircle2 },
  { id: "volume",     label: "MTD Wire Volume",        value: "$4.82B",   sub: "2,148 wires",    change: "+18.4%", positive: true, icon: TrendingUp },
] as const;

interface ActivePipeline {
  pipelineId: string;
  origin: string;
  destination: string;
  amountM: number;
  rail: "RTGS" | "WIRE" | "STABLECOIN";
  status: "IN_FLIGHT" | "CLEARING" | "SETTLED";
  initiatedAt: string;
  eta: string;
}

const ACTIVE_PIPELINES: ActivePipeline[] = [
  { pipelineId: "GW-9042", origin: "Zurich → New York",      amountM: 125.0, rail: "RTGS",       status: "IN_FLIGHT", initiatedAt: "10:14 UTC", eta: "14:26 UTC", destination: "" },
  { pipelineId: "GW-9041", origin: "London → Singapore",     amountM: 89.5,  rail: "WIRE",       status: "CLEARING",  initiatedAt: "09:02 UTC", eta: "12:50 UTC", destination: "" },
  { pipelineId: "GW-9040", origin: "Dubai → Frankfurt",      amountM: 54.8,  rail: "STABLECOIN", status: "IN_FLIGHT", initiatedAt: "08:45 UTC", eta: "09:15 UTC", destination: "" },
  { pipelineId: "GW-9039", origin: "New York → London",      amountM: 67.2,  rail: "RTGS",       status: "SETTLED",   initiatedAt: "07:30 UTC", eta: "—",         destination: "" },
  { pipelineId: "GW-9038", origin: "Singapore → Zurich",     amountM: 312.0, rail: "RTGS",       status: "CLEARING",  initiatedAt: "06:15 UTC", eta: "10:30 UTC", destination: "" },
  { pipelineId: "GW-9037", origin: "Frankfurt → Dubai",      amountM: 42.1,  rail: "WIRE",       status: "SETTLED",   initiatedAt: "05:42 UTC", eta: "—",         destination: "" },
];

interface NetworkNode {
  node: string;
  region: string;
  status: "ONLINE" | "DEGRADED";
  latencyMs: number;
  settlementsToday: number;
  volumeM: number;
}

const NETWORK_NODES: NetworkNode[] = [
  { node: "ZRH-01", region: "Zurich",     status: "ONLINE", latencyMs: 12,  settlementsToday: 48,  volumeM: 892.4 },
  { node: "LDN-01", region: "London",     status: "ONLINE", latencyMs: 8,   settlementsToday: 62,  volumeM: 1240.8 },
  { node: "NYC-01", region: "New York",   status: "ONLINE", latencyMs: 14,  settlementsToday: 55,  volumeM: 1080.2 },
  { node: "SIN-01", region: "Singapore",  status: "ONLINE", latencyMs: 22,  settlementsToday: 31,  volumeM: 640.6 },
  { node: "DXB-01", region: "Dubai",      status: "ONLINE", latencyMs: 18,  settlementsToday: 28,  volumeM: 520.4 },
  { node: "FRA-01", region: "Frankfurt",  status: "ONLINE", latencyMs: 10,  settlementsToday: 38,  volumeM: 780.1 },
];

const STATUS_STYLES: Record<ActivePipeline["status"], string> = {
  IN_FLIGHT: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  CLEARING:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  SETTLED:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const RAIL_COLORS: Record<ActivePipeline["rail"], string> = {
  RTGS:       "text-amber-400",
  WIRE:       "text-slate-400",
  STABLECOIN: "text-violet-400",
};

/* ── Page ── */

export default function InvestorGoldwirePage() {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-3 gap-2">
      {/* ── KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-2">
        {GW_KPIS.map((kpi) => {
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

      {/* ── BODY ── */}
      <div className="flex-1 min-h-0 flex gap-2">
        {/* LEFT — Active Settlement Pipelines */}
        <div className="flex-2 min-w-0 flex flex-col rounded-md border border-slate-800 bg-slate-900/60">
          <div className="shrink-0 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Active Settlement Pipelines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[8px] text-cyan-400 tracking-wider uppercase font-bold">LIVE</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Pipeline</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Route</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Amount</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center">Rail</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Initiated</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">ETA</th>
                  <th className="px-3 py-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVE_PIPELINES.map((p) => (
                  <tr key={p.pipelineId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-[10px] text-cyan-400 font-semibold">{p.pipelineId}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-300">{p.origin}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-white font-semibold text-right tabular-nums">${p.amountM.toFixed(1)}M</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`font-mono text-[8px] font-bold tracking-wider ${RAIL_COLORS[p.rail]}`}>{p.rail}</span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500 tabular-nums">{p.initiatedAt}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400 tabular-nums">{p.eta}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded border text-[8px] font-mono font-semibold tracking-wider uppercase ${STATUS_STYLES[p.status]}`}>{p.status.replace("_", " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — Network Nodes */}
        <div className="flex-1 min-w-0 flex flex-col rounded-md border border-slate-800 bg-slate-900/60">
          <div className="shrink-0 border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Network Nodes</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="divide-y divide-slate-800/50">
              {NETWORK_NODES.map((n) => (
                <div key={n.node} className="px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${n.status === "ONLINE" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                      <span className="font-mono text-[10px] text-white font-semibold">{n.node}</span>
                      <span className="text-[10px] text-slate-400">{n.region}</span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-600 tabular-nums">{n.latencyMs}ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500">{n.settlementsToday} settlements today</span>
                    <span className="font-mono text-slate-400 tabular-nums font-semibold">${n.volumeM.toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Network health footer */}
          <div className="shrink-0 border-t border-slate-800 px-3 py-2 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-[8px] text-emerald-400 tracking-wider uppercase font-bold">All Nodes Operational</span>
            </div>
            <p className="font-mono text-[7px] text-slate-600 mt-0.5">
              Goldwire Settlement Network · 6 nodes · 5 continents · 99.99% uptime SLA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
