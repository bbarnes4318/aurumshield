"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ErrorState } from "@/components/ui/state-views";
import { RequireRole } from "@/components/auth/require-role";
import { useDashboardData, useCapitalControls, useIntradayCapital } from "@/hooks/use-mock-queries";
import Link from "next/link";
import type {
  DashboardScenario,
  DashboardCapital,
  TRIBand,
  CorridorTier,
  HubConcentration,
  TransactionByState,
  BlockedTransition,
  EvidenceValidation,
  WORMSegment,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldOff,
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
  return `$${n.toLocaleString("en-US")}`;
}

function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/* ================================================================
   DESIGN-TOKEN BAR COLOURS
   ================================================================ */
const TRI_BAND_COLORS: Record<string, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
};

const CORRIDOR_UTIL_COLOR = (u: number): string => {
  if (u >= 0.9) return "bg-danger";
  if (u >= 0.7) return "bg-warning";
  return "bg-success";
};

const TXN_STATE_COLORS: Record<string, string> = {
  completed: "bg-success",
  processing: "bg-info",
  pending: "bg-warning",
  failed: "bg-danger",
  reversed: "bg-text-faint",
};

const TXN_STATE_TEXT: Record<string, string> = {
  completed: "text-success",
  processing: "text-info",
  pending: "text-warning",
  failed: "text-danger",
  reversed: "text-text-faint",
};

const WORM_COLORS: Record<string, string> = {
  verified: "bg-success",
  stored: "bg-info",
  pending: "bg-warning",
  quarantined: "bg-danger",
};

const VALIDATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pass: CheckCircle2,
  warn: AlertCircle,
  fail: XCircle,
};

const VALIDATION_COLORS: Record<string, string> = {
  pass: "text-success",
  warn: "text-warning",
  fail: "text-danger",
};

const HARDSTOP_CONFIG = {
  green: { label: "CLEAR", color: "text-success", bg: "bg-success", bgFaint: "bg-success/10", border: "border-success/30" },
  amber: { label: "CAUTION", color: "text-warning", bg: "bg-warning", bgFaint: "bg-warning/10", border: "border-warning/30" },
  red: { label: "BREACH", color: "text-danger", bg: "bg-danger", bgFaint: "bg-danger/10", border: "border-danger/30" },
};

/* ================================================================
   TOOLTIP DEFINITIONS (AurumShield)
   ================================================================ */
const TOOLTIPS = {
  capitalPanel: "Capital adequacy metrics for the AurumShield entity. All figures derived from the active position book and regulatory capital instruments.",
  capitalBase: "Sum of Tier-1 (paid-in capital + retained earnings) and Tier-2 (subordinated debt + revaluation reserves) capital instruments.",
  activeExposure: "Net mark-to-market exposure across all active counterparties, aggregated from the position ledger.",
  ecr: "ECR = Active Exposure ÷ Capital Base. Measures leverage multiple. AurumShield Phase 1 charter target: ≤ 8.0x.",
  bufferVsTvar: "Buffer vs TVaR₉₉ = Capital Base − TVaR₉₉. Positive value indicates surplus capital above the 99th-percentile tail loss. Negative = capital shortfall.",
  hardstop: "Hardstop Utilization = Active Exposure ÷ Hardstop Limit. Green < 75%, Amber 75–90%, Red ≥ 90%. Hardstop Limit set by Board Charter.",
  triBands: "Total Risk Index (TRI) band distribution. Counterparties classified into Green (1–3), Amber (4–6), Red (7–10) bands by composite risk score.",
  corridorTiers: "Corridor exposure by regulatory tier. Utilization = Tier Exposure ÷ Tier Limit. Colour thresholds: Green < 70%, Amber 70–90%, Red ≥ 90%.",
  hubConcentration: "Exposure concentration across clearing/custody/settlement hubs. HHI per hub = (hub exposure ÷ total exposure)² × 10,000. Total HHI > 2,500 = highly concentrated.",
  txnByState: "Transaction lifecycle state distribution. Count and aggregate volume per state (completed, processing, pending, failed, reversed).",
  blockedTransitions: "Transactions blocked from advancing to the next lifecycle state. Requires manual intervention. Severity: Critical = SLA breach, Warning = awaiting approval.",
  evidenceValidations: "Automated compliance engine validation results. Rules: hash integrity, signature verification, classification labeling, retention period, quorum checks.",
  wormStatus: "Write-Once Read-Many (WORM) immutable storage status. Documents progress through: Pending → Stored → Verified. Quarantined = integrity check failure.",
};

/* ================================================================
   SKELETON COMPONENTS
   ================================================================ */

function SkeletonPanel() {
  return (
    <div className="card-base p-5 space-y-3 animate-pulse">
      <div className="h-3 w-24 rounded bg-surface-3" />
      <div className="h-8 w-32 rounded bg-surface-3" />
      <div className="h-3 w-48 rounded bg-surface-3" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonPanel key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPanel key={i} />)}
      </div>
      <SkeletonPanel />
    </div>
  );
}

/* ================================================================
   CAPITAL METRIC CELL
   ================================================================ */
function CapitalCell({
  label,
  value,
  sub,
  tooltip,
  highlight,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tooltip: string;
  highlight?: "success" | "warning" | "danger" | "gold";
  className?: string;
}) {
  const highlightColor: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    gold: "text-gold",
  };

  return (
    <div className={cn("card-base px-6 py-5", className)}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <p className="typo-label">{label}</p>
        <InfoTooltip content={tooltip} />
      </div>
      <p
        className={cn(
          "text-[1.375rem] font-semibold tabular-nums tracking-tight",
          highlight ? highlightColor[highlight] : "text-text"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] tabular-nums text-text-faint/70">{sub}</p>}
    </div>
  );
}

/* ================================================================
   HARDSTOP STATUS CELL
   ================================================================ */
function HardstopCell({ capital }: { capital: DashboardCapital }) {
  const cfg = HARDSTOP_CONFIG[capital.hardstopStatus];

  return (
    <div className={cn("card-base px-5 py-4 border", cfg.border)}>
      <div className="mb-1 flex items-center gap-1.5">
        <p className="typo-label">Hardstop</p>
        <InfoTooltip content={TOOLTIPS.hardstop} />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("text-sm font-bold tracking-wider", cfg.color)}>{cfg.label}</span>
        <span className="tabular-nums text-xs text-text-faint">{fmtPct(capital.hardstopUtilization, 1)}</span>
      </div>
      {/* Utilization bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", cfg.bg)}
          style={{ width: `${Math.min(capital.hardstopUtilization * 100, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-text-faint">
        <span>{fmtUSD(capital.activeExposure, true)} used</span>
        <span>{fmtUSD(capital.hardstopLimit, true)} limit</span>
      </div>
    </div>
  );
}

/* ================================================================
   TRI BAND DISTRIBUTION
   ================================================================ */
function TRIBandPanel({ bands, asOf }: { bands: TRIBand[]; asOf: string }) {
  const total = bands.reduce((a, b) => a + b.exposure, 0);

  return (
    <DashboardPanel title="TRI Band Distribution" tooltip={TOOLTIPS.triBands} asOf={asOf}>
      {/* Stacked bar */}
      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {bands.map((b) => (
          <div
            key={b.band}
            className={cn("h-full transition-all first:rounded-l-full last:rounded-r-full", TRI_BAND_COLORS[b.band])}
            style={{ width: `${b.percentage}%` }}
            title={`${b.label}: ${b.percentage}%`}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {bands.map((b) => (
          <div key={b.band} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-[3px]", TRI_BAND_COLORS[b.band])} />
              <span className="text-text-muted">{b.label}</span>
            </div>
            <div className="flex items-center gap-4 tabular-nums">
              <span className="text-text-faint">{b.count} CPs</span>
              <span className="w-16 text-right font-medium text-text">{fmtUSD(b.exposure, true)}</span>
              <span className="w-12 text-right text-text-faint">{b.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs text-text-faint">
        <span>Total Exposure</span>
        <span className="tabular-nums font-medium text-text">{fmtUSD(total, true)}</span>
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   CORRIDOR TIER EXPOSURE
   ================================================================ */
function CorridorTierPanel({ tiers, asOf }: { tiers: CorridorTier[]; asOf: string }) {
  return (
    <DashboardPanel title="Corridor Tier Exposure" tooltip={TOOLTIPS.corridorTiers} asOf={asOf}>
      <div className="space-y-3">
        {tiers.map((t) => (
          <div key={t.tier}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-text-muted">{t.label}</span>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-text-faint">{t.corridorCount} corridors</span>
                <span className="font-medium text-text">{fmtUSD(t.exposure, true)}</span>
                <span className="w-12 text-right text-xs text-text-faint">{fmtPct(t.utilization, 1)}</span>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full transition-all", CORRIDOR_UTIL_COLOR(t.utilization))}
                style={{ width: `${Math.min(t.utilization * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   HUB CONCENTRATION
   ================================================================ */
function HubConcentrationPanel({
  hubs,
  totalHHI,
  asOf,
}: {
  hubs: HubConcentration[];
  totalHHI: number;
  asOf: string;
}) {
  const hhiStatus = totalHHI >= 2500 ? "Highly Concentrated" : totalHHI >= 1500 ? "Moderately Concentrated" : "Diversified";
  const hhiColor = totalHHI >= 2500 ? "text-danger" : totalHHI >= 1500 ? "text-warning" : "text-success";

  return (
    <DashboardPanel title="Hub Concentration" tooltip={TOOLTIPS.hubConcentration} asOf={asOf}>
      {/* HHI badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="typo-label">HHI</span>
        <span className={cn("tabular-nums text-sm font-semibold", hhiColor)}>{totalHHI.toLocaleString()}</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-wider", hhiColor)}>{hhiStatus}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 typo-label font-semibold">Hub</th>
              <th className="pb-2 pr-4 typo-label font-semibold text-right">Exposure</th>
              <th className="pb-2 pr-4 typo-label font-semibold text-right">Share</th>
              <th className="pb-2 typo-label font-semibold text-right">HHI</th>
            </tr>
          </thead>
          <tbody>
            {hubs.map((h) => (
              <tr key={h.hubId} className="border-b border-border/50 last:border-b-0">
                <td className="py-2 pr-4">
                  <span className="text-text">{h.hubName}</span>
                  <span className="ml-2 text-[10px] text-text-faint">{h.type}</span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-text-muted">{fmtUSD(h.exposure, true)}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-text-muted">{h.percentage.toFixed(1)}%</td>
                <td className="py-2 text-right tabular-nums text-text-faint">{h.hhi.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   TRANSACTIONS BY STATE
   ================================================================ */
function TxnByStatePanel({
  states,
  asOf,
}: {
  states: TransactionByState[];
  asOf: string;
}) {
  const totalCount = states.reduce((a, s) => a + s.count, 0);
  const totalVolume = states.reduce((a, s) => a + s.volume, 0);

  return (
    <DashboardPanel title="Transactions by State" tooltip={TOOLTIPS.txnByState} asOf={asOf}>
      {/* Stacked bar */}
      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {states.map((s) => {
          const pct = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
          return (
            <div
              key={s.state}
              className={cn("h-full transition-all first:rounded-l-full last:rounded-r-full", TXN_STATE_COLORS[s.state])}
              style={{ width: `${pct}%` }}
              title={`${s.state}: ${s.count}`}
            />
          );
        })}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {states.map((s) => (
          <div key={s.state} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-[3px]", TXN_STATE_COLORS[s.state])} />
              <span className="capitalize text-text-muted">{s.state}</span>
            </div>
            <div className="flex items-center gap-4 tabular-nums">
              <span className={cn("font-medium", TXN_STATE_TEXT[s.state])}>{s.count}</span>
              <span className="w-20 text-right text-text-faint">{fmtUSD(s.volume, true)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs text-text-faint">
        <span>{totalCount} transactions</span>
        <span className="tabular-nums font-medium text-text">{fmtUSD(totalVolume, true)}</span>
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   BLOCKED TRANSITIONS
   ================================================================ */
function BlockedTransitionsPanel({
  transitions,
  asOf,
}: {
  transitions: BlockedTransition[];
  asOf: string;
}) {
  return (
    <DashboardPanel title="Blocked Transitions" tooltip={TOOLTIPS.blockedTransitions} asOf={asOf} fullWidth>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 typo-label font-semibold">Reference</th>
              <th className="pb-2 pr-4 typo-label font-semibold">Counterparty</th>
              <th className="pb-2 pr-4 typo-label font-semibold">Reason</th>
              <th className="pb-2 pr-4 typo-label font-semibold">Blocked Since</th>
              <th className="pb-2 typo-label font-semibold text-right">Severity</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t) => (
              <tr key={t.id} className="border-b border-border/50 last:border-b-0">
                <td className="py-2.5 pr-4 typo-mono text-gold">{t.reference}</td>
                <td className="py-2.5 pr-4 text-text">{t.counterparty}</td>
                <td className="py-2.5 pr-4 text-text-muted max-w-xs">{t.reason}</td>
                <td className="py-2.5 pr-4 tabular-nums text-text-faint whitespace-nowrap">
                  {new Date(t.blockedSince).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      t.severity === "critical"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {t.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   EVIDENCE VALIDATIONS
   ================================================================ */
function EvidenceValidationsPanel({
  validations,
  asOf,
}: {
  validations: EvidenceValidation[];
  asOf: string;
}) {
  return (
    <DashboardPanel title="Recent Evidence Validations" tooltip={TOOLTIPS.evidenceValidations} asOf={asOf}>
      <div className="space-y-2.5">
        {validations.map((v) => {
          const Icon = VALIDATION_ICONS[v.result];
          const color = VALIDATION_COLORS[v.result];
          return (
            <div key={v.id} className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2.5">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{v.title}</p>
                <p className="mt-0.5 text-xs text-text-faint">{v.rule}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-xs font-semibold uppercase", color)}>{v.result}</p>
                <p className="mt-0.5 text-[10px] tabular-nums text-text-faint">
                  {new Date(v.checkedAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   WORM STORAGE STATUS
   ================================================================ */
function WORMStatusPanel({
  segments,
  totalDocuments,
  asOf,
}: {
  segments: WORMSegment[];
  totalDocuments: number;
  asOf: string;
}) {
  return (
    <DashboardPanel title="WORM Storage Status" tooltip={TOOLTIPS.wormStatus} asOf={asOf}>
      {/* Segmented bar */}
      <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.status}
            className={cn("h-full transition-all first:rounded-l-full last:rounded-r-full", WORM_COLORS[seg.status])}
            style={{ width: `${seg.percentage}%` }}
            title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-[3px]", WORM_COLORS[seg.status])} />
              <span className="text-text-muted">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="font-medium text-text">{seg.count.toLocaleString()}</span>
              <span className="text-xs text-text-faint">{seg.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs text-text-faint">
        <span>Total Documents</span>
        <span className="tabular-nums font-medium text-text">{totalDocuments.toLocaleString()}</span>
      </div>
    </DashboardPanel>
  );
}

/* ================================================================
   INTRADAY CAPITAL + CONTROL MODE CARD
   Compact card showing live breach level, control mode, and links.
   ================================================================ */

const CONTROL_MODE_BADGE: Record<string, { label: string; cls: string; bg: string }> = {
  NORMAL: { label: "NORMAL", cls: "text-success", bg: "bg-success/10 border-success/30" },
  THROTTLE_RESERVATIONS: { label: "THROTTLE", cls: "text-warning", bg: "bg-warning/10 border-warning/30" },
  FREEZE_CONVERSIONS: { label: "FREEZE", cls: "text-warning", bg: "bg-warning/10 border-warning/30" },
  FREEZE_MARKETPLACE: { label: "FREEZE MKT", cls: "text-danger", bg: "bg-danger/10 border-danger/30" },
  EMERGENCY_HALT: { label: "HALT", cls: "text-danger", bg: "bg-danger/10 border-danger/30" },
};

const BREACH_BADGE_COMPACT: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  CLEAR: { label: "CLEAR", cls: "text-success", icon: CheckCircle2 },
  CAUTION: { label: "CAUTION", cls: "text-warning", icon: AlertTriangle },
  BREACH: { label: "BREACH", cls: "text-danger", icon: AlertTriangle },
};

function IntradayControlCard() {
  const capitalQ = useIntradayCapital();
  const controlsQ = useCapitalControls();

  if (capitalQ.isLoading || controlsQ.isLoading) {
    return (
      <section>
        <h2 className="typo-label mb-3">Intraday Capital</h2>
        <div className="card-base px-5 py-4 animate-pulse">
          <div className="h-5 w-48 rounded bg-surface-3" />
        </div>
      </section>
    );
  }

  if (!capitalQ.data || !controlsQ.data) return null;

  const snap = capitalQ.data;
  const decision = controlsQ.data;
  const breachCfg = BREACH_BADGE_COMPACT[snap.breachLevel] ?? BREACH_BADGE_COMPACT.CLEAR;
  const modeCfg = CONTROL_MODE_BADGE[decision.mode] ?? CONTROL_MODE_BADGE.NORMAL;
  const BreachIcon = breachCfg.icon;

  return (
    <section data-tour="dashboard-intraday-card">
      <h2 className="typo-label mb-3">Intraday Capital</h2>
      <div className="card-base px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Breach Level */}
            <div className="flex items-center gap-2">
              <BreachIcon className={cn("h-5 w-5", breachCfg.cls)} />
              <span className={cn("text-sm font-bold tracking-wider", breachCfg.cls)}>
                {breachCfg.label}
              </span>
            </div>

            {/* Control Mode */}
            <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5", modeCfg.bg)}>
              <ShieldOff className={cn("h-3.5 w-3.5", modeCfg.cls)} />
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider", modeCfg.cls)}>
                {modeCfg.label}
              </span>
            </div>

            {/* KPI chips */}
            <span className="text-xs tabular-nums text-text-faint">
              ECR {snap.ecr.toFixed(2)}x
            </span>
            <span className="text-xs tabular-nums text-text-faint">
              HU {(snap.hardstopUtilization * 100).toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Link
              href="/intraday"
              className="flex items-center gap-1.5 rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3"
            >
              <Activity className="h-3.5 w-3.5" />
              Open Console →
            </Link>
            <Link
              href="/capital-controls"
              className="flex items-center gap-1.5 rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Controls →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   MAIN DASHBOARD PAGE
   ================================================================ */
export default function DashboardPage() {
  const [scenario, setScenario] = useState<DashboardScenario>("phase1");
  const dashQ = useDashboardData(scenario);

  if (dashQ.isLoading) return <DashboardSkeleton />;
  if (dashQ.isError) return <ErrorState message="Failed to load dashboard data." onRetry={() => dashQ.refetch()} />;
  if (!dashQ.data) return <DashboardSkeleton />;

  const d = dashQ.data;
  const cap = d.capital;

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
    <>
      {/* Header */}
      <PageHeader
        title="Risk Dashboard"
        description="AurumShield capital adequacy, risk distribution, and evidence integrity monitor."
        actions={
          <div className="flex items-center gap-3">
            {/* Scenario toggle — restrained system-version pills */}
            <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-2 p-0.5">
              <button
                onClick={() => setScenario("phase1")}
                className={cn(
                  "rounded-[calc(var(--radius-sm)-2px)] px-3 py-1 text-[11px] font-medium transition-colors duration-100",
                  scenario === "phase1"
                    ? "border border-gold-muted/40 bg-gold-muted/8 text-gold-muted"
                    : "text-text-faint hover:text-text-muted"
                )}
              >
                Phase 1
              </button>
              <button
                onClick={() => setScenario("scaleUp")}
                className={cn(
                  "rounded-[calc(var(--radius-sm)-2px)] px-3 py-1 text-[11px] font-medium transition-colors duration-100",
                  scenario === "scaleUp"
                    ? "border border-gold-muted/40 bg-gold-muted/8 text-gold-muted"
                    : "text-text-faint hover:text-text-muted"
                )}
              >
                Scale-Up
              </button>
            </div>

            {/* Export — institutional outlined button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-5 py-2 text-sm font-medium text-text-muted transition-colors duration-100 hover:bg-surface-3 hover:text-text"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      {/* ============================================================
         SECTION 1: CAPITAL ADEQUACY
         ============================================================ */}
      <section data-tour="dashboard-capital">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="typo-label">Capital Adequacy</h2>
          <InfoTooltip content={TOOLTIPS.capitalPanel} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CapitalCell
            label="Capital Base"
            value={fmtUSD(cap.capitalBase, true)}
            sub={`Tier-1 + Tier-2 instruments`}
            tooltip={TOOLTIPS.capitalBase}
            highlight="gold"
          />
          <CapitalCell
            label="Active Exposure"
            value={fmtUSD(cap.activeExposure, true)}
            sub={`Net MTM across all counterparties`}
            tooltip={TOOLTIPS.activeExposure}
          />
          <CapitalCell
            label="ECR"
            value={`${cap.ecr.toFixed(2)}x`}
            sub={`${fmtUSD(cap.activeExposure, true)} ÷ ${fmtUSD(cap.capitalBase, true)}`}
            tooltip={TOOLTIPS.ecr}
            highlight={cap.ecr > 8 ? "danger" : cap.ecr > 6 ? "warning" : "success"}
          />
          <CapitalCell
            label="Buffer vs TVaR₉₉"
            value={`${cap.bufferVsTvar99 >= 0 ? "+" : ""}${fmtUSD(cap.bufferVsTvar99, true)}`}
            sub={`TVaR₉₉: ${fmtUSD(cap.tvar99, true)} · VaR₉₉: ${fmtUSD(cap.var99, true)}`}
            tooltip={TOOLTIPS.bufferVsTvar}
            highlight={cap.bufferVsTvar99 >= 0 ? "success" : "danger"}
          />
          <HardstopCell capital={cap} />
        </div>

        {/* Capital panel timestamp */}
        <p className="mt-2 text-[10px] tabular-nums text-text-faint">
          As of{" "}
          {new Date(cap.asOf).toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
            timeZoneName: "short",
          })}
        </p>
      </section>

      {/* ============================================================
         SECTION 1.5: INTRADAY CAPITAL + CONTROL MODE (compact card)
         ============================================================ */}
      <IntradayControlCard />

      {/* ============================================================
         SECTION 2: RISK DISTRIBUTION
         ============================================================ */}
      <section data-tour="dashboard-risk">
        <h2 className="typo-label mb-3">Risk Distribution</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TRIBandPanel bands={d.triBands.bands} asOf={d.triBands.asOf} />
          <CorridorTierPanel tiers={d.corridorTiers.tiers} asOf={d.corridorTiers.asOf} />
          <HubConcentrationPanel hubs={d.hubConcentration.hubs} totalHHI={d.hubConcentration.totalHHI} asOf={d.hubConcentration.asOf} />
          <TxnByStatePanel states={d.txnByState.states} asOf={d.txnByState.asOf} />
        </div>

        <div className="mt-4">
          <BlockedTransitionsPanel transitions={d.blockedTransitions.transitions} asOf={d.blockedTransitions.asOf} />
        </div>
      </section>

      {/* ============================================================
         SECTION 3: EVIDENCE HEALTH
         ============================================================ */}
      <section data-tour="dashboard-evidence">
        <h2 className="typo-label mb-3">Evidence Health</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EvidenceValidationsPanel validations={d.evidenceValidations.validations} asOf={d.evidenceValidations.asOf} />
          <WORMStatusPanel segments={d.wormStatus.segments} totalDocuments={d.wormStatus.totalDocuments} asOf={d.wormStatus.asOf} />
        </div>
      </section>
    </>
    </RequireRole>
  );
}
