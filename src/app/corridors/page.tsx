"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { DrillDownDrawer } from "@/components/ui/drill-down-drawer";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useCorridors, useTransactions, useDashboardData } from "@/hooks/use-mock-queries";
import { cn } from "@/lib/utils";
import { AlertTriangle, XCircle } from "lucide-react";

const STATUS_CHIP: Record<string, string> = {
  active: "bg-success/10 text-success", restricted: "bg-warning/10 text-warning", suspended: "bg-danger/10 text-danger",
};

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

export default function CorridorsPage() {
  const corQ = useCorridors();
  const txQ = useTransactions();
  const dashQ = useDashboardData("phase1");
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);

  const corridors = corQ.data ?? [];
  const txns = txQ.data ?? [];
  const tiers = dashQ.data?.corridorTiers.tiers ?? [];

  const totalVolume = useMemo(() => corridors.reduce((a, c) => a + c.volume, 0), [corridors]);
  const activeCount = corridors.filter((c) => c.status === "active").length;
  const restrictedCount = corridors.filter((c) => c.status === "restricted").length;
  const suspendedCount = corridors.filter((c) => c.status === "suspended").length;

  const exceptions = useMemo(() => corridors.filter((c) => c.status !== "active"), [corridors]);

  const drawerTxns = useMemo(() => txns.filter((t) => t.corridorId === selectedCorridorId), [txns, selectedCorridorId]);
  const drawerCorridor = corridors.find((c) => c.id === selectedCorridorId);

  if (corQ.isLoading || txQ.isLoading || dashQ.isLoading) return <LoadingState message="Loading corridors…" />;
  if (corQ.isError) return <ErrorState message="Failed to load corridors." onRetry={() => corQ.refetch()} />;

  return (
    <>
      <PageHeader title="Corridors" description="Cross-border payment corridors — caps, concentration, and constraint monitoring." />

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Volume" value={fmt(totalVolume)} change={0} trend="flat" period="all corridors" />
        <MetricCard label="Active" value={String(activeCount)} change={0} trend="flat" period={`of ${corridors.length}`} />
        <MetricCard label="Restricted" value={String(restrictedCount)} change={0} trend={restrictedCount > 0 ? "down" : "flat"} period="exceptions" />
        <MetricCard label="Suspended" value={String(suspendedCount)} change={0} trend={suspendedCount > 0 ? "down" : "flat"} period="blocked" />
      </div>

      {/* Tier cap cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => {
          const pct = tier.utilization * 100;
          const barColor = pct > 90 ? "bg-danger" : pct > 75 ? "bg-warning" : "bg-success";
          return (
            <div key={tier.tier} className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text">{tier.label}</p>
                <InfoTooltip content={`Exposure: ${fmt(tier.exposure)}\nLimit: ${fmt(tier.limit)}\nUtil: ${pct.toFixed(1)}%\n${tier.corridorCount} corridor(s)`} side="bottom" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-lg font-bold tabular-nums text-text">{fmt(tier.exposure)}</span>
                <span className="text-xs text-text-faint">/ {fmt(tier.limit)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-text-faint tabular-nums">{pct.toFixed(1)}% utilized · {tier.corridorCount} corridor(s)</p>
            </div>
          );
        })}
      </div>

      {/* Main grid: Corridor table + Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Corridor table */}
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left">
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Corridor</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Risk</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint">Status</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Volume</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Conc %</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Txns</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-faint text-right">Avg Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {corridors.map((c) => {
                  const concPct = totalVolume > 0 ? (c.volume / totalVolume) * 100 : 0;
                  return (
                    <tr key={c.id} onClick={() => setSelectedCorridorId(c.id)} className="cursor-pointer hover:bg-surface-2/50 transition-colors" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedCorridorId(c.id)}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text">{c.name}</div>
                        <div className="text-[11px] text-text-faint">{c.sourceCountry} → {c.destinationCountry}</div>
                      </td>
                      <td className="px-3 py-2.5"><RiskBadge level={c.riskLevel} /></td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_CHIP[c.status])}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />{c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-right font-medium">{fmt(c.volume)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-right">{concPct.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 tabular-nums text-right">{c.transactionCount}</td>
                      <td className="px-3 py-2.5 tabular-nums text-right">{c.avgSettlementHours.toFixed(1)}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exceptions panel */}
        <div className="card-base p-4 h-fit lg:sticky lg:top-4">
          <p className="typo-label mb-3">Exceptions</p>
          {exceptions.length === 0 ? (
            <p className="text-xs text-success">✓ All corridors operational</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((c) => {
                const isSusp = c.status === "suspended";
                return (
                  <div key={c.id} className={cn("flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2", isSusp ? "bg-danger/10" : "bg-warning/10")}>
                    {isSusp ? <XCircle className="h-4 w-4 shrink-0 text-danger mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-text">{c.name}</p>
                      <p className="text-xs text-text-muted capitalize">{c.status} · Risk: {c.riskLevel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drill-down drawer */}
      <DrillDownDrawer
        open={!!selectedCorridorId}
        onClose={() => setSelectedCorridorId(null)}
        title={drawerCorridor?.name ?? ""}
        subtitle={`${drawerCorridor?.sourceCountry} → ${drawerCorridor?.destinationCountry}`}
        transactions={drawerTxns}
      />
    </>
  );
}
