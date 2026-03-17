"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ErrorState } from "@/components/ui/state-views";
import {
  useIntradayCapital,
  useBreachEvents,
  useRunBreachSweep,
  useExportIntradayPacket,
} from "@/hooks/use-mock-queries";
import type { CapitalBreachLevel } from "@/lib/capital-engine";
import type { BreachEvent, BreachEventType } from "@/lib/breach-store";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Activity,
} from "lucide-react";

/* ================================================================
   FORMAT HELPERS
   ================================================================ */

function fmtUSD(n: number, compact = false): string {
  if (compact) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  }
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number, decimals = 2): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }) + " UTC";
  } catch {
    return iso;
  }
}

/* ================================================================
   VALIDATION HELPERS (strict enum parsing)
   ================================================================ */

const VALID_LEVELS: CapitalBreachLevel[] = ["CLEAR", "CAUTION", "BREACH"];
const VALID_TYPES: BreachEventType[] = [
  "ECR_CAUTION",
  "ECR_BREACH",
  "HARDSTOP_CAUTION",
  "HARDSTOP_BREACH",
  "BUFFER_NEGATIVE",
];

function parseLevel(val: string | null): CapitalBreachLevel | null {
  if (!val) return null;
  return VALID_LEVELS.includes(val as CapitalBreachLevel) ? (val as CapitalBreachLevel) : null;
}

function parseType(val: string | null): BreachEventType | null {
  if (!val) return null;
  return VALID_TYPES.includes(val as BreachEventType) ? (val as BreachEventType) : null;
}

function parseISO(val: string | null): string | null {
  if (!val) return null;
  // Basic ISO validation
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
  return null;
}

/* ================================================================
   DESIGN TOKENS
   ================================================================ */

const BREACH_BADGE: Record<CapitalBreachLevel, { label: string; cls: string; bg: string }> = {
  CLEAR: {
    label: "CLEAR",
    cls: "text-success",
    bg: "bg-success/10 border-success/30",
  },
  CAUTION: {
    label: "CAUTION",
    cls: "text-warning",
    bg: "bg-warning/10 border-warning/30",
  },
  BREACH: {
    label: "BREACH",
    cls: "text-danger",
    bg: "bg-danger/10 border-danger/30",
  },
};

const EVENT_SEVERITY: Record<BreachEvent["level"], { cls: string; bg: string }> = {
  INFO: { cls: "text-info", bg: "bg-info/10" },
  WARN: { cls: "text-warning", bg: "bg-warning/10" },
  CRITICAL: { cls: "text-danger", bg: "bg-danger/10" },
};

/* ================================================================
   TOOLTIPS
   ================================================================ */

const TOOLTIPS = {
  ecr: "Exposure-to-Capital Ratio. Target ≤ 8.0x per Phase 1 charter.",
  hardstop: "Hardstop utilization = Gross Exposure ÷ Hardstop Limit. CLEAR < 80%, CAUTION 80–95%, BREACH ≥ 95%.",
  buffer: "Buffer vs TVaR₉₉ = Capital Base − TVaR₉₉ − Tail-risk surcharge. Positive = surplus.",
  breachLevel: "Real-time classification: CLEAR → CAUTION → BREACH. Driven by ECR and hardstop thresholds.",
  topDrivers: "Top 5 exposure contributors across reservations, orders, and open settlements. Sorted by notional contribution.",
  events: "All breach events in the last 24 hours. Deterministic, idempotent — no duplicates.",
};

/* ================================================================
   SKELETON
   ================================================================ */

function IntradaySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-base p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-surface-3" />
            <div className="h-8 w-28 rounded bg-surface-3" />
            <div className="h-3 w-40 rounded bg-surface-3" />
          </div>
        ))}
      </div>
      <div className="card-base p-5 space-y-3">
        <div className="h-3 w-24 rounded bg-surface-3" />
        <div className="h-32 w-full rounded bg-surface-3" />
      </div>
      <div className="card-base p-5 space-y-3">
        <div className="h-3 w-24 rounded bg-surface-3" />
        <div className="h-48 w-full rounded bg-surface-3" />
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function IntradayPage() {
  return (
    <Suspense fallback={<IntradaySkeleton />}>
      <IntradayConsolePage />
    </Suspense>
  );
}

function IntradayConsolePage() {
  const searchParams = useSearchParams();
  const capitalQ = useIntradayCapital();
  const breachQ = useBreachEvents();
  const sweepMutation = useRunBreachSweep();
  const exportMutation = useExportIntradayPacket();

  const [sweepResult, setSweepResult] = useState<string | null>(null);

  // Memoize cutoff to avoid impure Date.now() in render path
  const [cutoff24h] = useState(() =>
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );

  /* ── URL filter parsing (strict enum validation) ── */
  const filterLevel = parseLevel(searchParams.get("level"));
  const filterType = parseType(searchParams.get("type"));
  const filterFrom = parseISO(searchParams.get("from"));
  const filterTo = parseISO(searchParams.get("to"));

  /* ── Filtered breach events ── */
  const filteredEvents = useMemo(() => {
    if (!breachQ.data) return [];
    let events = [...breachQ.data];

    // 24h window
    events = events.filter((e) => e.occurredAt >= cutoff24h);

    if (filterLevel) {
      events = events.filter((e) => e.snapshot.breachLevel === filterLevel);
    }
    if (filterType) {
      events = events.filter((e) => e.type === filterType);
    }
    if (filterFrom) {
      events = events.filter((e) => e.occurredAt >= filterFrom);
    }
    if (filterTo) {
      events = events.filter((e) => e.occurredAt <= filterTo);
    }

    return events;
  }, [breachQ.data, filterLevel, filterType, filterFrom, filterTo, cutoff24h]);

  /* ── Handlers ── */
  function handleRunSweep() {
    sweepMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.newEvents.length > 0) {
          setSweepResult(
            `Sweep complete: ${result.newEvents.length} new event(s) detected.`,
          );
        } else {
          setSweepResult("Sweep complete: No new breach conditions detected.");
        }
        setTimeout(() => setSweepResult(null), 5000);
      },
    });
  }

  function handleExport() {
    exportMutation.mutate(undefined, {
      onSuccess: () => {
        setSweepResult("Intraday packet exported to console.");
        setTimeout(() => setSweepResult(null), 4000);
      },
    });
  }

  /* ── Loading / Error states ── */
  if (capitalQ.isLoading || breachQ.isLoading) return <IntradaySkeleton />;
  if (capitalQ.isError) {
    return (
      <ErrorState
        message="Failed to load intraday capital snapshot."
        onRetry={() => capitalQ.refetch()}
      />
    );
  }
  if (!capitalQ.data) return <IntradaySkeleton />;

  const snap = capitalQ.data;
  const badge = BREACH_BADGE[snap.breachLevel];

  return (
    <>
      {/* ── Header ── */}
      <PageHeader
        title="Intraday Capital Console"
        description="Live capital adequacy, breach monitoring, and supervisory controls."
        actions={
          <div className="flex items-center gap-2 print:hidden">
            {/* Run Sweep */}
            <button
              id="btn-run-sweep"
              onClick={handleRunSweep}
              disabled={sweepMutation.isPending}
              className={cn(
                "flex items-center gap-2 rounded-input px-4 py-2 text-sm font-medium transition-colors",
                "bg-surface-2 border border-border text-text hover:bg-surface-3",
                sweepMutation.isPending && "opacity-60 cursor-not-allowed",
              )}
            >
              <RefreshCw
                className={cn("h-4 w-4", sweepMutation.isPending && "animate-spin")}
              />
              Run Sweep
            </button>

            {/* Export Packet */}
            <button
              id="btn-export-packet"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className={cn(
                "flex items-center gap-2 rounded-input px-4 py-2 text-sm font-medium transition-colors",
                "bg-surface-2 border border-border text-text hover:bg-surface-3",
                exportMutation.isPending && "opacity-60 cursor-not-allowed",
              )}
            >
              <Download className="h-4 w-4" />
              Export Packet
            </button>

            {/* Print */}
            <button
              id="btn-print"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-input bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        }
      />

      {/* ── Sweep notification ── */}
      {sweepResult && (
        <div className="rounded-sm border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info print:hidden">
          {sweepResult}
        </div>
      )}

      {/* ============================================================
         SECTION 1: KPI STRIP
         ============================================================ */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="typo-label">Capital Snapshot</h2>
          <span className="text-[10px] tabular-nums text-text-faint">{fmtTime(snap.asOf)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* ECR */}
          <div className="card-base px-5 py-4">
            <div className="mb-1 flex items-center gap-1.5">
              <p className="typo-label">ECR</p>
              <InfoTooltip content={TOOLTIPS.ecr} />
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                snap.ecr >= 8 ? "text-danger" : snap.ecr >= 6 ? "text-warning" : "text-success",
              )}
            >
              {snap.ecr.toFixed(2)}x
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-text-faint">
              {fmtUSD(snap.grossExposureNotional, true)} ÷ {fmtUSD(snap.capitalBase, true)}
            </p>
          </div>

          {/* Hardstop Utilization */}
          <div className="card-base px-5 py-4">
            <div className="mb-1 flex items-center gap-1.5">
              <p className="typo-label">Hardstop %</p>
              <InfoTooltip content={TOOLTIPS.hardstop} />
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                snap.hardstopUtilization >= 0.95
                  ? "text-danger"
                  : snap.hardstopUtilization >= 0.8
                    ? "text-warning"
                    : "text-success",
              )}
            >
              {fmtPct(snap.hardstopUtilization)}
            </p>
            <div className="mt-2 relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all",
                  snap.hardstopUtilization >= 0.95
                    ? "bg-danger"
                    : snap.hardstopUtilization >= 0.8
                      ? "bg-warning"
                      : "bg-success",
                )}
                style={{
                  width: `${Math.min(snap.hardstopUtilization * 100, 100)}%`,
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-text-faint">
              <span>{fmtUSD(snap.grossExposureNotional, true)} used</span>
              <span>{fmtUSD(snap.hardstopLimit, true)} limit</span>
            </div>
          </div>

          {/* Buffer vs TVaR₉₉ */}
          <div className="card-base px-5 py-4">
            <div className="mb-1 flex items-center gap-1.5">
              <p className="typo-label">Buffer</p>
              <InfoTooltip content={TOOLTIPS.buffer} />
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                snap.bufferVsTvar99 >= 0 ? "text-success" : "text-danger",
              )}
            >
              {snap.bufferVsTvar99 >= 0 ? "+" : ""}
              {fmtUSD(snap.bufferVsTvar99, true)}
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-text-faint">
              vs TVaR₉₉ tail-risk
            </p>
          </div>

          {/* Breach Level */}
          <div className={cn("card-base px-5 py-4 border", badge.bg)}>
            <div className="mb-1 flex items-center gap-1.5">
              <p className="typo-label">Breach Level</p>
              <InfoTooltip content={TOOLTIPS.breachLevel} />
            </div>
            <div className="flex items-center gap-3">
              {snap.breachLevel === "CLEAR" ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : snap.breachLevel === "CAUTION" ? (
                <AlertTriangle className="h-6 w-6 text-warning" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-danger" />
              )}
              <span
                className={cn(
                  "text-xl font-bold tracking-wider",
                  badge.cls,
                )}
              >
                {badge.label}
              </span>
            </div>
            {snap.breachReasons.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {snap.breachReasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-text-faint">
                    • {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
         SECTION 2: EXPOSURE BREAKDOWN
         ============================================================ */}
      <section>
        <h2 className="typo-label mb-3">Exposure Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Reserved", value: snap.reservedNotional, sub: "ACTIVE × haircut 35%" },
            { label: "Allocated", value: snap.allocatedNotional, sub: "CONVERTED + inventory" },
            { label: "Settlement Open", value: snap.settlementNotionalOpen, sub: "ESCROW → AUTHORIZED" },
            { label: "Settled Today", value: snap.settledNotionalToday, sub: "SETTLED this session" },
          ].map((item) => (
            <div key={item.label} className="card-base px-4 py-3">
              <p className="typo-label mb-1">{item.label}</p>
              <p className="text-lg font-semibold tabular-nums text-text">{fmtUSD(item.value, true)}</p>
              <p className="mt-0.5 text-[10px] text-text-faint">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
         SECTION 3: TOP DRIVERS
         ============================================================ */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gold" />
          <h2 className="typo-label">Top Exposure Drivers</h2>
          <InfoTooltip content={TOOLTIPS.topDrivers} />
        </div>

        <div className="card-base overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 typo-label font-semibold">#</th>
                <th className="px-4 py-2.5 typo-label font-semibold">Driver</th>
                <th className="px-4 py-2.5 typo-label font-semibold text-right">Contribution</th>
                <th className="px-4 py-2.5 typo-label font-semibold text-right">ID</th>
              </tr>
            </thead>
            <tbody>
              {snap.topDrivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-faint">
                    No active exposure drivers.
                  </td>
                </tr>
              ) : (
                snap.topDrivers.map((d, i) => (
                  <tr key={d.id ?? i} className="border-b border-border/50 last:border-b-0">
                    <td className="px-4 py-2.5 tabular-nums text-text-faint">{i + 1}</td>
                    <td className="px-4 py-2.5 text-text">{d.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gold">
                      {fmtUSD(d.value, true)}
                    </td>
                    <td className="px-4 py-2.5 text-right typo-mono text-text-faint">
                      {d.id ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================
         SECTION 4: BREACH EVENTS (24h)
         ============================================================ */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-warning" />
          <h2 className="typo-label">Breach Events (24h)</h2>
          <InfoTooltip content={TOOLTIPS.events} />
          {filteredEvents.length > 0 && (
            <span className="ml-auto text-xs tabular-nums text-text-faint">
              {filteredEvents.length} event(s)
            </span>
          )}
        </div>

        {/* Active filters display */}
        {(filterLevel || filterType || filterFrom || filterTo) && (
          <div className="mb-2 flex flex-wrap gap-2 print:hidden">
            {filterLevel && (
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border">
                Level: {filterLevel}
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border">
                Type: {filterType}
              </span>
            )}
            {filterFrom && (
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border">
                From: {filterFrom}
              </span>
            )}
            {filterTo && (
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border">
                To: {filterTo}
              </span>
            )}
          </div>
        )}

        <div className="card-base overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 typo-label font-semibold">Time</th>
                <th className="px-4 py-2.5 typo-label font-semibold">Type</th>
                <th className="px-4 py-2.5 typo-label font-semibold">Severity</th>
                <th className="px-4 py-2.5 typo-label font-semibold">Message</th>
                <th className="px-4 py-2.5 typo-label font-semibold text-right">ECR</th>
                <th className="px-4 py-2.5 typo-label font-semibold text-right">Hardstop %</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-faint">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                      <span>No breach events in the last 24 hours.</span>
                      <span className="text-[10px]">
                        Click &quot;Run Sweep&quot; to evaluate current conditions.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const sev = EVENT_SEVERITY[evt.level];
                  return (
                    <tr key={evt.id} className="border-b border-border/50 last:border-b-0">
                      <td className="px-4 py-2.5 tabular-nums text-text-faint whitespace-nowrap text-xs">
                        {fmtTime(evt.occurredAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border">
                          {evt.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            sev.bg,
                            sev.cls,
                          )}
                        >
                          {evt.level === "CRITICAL" && <AlertTriangle className="h-3 w-3" />}
                          {evt.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text max-w-xs truncate">{evt.message}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                        {evt.snapshot.ecr.toFixed(2)}x
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                        {fmtPct(evt.snapshot.hardstopUtilization)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================
         PRINT STYLES
         ============================================================ */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside,
          nav,
          header,
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .card-base {
            border: 1px solid #ddd !important;
            background: white !important;
            break-inside: avoid;
          }
          table {
            font-size: 11px !important;
          }
          h2 {
            font-size: 14px !important;
            font-weight: 700 !important;
            margin-bottom: 8px !important;
          }
          section {
            margin-bottom: 16px !important;
          }
          /* Force text colors for print */
          .text-success,
          .text-warning,
          .text-danger,
          .text-gold,
          .text-info {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
