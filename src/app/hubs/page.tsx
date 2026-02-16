"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { DrillDownDrawer } from "@/components/ui/drill-down-drawer";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useHubs, useTransactions, useDashboardData } from "@/hooks/use-mock-queries";
import { cn } from "@/lib/utils";
import { Server, Activity, Wifi, AlertTriangle, XCircle } from "lucide-react";

const hubStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  operational: { label: "Operational", color: "text-success", dot: "bg-success" },
  degraded: { label: "Degraded", color: "text-warning", dot: "bg-warning" },
  maintenance: { label: "Maintenance", color: "text-info", dot: "bg-info" },
  offline: { label: "Offline", color: "text-danger", dot: "bg-danger" },
};

const hubTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  clearing: Activity, custody: Server, settlement: Wifi, trading: Activity,
};

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

export default function HubsPage() {
  const hubsQ = useHubs();
  const txQ = useTransactions();
  const dashQ = useDashboardData("phase1");
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const hubs = hubsQ.data ?? [];
  const txns = txQ.data ?? [];
  const hubConc = dashQ.data?.hubConcentration;

  const totalCapacity = hubs.reduce((a, h) => a + h.capacity, 0);
  const avgUptime = hubs.length > 0 ? hubs.reduce((a, h) => a + h.uptime, 0) / hubs.length : 0;
  const operational = hubs.filter((h) => h.status === "operational").length;
  const totalHHI = hubConc?.totalHHI ?? 0;

  const exceptions = useMemo(() => hubs.filter((h) => h.status !== "operational"), [hubs]);

  const drawerTxns = useMemo(() => txns.filter((t) => t.hubId === selectedHubId), [txns, selectedHubId]);
  const drawerHub = hubs.find((h) => h.id === selectedHubId);

  if (hubsQ.isLoading || txQ.isLoading || dashQ.isLoading) return <LoadingState message="Loading hubs…" />;
  if (hubsQ.isError) return <ErrorState message="Failed to load hubs." onRetry={() => hubsQ.refetch()} />;

  return (
    <>
      <PageHeader title="Hubs" description="Infrastructure nodes — clearing, custody, settlement, and trading. Concentration and capacity monitoring." />

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Operational" value={`${operational} / ${hubs.length}`} change={0} trend="flat" period="hubs online" />
        <MetricCard label="Total Capacity" value={totalCapacity.toLocaleString()} change={0} trend="flat" period="ops/day" />
        <MetricCard label="Avg Uptime" value={`${avgUptime.toFixed(2)}%`} change={0} trend="flat" period="trailing 30d" />
        <MetricCard label="Total HHI" value={totalHHI.toLocaleString()} change={0} trend={totalHHI > 2500 ? "down" : "flat"} period={totalHHI > 2500 ? "concentrated" : "diversified"} />
      </div>

      {/* Hub Concentration cards */}
      {hubConc && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {hubConc.hubs.map((hc) => {
            const barColor = hc.percentage > 35 ? "bg-danger" : hc.percentage > 25 ? "bg-warning" : "bg-success";
            return (
              <div key={hc.hubId} className="card-base p-4 cursor-pointer hover:border-gold/30 transition-colors" onClick={() => setSelectedHubId(hc.hubId)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedHubId(hc.hubId)}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-text truncate">{hc.hubName}</p>
                  <InfoTooltip content={`Exposure: ${fmt(hc.exposure)}\nConcentration: ${hc.percentage}%\nHHI contribution: ${hc.hhi}`} side="bottom" />
                </div>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-lg font-bold tabular-nums text-text">{hc.percentage.toFixed(1)}%</span>
                  <span className="text-xs text-text-faint">{fmt(hc.exposure)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(100, hc.percentage)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-text-faint tabular-nums">HHI: {hc.hhi} · {hc.type}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main grid: Hub tiles + Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hubs.map((hub) => {
            const statusConf = hubStatusConfig[hub.status];
            const TypeIcon = hubTypeIcons[hub.type] ?? Server;
            const utilColor = hub.utilization > 85 ? "bg-danger" : hub.utilization > 70 ? "bg-warning" : "bg-success";

            return (
              <div key={hub.id} onClick={() => setSelectedHubId(hub.id)} className="card-base p-5 cursor-pointer hover:border-gold/30 transition-colors" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedHubId(hub.id)}>
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2">
                      <TypeIcon className="h-4 w-4 text-text-muted" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{hub.name}</h3>
                      <p className="text-xs text-text-faint">{hub.location}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", statusConf.color)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusConf.dot)} />
                    {statusConf.label}
                  </span>
                </div>

                {/* Utilization bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-text-faint mb-1">
                    <span>Utilization</span>
                    <span className="tabular-nums font-medium">{hub.utilization}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", utilColor)} style={{ width: `${hub.utilization}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-sm)] bg-surface-2 p-3">
                  <div className="text-center">
                    <p className="typo-label">Capacity</p>
                    <p className="tabular-nums text-sm font-semibold text-text">{hub.capacity.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="typo-label">Uptime</p>
                    <p className="tabular-nums text-sm font-semibold text-text">{hub.uptime}%</p>
                  </div>
                  <div className="text-center">
                    <p className="typo-label">Corridors</p>
                    <p className="tabular-nums text-sm font-semibold text-text">{hub.connectedCorridors}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exceptions panel */}
        <div className="card-base p-4 h-fit lg:sticky lg:top-4">
          <p className="typo-label mb-3">Exceptions</p>
          {exceptions.length === 0 ? (
            <p className="text-xs text-success">✓ All hubs operational</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((h) => {
                const severe = h.status === "offline";
                return (
                  <div key={h.id} className={cn("flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2", severe ? "bg-danger/10" : h.status === "degraded" ? "bg-warning/10" : "bg-info/10")}>
                    {severe ? <XCircle className="h-4 w-4 shrink-0 text-danger mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-text">{h.name}</p>
                      <p className="text-xs text-text-muted capitalize">{h.status} · {h.location}</p>
                      {h.utilization > 85 && <p className="text-[11px] text-danger mt-0.5">Utilization: {h.utilization}% — capacity warning</p>}
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
        open={!!selectedHubId}
        onClose={() => setSelectedHubId(null)}
        title={drawerHub?.name ?? ""}
        subtitle={`${drawerHub?.location} · ${drawerHub?.type}`}
        transactions={drawerTxns}
      />
    </>
  );
}
