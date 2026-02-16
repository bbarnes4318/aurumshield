"use client";

import type { ReinsuranceTreaty, DashboardCapital } from "@/lib/mock-data";

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

interface ExposureRow {
  treaty: ReinsuranceTreaty;
  attachment: number;
  cededPct: number;
  netRetained: number;
  utilization: number;
}

function computeExposure(treaties: ReinsuranceTreaty[], capital: DashboardCapital): { rows: ExposureRow[]; totals: { totalLimit: number; totalRetention: number; totalCeded: number; totalNetRetained: number } } {
  const activeExposure = capital.activeExposure;
  const inForce = treaties.filter((t) => t.status === "in-force");

  const rows: ExposureRow[] = inForce.map((t) => {
    const cededPct = t.limit > 0 ? ((t.limit - t.retention) / t.limit) * 100 : 0;
    const netRetained = activeExposure * (1 - cededPct / 100);
    const utilization = t.limit > 0 ? (activeExposure / t.limit) * 100 : 0;
    return { treaty: t, attachment: t.retention, cededPct, netRetained, utilization };
  });

  const totalLimit = inForce.reduce((a, t) => a + t.limit, 0);
  const totalRetention = inForce.reduce((a, t) => a + t.retention, 0);
  const avgCeded = totalLimit > 0 ? ((totalLimit - totalRetention) / totalLimit) * 100 : 0;
  const totalNetRetained = activeExposure * (1 - avgCeded / 100);

  return { rows, totals: { totalLimit, totalRetention, totalCeded: avgCeded, totalNetRetained } };
}

interface Props { treaties: ReinsuranceTreaty[]; capital: DashboardCapital }

export function ExposureTable({ treaties, capital }: Props) {
  const { rows, totals } = computeExposure(treaties, capital);

  return (
    <div className="card-base overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text">Exposure Breakdown — In-Force Treaties</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left">
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Treaty</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Type</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Attachment</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Limit</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Retention</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Ceded %</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Net Retained</th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ treaty: t, attachment, cededPct, netRetained, utilization }) => (
              <tr key={t.id}>
                <td className="px-3 py-2.5 font-semibold text-text">{t.treatyName}</td>
                <td className="px-3 py-2.5 capitalize text-text-muted">{t.type.replace("-", " ")}</td>
                <td className="px-3 py-2.5 tabular-nums text-right">{fmt(attachment)}</td>
                <td className="px-3 py-2.5 tabular-nums text-right">{fmt(t.limit)}</td>
                <td className="px-3 py-2.5 tabular-nums text-right">{fmt(t.retention)}</td>
                <td className="px-3 py-2.5 tabular-nums text-right font-medium">{cededPct.toFixed(1)}%</td>
                <td className="px-3 py-2.5 tabular-nums text-right">{fmt(netRetained)}</td>
                <td className="px-3 py-2.5 tabular-nums text-right">
                  <span className={utilization > 100 ? "text-danger font-semibold" : utilization > 75 ? "text-warning" : "text-success"}>{utilization.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2 font-semibold">
              <td className="px-3 py-2.5 text-text" colSpan={2}>Aggregate</td>
              <td className="px-3 py-2.5 text-right text-text-faint">—</td>
              <td className="px-3 py-2.5 tabular-nums text-right text-text">{fmt(totals.totalLimit)}</td>
              <td className="px-3 py-2.5 tabular-nums text-right text-text">{fmt(totals.totalRetention)}</td>
              <td className="px-3 py-2.5 tabular-nums text-right text-text">{totals.totalCeded.toFixed(1)}%</td>
              <td className="px-3 py-2.5 tabular-nums text-right text-text">{fmt(totals.totalNetRetained)}</td>
              <td className="px-3 py-2.5 text-right text-text-faint">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border text-[10px] text-text-faint font-mono">
        Net Retained = Active Exposure({fmt(capital.activeExposure)}) × (1 − Ceded%) | Active Exposure sourced from DashboardCapital
      </div>
    </div>
  );
}
