"use client";

/* ================================================================
   EXEC CONTROL PANEL — Institutional dashboard banner with real-time KPIs
   
   Displays 6 key metrics from production hooks:
   1. Capital Base
   2. Gross Exposure
   3. ECR (2 dp)
   4. Hardstop Utilization % (1 dp)
   5. Breach Level (badge)
   6. Control Mode (badge)
   
   All data from existing hooks — no fabricated values, no demo overrides.
   Bloomberg/Murex-style institutional density.
   ================================================================ */

import { useIntradayCapital, useCapitalControls, useSettlements } from "@/hooks/use-mock-queries";

/** Format large numbers in institutional shorthand: $25.0M, $1.2B */
function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** Resolve badge color class based on severity string. */
function severityColor(level: string): string {
  switch (level) {
    case "NONE":
    case "NORMAL":
      return "text-success bg-success/10 border-success/30";
    case "CAUTION":
    case "THROTTLE":
      return "text-warning bg-warning/10 border-warning/30";
    case "BREACH":
    case "HALT":
    case "EMERGENCY_HALT":
      return "text-danger bg-danger/10 border-danger/30";
    default:
      return "text-text-faint bg-surface-2 border-border";
  }
}

export function ExecControlPanel() {
  const { data: snapshot } = useIntradayCapital();
  const { data: controls } = useCapitalControls();
  const { data: settlements } = useSettlements();

  // Settlement queue = all settlements that are not SETTLED, FAILED, or CANCELLED
  const activeSettlements = settlements?.filter(
    (s) => !["SETTLED", "FAILED", "CANCELLED"].includes(s.status),
  ) ?? [];

  const capitalBase = snapshot?.capitalBase ?? 0;
  const grossExposure = snapshot?.grossExposureNotional ?? 0;
  const ecr = snapshot?.ecr ?? 0;
  const hardstopUtil = snapshot?.hardstopUtilization ?? 0;
  const breachLevel = snapshot?.breachLevel ?? "—";
  const controlMode = controls?.mode ?? "—";

  const breachStr = String(breachLevel);
  const controlStr = String(controlMode);

  return (
    <div className="card-base overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center gap-4 border-b border-border px-5 py-2.5">
        <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
          Executive Status
        </span>
        <div className="h-3.5 w-px bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Queue: <span className="typo-mono font-semibold text-text">{activeSettlements.length}</span>
        </span>
      </div>

      {/* KPI Row */}
      <div className="flex flex-wrap items-stretch divide-x divide-border">
        {/* Capital Base */}
        <div className="flex-1 min-w-[120px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">Capital Base</div>
          <div className="typo-mono text-sm font-semibold text-text tabular-nums">
            {capitalBase > 0 ? fmtCompact(capitalBase) : "—"}
          </div>
        </div>

        {/* Gross Exposure */}
        <div className="flex-1 min-w-[120px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">Gross Exposure</div>
          <div className="typo-mono text-sm font-semibold text-text tabular-nums">
            {grossExposure > 0 ? fmtCompact(grossExposure) : "—"}
          </div>
        </div>

        {/* ECR */}
        <div className="flex-1 min-w-[90px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">ECR</div>
          <div className="typo-mono text-sm font-semibold text-text tabular-nums">
            {capitalBase > 0 ? ecr.toFixed(2) : "—"}
          </div>
        </div>

        {/* Hardstop Utilization */}
        <div className="flex-1 min-w-[120px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">Hardstop Util.</div>
          <div className="typo-mono text-sm font-semibold text-text tabular-nums">
            {capitalBase > 0 ? `${(hardstopUtil * 100).toFixed(1)}%` : "—"}
          </div>
        </div>

        {/* Breach Level */}
        <div className="flex-1 min-w-[100px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">Breach</div>
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${severityColor(breachStr)}`}
          >
            {breachLevel}
          </span>
        </div>

        {/* Control Mode */}
        <div className="flex-1 min-w-[100px] px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-text-faint mb-0.5">Controls</div>
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${severityColor(controlStr)}`}
          >
            {controlMode}
          </span>
        </div>
      </div>
    </div>
  );
}
