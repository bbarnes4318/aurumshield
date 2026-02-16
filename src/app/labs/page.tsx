"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useLabs } from "@/hooks/use-mock-queries";
import { cn } from "@/lib/utils";
import { FlaskConical, Play, Archive, FileEdit, Search, AlertTriangle, Clock } from "lucide-react";

const labStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  archived: { label: "Archived", color: "text-text-faint", bg: "bg-text-faint/10" },
  draft: { label: "Draft", color: "text-info", bg: "bg-info/10" },
  review: { label: "In Review", color: "text-warning", bg: "bg-warning/10" },
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  model: FlaskConical, simulation: Play, prototype: FileEdit, research: Search,
};

function accuracyColor(acc: number | null): string {
  if (acc === null) return "text-text-faint";
  if (acc >= 90) return "text-success";
  if (acc >= 80) return "text-warning";
  return "text-danger";
}
function accuracyLabel(acc: number | null): string {
  if (acc === null) return "N/A";
  if (acc >= 90) return "PASS";
  if (acc >= 80) return "WARN";
  return "FAIL";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function LabsPage() {
  const labsQ = useLabs();
  const labs = labsQ.data ?? [];

  const activeCount = labs.filter((l) => l.status === "active").length;
  const avgAccuracy = useMemo(() => {
    const withAcc = labs.filter((l) => l.accuracy !== null);
    return withAcc.length > 0 ? withAcc.reduce((a, l) => a + (l.accuracy ?? 0), 0) / withAcc.length : 0;
  }, [labs]);
  const reviewCount = labs.filter((l) => l.status === "review").length;
  const categories = new Set(labs.map((l) => l.category));

  const exceptions = useMemo(() => {
    return labs.filter((l) => {
      if (l.status === "draft" || l.status === "archived") return true;
      if (l.accuracy !== null && l.accuracy < 80) return true;
      const days = daysSince(l.lastRun);
      if (days !== null && days > 30) return true;
      return false;
    });
  }, [labs]);

  if (labsQ.isLoading) return <LoadingState message="Loading labs…" />;
  if (labsQ.isError) return <ErrorState message="Failed to load labs." onRetry={() => labsQ.refetch()} />;

  return (
    <>
      <PageHeader title="Labs" description="Research models, simulations, and experimental prototypes — accuracy constraints and run monitoring." />

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active Models" value={String(activeCount)} change={0} trend="flat" period={`of ${labs.length}`} />
        <MetricCard label="Avg Accuracy" value={`${avgAccuracy.toFixed(1)}%`} change={0} trend={avgAccuracy >= 90 ? "up" : "flat"} period="models with data" />
        <MetricCard label="In Review" value={String(reviewCount)} change={0} trend="flat" period="awaiting approval" />
        <MetricCard label="Categories" value={String(categories.size)} change={0} trend="flat" period="model · sim · proto · research" />
      </div>

      {/* Main grid: Lab cards + Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab) => {
            const statusConf = labStatusConfig[lab.status];
            const CategoryIcon = categoryIcons[lab.category] ?? FlaskConical;
            const acColor = accuracyColor(lab.accuracy);
            const acLabel = accuracyLabel(lab.accuracy);
            const accPct = lab.accuracy ?? 0;
            const barColor = accPct >= 90 ? "bg-success" : accPct >= 80 ? "bg-warning" : accPct > 0 ? "bg-danger" : "bg-surface-3";

            return (
              <div key={lab.id} className="card-base p-5 flex flex-col">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2">
                      <CategoryIcon className="h-4 w-4 text-text-muted" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{lab.name}</h3>
                      <p className="text-xs text-text-faint capitalize">{lab.category} · {lab.owner}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusConf.bg, statusConf.color)}>
                    {statusConf.label}
                  </span>
                </div>

                <p className="mb-3 flex-1 text-sm leading-relaxed text-text-muted line-clamp-3">{lab.description}</p>

                {/* Accuracy gauge */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-text-faint">Accuracy Constraint</span>
                    <span className={cn("font-semibold", acColor)}>{lab.accuracy !== null ? `${lab.accuracy}% — ${acLabel}` : "No data"}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden relative">
                    {/* Threshold markers */}
                    <div className="absolute top-0 h-full w-px bg-warning/50 z-10" style={{ left: "80%" }} />
                    <div className="absolute top-0 h-full w-px bg-success/50 z-10" style={{ left: "90%" }} />
                    {lab.accuracy !== null && (
                      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${accPct}%` }} />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-text-faint mt-0.5 tabular-nums">
                    <span>0%</span><span className="text-warning">80%</span><span className="text-success">90%</span><span>100%</span>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-text-faint">
                  {lab.lastRun && (
                    <span className="tabular-nums">Last run: <span className="text-text font-medium">{new Date(lab.lastRun).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {(daysSince(lab.lastRun) ?? 0) > 30 && <span className="text-danger ml-1">(stale)</span>}
                    </span>
                  )}
                  {!lab.lastRun && <span className="text-text-faint italic">Never executed</span>}
                  <span className="tabular-nums">Created: {new Date(lab.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lab.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-faint">{tag}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exceptions panel */}
        <div className="card-base p-4 h-fit lg:sticky lg:top-4">
          <p className="typo-label mb-3">Exceptions</p>
          <p className="text-[11px] text-text-faint mb-3">Labs have no transaction linkage — drill-down shows lab runs and audit events instead.</p>
          {exceptions.length === 0 ? (
            <p className="text-xs text-success">✓ All labs within constraints</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((l) => {
                const isAccFail = l.accuracy !== null && l.accuracy < 80;
                const isStale = (daysSince(l.lastRun) ?? 0) > 30;
                const isDraft = l.status === "draft" || l.status === "archived";
                return (
                  <div key={l.id} className={cn("flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2", isAccFail ? "bg-danger/10" : isDraft ? "bg-surface-2" : "bg-warning/10")}>
                    {isAccFail ? <AlertTriangle className="h-4 w-4 shrink-0 text-danger mt-0.5" /> : <Clock className="h-4 w-4 shrink-0 text-warning mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-text">{l.name}</p>
                      <div className="text-xs text-text-muted space-y-0.5 mt-0.5">
                        {isAccFail && <p className="text-danger">Accuracy: {l.accuracy}% — below 80% threshold</p>}
                        {isStale && <p className="text-warning">Last run {daysSince(l.lastRun)} day(s) ago — stale</p>}
                        {isDraft && <p className="capitalize">{l.status}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
