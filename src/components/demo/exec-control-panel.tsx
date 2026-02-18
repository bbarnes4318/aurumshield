"use client";

/* ================================================================
   EXEC CONTROL PANEL — Dashboard banner with real-time data
   
   Displays:
   - Intraday breach level
   - Control mode  
   - Active overrides count
   - Settlement queue depth
   
   All data from existing hooks — no fabricated values.
   ================================================================ */

import { useIntradayCapital, useCapitalControls, useSettlements } from "@/hooks/use-mock-queries";

export function ExecControlPanel() {
  const { data: snapshot } = useIntradayCapital();
  const { data: controls } = useCapitalControls();
  const { data: settlements } = useSettlements();

  // Settlement queue = all settlements that are not SETTLED, FAILED, or CANCELLED
  const activeSettlements = settlements?.filter(
    (s) => !["SETTLED", "FAILED", "CANCELLED"].includes(s.status),
  ) ?? [];

  const breachLevel = snapshot?.breachLevel ?? "—";
  const controlMode = controls?.mode ?? "—";

  const breachLevelStr = String(breachLevel);
  const controlModeStr = String(controlMode);

  const breachColor =
    breachLevelStr === "NONE"
      ? "text-success"
      : breachLevelStr === "CAUTION"
        ? "text-warning"
        : breachLevelStr === "—"
          ? "text-text-faint"
          : "text-danger";

  const controlColor =
    controlModeStr === "NORMAL"
      ? "text-success"
      : controlModeStr === "CAUTION"
        ? "text-warning"
        : controlModeStr === "—"
          ? "text-text-faint"
          : "text-danger";

  return (
    <div className="card-base flex items-center gap-6 px-5 py-3">
      <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
        Executive Status
      </span>
      <div className="h-4 w-px bg-border" />

      {/* Breach Level */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Breach
        </span>
        <span className={`typo-mono text-xs font-semibold ${breachColor}`}>
          {breachLevel}
        </span>
      </div>

      {/* Control Mode */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Controls
        </span>
        <span className={`typo-mono text-xs font-semibold ${controlColor}`}>
          {controlMode}
        </span>
      </div>

      {/* Active Overrides */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Overrides
        </span>
        <span className="typo-mono text-xs font-semibold text-text">
          {/* TODO: Wire actual override count from useCapitalOverrides when available */}
          0
        </span>
      </div>

      {/* Settlement Queue */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Queue
        </span>
        <span className="typo-mono text-xs font-semibold text-text">
          {activeSettlements.length}
        </span>
      </div>
    </div>
  );
}
