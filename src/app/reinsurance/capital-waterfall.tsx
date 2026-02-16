"use client";

import { cn } from "@/lib/utils";
import type { DashboardCapital } from "@/lib/mock-data";

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }
function pctOf(n: number, base: number) { return base > 0 ? ((n / base) * 100).toFixed(1) : "0.0"; }

interface WaterfallStep {
  label: string;
  value: number;
  pctOfCapital: string;
  delta: number | null;
  color: string;
}

function buildWaterfall(c: DashboardCapital): WaterfallStep[] {
  return [
    { label: "Capital Base", value: c.capitalBase, pctOfCapital: "100.0", delta: null, color: "bg-gold" },
    { label: "Expected Loss (EL)", value: c.expectedLoss, pctOfCapital: pctOf(c.expectedLoss, c.capitalBase), delta: c.expectedLoss, color: "bg-warning" },
    { label: "VaR 99%", value: c.var99, pctOfCapital: pctOf(c.var99, c.capitalBase), delta: c.var99 - c.expectedLoss, color: "bg-danger" },
    { label: "TVaR 99%", value: c.tvar99, pctOfCapital: pctOf(c.tvar99, c.capitalBase), delta: c.tvar99 - c.var99, color: "bg-danger" },
    { label: "Buffer vs TVaR", value: c.capitalBase - c.tvar99, pctOfCapital: pctOf(c.capitalBase - c.tvar99, c.capitalBase), delta: -(c.tvar99 - c.var99), color: "bg-success" },
    { label: "Hardstop Utilization", value: c.activeExposure, pctOfCapital: `${(c.hardstopUtilization * 100).toFixed(1)}`, delta: null, color: c.hardstopUtilization > 0.9 ? "bg-danger" : c.hardstopUtilization > 0.75 ? "bg-warning" : "bg-success" },
  ];
}

export function CapitalWaterfall({ capital }: { capital: DashboardCapital }) {
  const steps = buildWaterfall(capital);
  const maxVal = Math.max(capital.capitalBase, capital.activeExposure, capital.hardstopLimit);

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Capital Waterfall</h3>
        <span className="text-[11px] text-text-faint tabular-nums">As of {new Date(capital.asOf).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const barWidth = (step.value / maxVal) * 100;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text">{step.label}</span>
                  {step.delta !== null && (
                    <span className={cn("text-[10px] tabular-nums font-mono", step.delta > 0 ? "text-danger" : "text-success")}>
                      {step.delta > 0 ? "+" : ""}{fmt(step.delta)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="font-semibold text-text">{fmt(step.value)}</span>
                  <span className="text-text-faint w-12 text-right">{step.pctOfCapital}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", step.color)} style={{ width: `${Math.min(100, barWidth)}%` }} />
              </div>
              {/* Reconciliation line between loss tiers */}
              {i > 0 && i < 5 && (
                <div className="flex justify-end mt-0.5">
                  <span className="text-[9px] text-text-faint tabular-nums font-mono">
                    {i < 4 ? `= ${pctOf(step.value, capital.capitalBase)}% of capital` : `buffer = ${fmt(capital.capitalBase)} − ${fmt(capital.tvar99)}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Reconciliation footer */}
      <div className="mt-4 pt-3 border-t border-border text-[10px] text-text-faint font-mono space-y-0.5">
        <p>EL={fmt(capital.expectedLoss)} → VaR99={fmt(capital.var99)} (+{fmt(capital.var99 - capital.expectedLoss)}) → TVaR99={fmt(capital.tvar99)} (+{fmt(capital.tvar99 - capital.var99)})</p>
        <p>Buffer = Capital({fmt(capital.capitalBase)}) − TVaR99({fmt(capital.tvar99)}) = {fmt(capital.capitalBase - capital.tvar99)}</p>
        <p>Hardstop = Exposure({fmt(capital.activeExposure)}) / Limit({fmt(capital.hardstopLimit)}) = {(capital.hardstopUtilization * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
