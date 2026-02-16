"use client";

import Link from "next/link";
import { ExternalLink, CheckCircle2, Clock, XCircle, RotateCcw, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskBadge } from "@/components/ui/risk-badge";
import type { Transaction, Counterparty, TransactionStateTransition } from "@/lib/mock-data";

const STATUS_CHIP: Record<string, { dot: string; bg: string }> = {
  completed: { dot: "bg-success", bg: "bg-success/10 text-success" },
  pending: { dot: "bg-warning", bg: "bg-warning/10 text-warning" },
  processing: { dot: "bg-info", bg: "bg-info/10 text-info" },
  failed: { dot: "bg-danger", bg: "bg-danger/10 text-danger" },
  reversed: { dot: "bg-text-faint", bg: "bg-text-faint/10 text-text-faint" },
};

const STATE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  INITIATED: Clock, COMPLIANCE_CHECK: CheckCircle2, PROCESSING: Loader,
  SETTLEMENT: CheckCircle2, COMPLETED: CheckCircle2, PENDING_REVIEW: Clock,
  FAILED: XCircle, REVERSED: RotateCcw,
};
const STATE_COLOR: Record<string, string> = {
  INITIATED: "text-info", COMPLIANCE_CHECK: "text-success", PROCESSING: "text-info",
  SETTLEMENT: "text-gold", COMPLETED: "text-success", PENDING_REVIEW: "text-warning",
  FAILED: "text-danger", REVERSED: "text-danger",
};

interface Props { tx: Transaction; cp: Counterparty | undefined; transitions: TransactionStateTransition[] }

function fmtDate(s: string) { return new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }

export function DetailOverviewTab({ tx, cp, transitions }: Props) {
  const st = STATUS_CHIP[tx.status];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Core Summary */}
      <div className="card-base p-5">
        <p className="typo-label mb-3">Transaction Summary</p>
        <dl className="space-y-0">
          {([
            ["Status", <span key="s" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", st.bg)}><span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />{tx.status}</span>],
            ["Type", <span key="t" className="capitalize">{tx.type.replace("-", " ")}</span>],
            ["Counterparty", <span key="cp" className="flex items-center gap-2"><Link href={`/counterparties/${tx.counterpartyId}`} className="text-gold hover:text-gold-hover transition-colors inline-flex items-center gap-1">{tx.counterpartyName} <ExternalLink className="h-3 w-3" /></Link>{cp && <RiskBadge level={cp.riskLevel} />}</span>],
            ["Amount", <span key="a" className="tabular-nums font-semibold">{tx.currency} {tx.amount.toLocaleString("en-US")}</span>],
            ["Corridor", tx.corridorName],
            ["Initiated", <span key="d1" className="tabular-nums">{fmtDate(tx.initiatedDate)}</span>],
            ["Settled", tx.settledDate ? <span key="d2" className="tabular-nums">{fmtDate(tx.settledDate)}</span> : <span key="d2" className="text-text-faint">—</span>],
            ["Initiated by", tx.initiatedBy],
          ] as [string, React.ReactNode][]).map(([label, val]) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-3 py-2.5 border-b border-border last:border-b-0">
              <dt className="typo-label self-center">{label}</dt>
              <dd className="text-sm text-text">{val}</dd>
            </div>
          ))}
        </dl>
        {tx.description && <p className="mt-3 text-xs text-text-muted italic">{tx.description}</p>}
      </div>

      {/* Center: State Timeline */}
      <div className="card-base p-5">
        <p className="typo-label mb-4">State Machine Trace</p>
        <ol className="relative ml-3 border-l border-border">
          {transitions.map((t, i) => {
            const Icon = STATE_ICON[t.state] ?? Clock;
            const color = STATE_COLOR[t.state] ?? "text-text-faint";
            const isLast = i === transitions.length - 1;
            return (
              <li key={i} className={cn("relative ml-6 pb-5 last:pb-0", isLast && "font-medium")}>
                <div className={cn("absolute -left-[30px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-1", color)}>
                  <Icon className="h-3 w-3" />
                </div>
                <p className="text-sm text-text">{t.state.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-text-faint tabular-nums">{fmtDate(t.timestamp)}</p>
                <p className="text-xs text-text-muted mt-0.5">{t.detail}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px]">
                  <span className="text-text-faint">Actor: <span className="text-text-muted">{t.actor}</span></span>
                  <span className="text-text-faint font-mono">evidence: {t.evidenceHash}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
