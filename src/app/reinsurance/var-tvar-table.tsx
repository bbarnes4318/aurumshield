"use client";

import { cn } from "@/lib/utils";
import type { DashboardCapital } from "@/lib/mock-data";

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

interface MetricRow {
  metric: string;
  value: number;
  pctOfCapital: number;
  status: "GREEN" | "AMBER" | "RED";
}

const STATUS_STYLE: Record<string, string> = {
  GREEN: "text-success bg-success/10", AMBER: "text-warning bg-warning/10", RED: "text-danger bg-danger/10",
};

function buildMetrics(c: DashboardCapital): MetricRow[] {
  const capitalAdequate = c.capitalBase >= c.tvar99;
  const bufferTight = c.capitalBase - c.tvar99 < c.capitalBase * 0.15;

  return [
    { metric: "Expected Loss (EL)", value: c.expectedLoss, pctOfCapital: (c.expectedLoss / c.capitalBase) * 100, status: c.expectedLoss < c.capitalBase * 0.5 ? "GREEN" : "AMBER" },
    { metric: "VaR 95%", value: c.var95, pctOfCapital: (c.var95 / c.capitalBase) * 100, status: c.var95 < c.capitalBase * 0.6 ? "GREEN" : c.var95 < c.capitalBase * 0.8 ? "AMBER" : "RED" },
    { metric: "VaR 99%", value: c.var99, pctOfCapital: (c.var99 / c.capitalBase) * 100, status: c.var99 < c.capitalBase * 0.7 ? "GREEN" : c.var99 < c.capitalBase ? "AMBER" : "RED" },
    { metric: "TVaR 99%", value: c.tvar99, pctOfCapital: (c.tvar99 / c.capitalBase) * 100, status: capitalAdequate ? (bufferTight ? "AMBER" : "GREEN") : "RED" },
    { metric: "Capital Buffer", value: c.capitalBase - c.tvar99, pctOfCapital: ((c.capitalBase - c.tvar99) / c.capitalBase) * 100, status: capitalAdequate ? "GREEN" : "RED" },
    { metric: "ECR (Exposure / Capital)", value: c.activeExposure / c.capitalBase, pctOfCapital: 0, status: c.ecr <= 6 ? "GREEN" : c.ecr <= 8 ? "AMBER" : "RED" },
  ];
}

export function VarTvarTable({ capital }: { capital: DashboardCapital }) {
  const metrics = buildMetrics(capital);

  return (
    <div className="card-base overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text">Risk Metrics — VaR / TVaR</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Metric</th>
            <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Value ($)</th>
            <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">% of Capital</th>
            <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map((m) => {
            const isECR = m.metric.startsWith("ECR");
            return (
              <tr key={m.metric}>
                <td className="px-3 py-2.5 text-text">{m.metric}</td>
                <td className="px-3 py-2.5 tabular-nums text-right font-semibold text-text">
                  {isECR ? `${m.value.toFixed(1)}×` : fmt(m.value)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-right text-text-muted">
                  {isECR ? `${capital.ecr.toFixed(1)}×` : `${m.pctOfCapital.toFixed(1)}%`}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLE[m.status])}>
                    {m.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-border text-[10px] text-text-faint font-mono">
        Status: Capital({fmt(capital.capitalBase)}) {capital.capitalBase >= capital.tvar99 ? "≥" : "<"} TVaR99({fmt(capital.tvar99)}) → {capital.capitalBase >= capital.tvar99 ? "ADEQUATE" : "INADEQUATE"} | ECR = {fmt(capital.activeExposure)} / {fmt(capital.capitalBase)} = {capital.ecr.toFixed(1)}×
      </div>
    </div>
  );
}
