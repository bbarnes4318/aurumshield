"use client";

import { cn } from "@/lib/utils";
import type { DashboardCapital } from "@/lib/mock-data";

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

interface StressResult {
  scenario: string;
  description: string;
  stressLoss: number;
  lossBasis: string;
  postCapital: number;
  postECR: number;
  status: "BREACH" | "WARNING" | "STABLE";
  hardstopPostUtil: number;
}

const STATUS_CLR: Record<string, string> = {
  BREACH: "text-danger bg-danger/10", WARNING: "text-warning bg-warning/10", STABLE: "text-success bg-success/10",
};

/**
 * Deterministic stress scenarios derived entirely from DashboardCapital.
 * No probabilistic modeling. Pure simulation.
 *
 * 1. Dual Max-Cap Breach:  stressLoss = TVaR 99% (full tail loss materializes)
 * 2. Corridor Seizure Cluster: stressLoss = VaR 99% × 0.75
 * 3. Hub Compromise Event: stressLoss = bufferVsTvar99 (buffer consumed entirely)
 */
function computeScenarios(c: DashboardCapital): StressResult[] {
  const scenarios: { scenario: string; description: string; stressLoss: number; lossBasis: string }[] = [
    {
      scenario: "Dual Max-Cap Breach",
      description: "Two corridor tiers simultaneously breach cap limits. Full TVaR 99% tail loss materializes across correlated exposures.",
      stressLoss: c.tvar99,
      lossBasis: `TVaR99 = ${fmt(c.tvar99)}`,
    },
    {
      scenario: "Corridor Seizure Cluster",
      description: "Multiple corridor restrictions trigger cascading settlement failures. Loss = 75% of VaR 99% across affected corridors.",
      stressLoss: Math.round(c.var99 * 0.75),
      lossBasis: `VaR99(${fmt(c.var99)}) × 0.75`,
    },
    {
      scenario: "Hub Compromise Event",
      description: "Primary hub operational failure consumes entire capital buffer. Loss equals buffer vs TVaR.",
      stressLoss: c.bufferVsTvar99,
      lossBasis: `Buffer = ${fmt(c.bufferVsTvar99)}`,
    },
  ];

  return scenarios.map(({ scenario, description, stressLoss, lossBasis }) => {
    const postCapital = Math.max(0, c.capitalBase - stressLoss);
    const postECR = postCapital > 0 ? c.activeExposure / postCapital : Infinity;
    const hardstopPostUtil = c.hardstopLimit > 0 ? c.activeExposure / c.hardstopLimit : 1;
    const status: "BREACH" | "WARNING" | "STABLE" = postECR > 10 ? "BREACH" : postECR > 8 ? "WARNING" : "STABLE";
    return { scenario, description, stressLoss, lossBasis, postCapital, postECR, status, hardstopPostUtil };
  });
}

export function StressScenarios({ capital }: { capital: DashboardCapital }) {
  const results = computeScenarios(capital);

  return (
    <div className="card-base overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text">Stress Scenarios — Deterministic</h3>
      </div>
      <div className="divide-y divide-border">
        {results.map((r) => (
          <div key={r.scenario} className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-text">{r.scenario}</h4>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_CLR[r.status])}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-3">{r.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex justify-between"><dt className="text-text-faint">Stress Loss</dt><dd className="tabular-nums font-semibold text-danger text-right">−{fmt(r.stressLoss)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">Loss Basis</dt><dd className="tabular-nums text-text-muted text-right font-mono text-[11px]">{r.lossBasis}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">Post-Stress Capital</dt><dd className="tabular-nums font-semibold text-text text-right">{fmt(r.postCapital)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">Post-Stress ECR</dt><dd className={cn("tabular-nums font-semibold text-right", r.postECR > 10 ? "text-danger" : r.postECR > 8 ? "text-warning" : "text-text")}>{r.postECR === Infinity ? "∞" : `${r.postECR.toFixed(1)}×`}</dd></div>
            </dl>
            <div className="mt-2 text-[10px] text-text-faint font-mono">
              postCapital = {fmt(capital.capitalBase)} − {fmt(r.stressLoss)} = {fmt(r.postCapital)} | postECR = {fmt(capital.activeExposure)} / {fmt(r.postCapital)} = {r.postECR === Infinity ? "∞" : `${r.postECR.toFixed(1)}×`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
