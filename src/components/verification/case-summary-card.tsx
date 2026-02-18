"use client";

import { cn } from "@/lib/utils";
import type { VerificationCase } from "@/lib/mock-data";
import { Shield, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

/* ---------- Status / risk chip colors ---------- */
const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-success/10 text-success border-success/30",
  IN_PROGRESS: "bg-info/10 text-info border-info/30",
  NEEDS_REVIEW: "bg-warning/10 text-warning border-warning/30",
  NOT_STARTED: "bg-surface-3 text-text-faint border-border",
  REJECTED: "bg-danger/10 text-danger border-danger/30",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "text-success",
  ELEVATED: "text-warning",
  HIGH: "text-danger",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  VERIFIED: CheckCircle2,
  IN_PROGRESS: Clock,
  NEEDS_REVIEW: AlertTriangle,
  NOT_STARTED: Shield,
  REJECTED: XCircle,
};

interface CaseSummaryCardProps {
  verificationCase: VerificationCase;
  className?: string;
}

export function CaseSummaryCard({ verificationCase: vc, className }: CaseSummaryCardProps) {
  const StatusIcon = STATUS_ICONS[vc.status] ?? Shield;

  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-surface-1 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">Case Summary</p>
        <StatusIcon className={cn("h-4 w-4", RISK_COLORS[vc.riskTier])} />
      </div>

      {/* Status chip */}
      <div className="mb-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
          STATUS_COLORS[vc.status]
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {vc.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Details */}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-faint">Risk Tier</dt>
          <dd className={cn("font-semibold text-xs uppercase tracking-wide", RISK_COLORS[vc.riskTier])}>
            {vc.riskTier}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Track</dt>
          <dd className="font-mono text-xs text-text">{vc.track}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Case Opened</dt>
          <dd className="text-xs tabular-nums text-text">
            {new Date(vc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Last Updated</dt>
          <dd className="text-xs tabular-nums text-text">
            {new Date(vc.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Last Screened</dt>
          <dd className="text-xs tabular-nums text-text">
            {vc.lastScreenedAt
              ? new Date(vc.lastScreenedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Next Action</dt>
          <dd className="font-mono text-xs text-text">
            {vc.nextRequiredStepId ?? "None"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">Evidence Items</dt>
          <dd className="tabular-nums text-xs text-text">{vc.evidenceIds.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-faint">User</dt>
          <dd className="font-mono text-xs text-text">{vc.userId}</dd>
        </div>
      </dl>
    </div>
  );
}
