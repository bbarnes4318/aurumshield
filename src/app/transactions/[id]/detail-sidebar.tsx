"use client";

import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { RiskBadge } from "@/components/ui/risk-badge";
import type { Transaction, Counterparty, DashboardCapital, EvidenceItem } from "@/lib/mock-data";
import { computeTRI, validateCapital, determineApproval } from "@/app/transactions/new/wizard-policy-engine";
import type { Corridor } from "@/lib/mock-data";

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const TIER_CLR: Record<string, string> = { auto: "text-success", "desk-head": "text-warning", "credit-committee": "text-warning", board: "text-danger" };
const CLASS_CLR: Record<string, string> = { public: "text-success bg-success/10", internal: "text-info bg-info/10", confidential: "text-warning bg-warning/10", restricted: "text-danger bg-danger/10" };

interface Props {
  tx: Transaction;
  cp: Counterparty | undefined;
  corridor: Corridor | undefined;
  capital: DashboardCapital | undefined;
  evidence: EvidenceItem[];
}

export function DetailSidebar({ tx, cp, corridor, capital, evidence }: Props) {
  const isActive = tx.status === "processing" || tx.status === "pending";
  const isLocked = tx.status === "completed" || tx.status === "failed" || tx.status === "reversed";

  const tri = cp && corridor && capital ? computeTRI(cp, corridor, tx.amount, capital) : null;
  const capVal = capital ? validateCapital(tx.amount, capital) : null;
  const approval = tri ? determineApproval(tri.score, tx.amount) : null;

  const BAND = { green: "text-success bg-success/10 border-success", amber: "text-warning bg-warning/10 border-warning", red: "text-danger bg-danger/10 border-danger" };

  return (
    <aside className="rounded-[var(--radius)] border border-border bg-surface-1 divide-y divide-border">
      {/* Evidence Bundle */}
      <div className="p-4">
        <p className="typo-label mb-2">Evidence Bundle</p>
        <div className="space-y-1.5">
          {evidence.length === 0 && <p className="text-xs text-text-faint">No evidence items attached.</p>}
          {evidence.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CLASS_CLR[e.classification])}>{e.classification}</span>
              <span className="text-text-muted truncate">{e.title}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-text-faint">{evidence.length} document(s) on file</p>
      </div>

      {/* TRI + Approval */}
      {tri && approval && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="typo-label">Risk Assessment</p>
            <InfoTooltip content={tri.formula} side="left" />
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", BAND[tri.band])}>
              <span className="text-lg font-bold tabular-nums">{tri.score}</span>
              <span className="text-[10px] font-semibold uppercase">{tri.band}</span>
            </div>
            {cp && <RiskBadge level={cp.riskLevel} />}
          </div>
          <div className="mt-2">
            <span className="text-xs text-text-faint">Approval: </span>
            <span className={cn("text-xs font-semibold", TIER_CLR[approval.tier])}>{approval.label}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-faint">{approval.reason}</p>
        </div>
      )}

      {/* Capital Impact */}
      {capVal && capital && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="typo-label">Capital Impact</p>
            <InfoTooltip content={`PostTxnECR = (ActiveExposure + Amount) / CapitalBase\n= (${fmt(capVal.currentExposure)} + ${fmt(tx.amount)}) / ${fmt(capVal.capitalBase)}\n= ${capVal.postTxnECR.toFixed(2)}x`} side="left" />
          </div>
          {isLocked ? (
            <div className="rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs text-text-faint">
              Capital impact locked — exposure no longer active ({tx.status}).
            </div>
          ) : (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-text-faint">Active Exposure</dt><dd className="tabular-nums text-text">{fmt(capVal.currentExposure)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">ECR</dt><dd className="tabular-nums text-text">{capVal.currentECR.toFixed(2)}x → <span className={capVal.postTxnECR > 7 ? "text-danger font-semibold" : "text-text font-semibold"}>{capVal.postTxnECR.toFixed(2)}x</span></dd></div>
              <div>
                <div className="flex justify-between mb-1"><dt className="text-text-faint">Hardstop</dt><dd className="tabular-nums text-text">{pct(capVal.currentHardstopUtil)} → <span className={capVal.postTxnHardstopUtil > 0.9 ? "text-danger font-semibold" : "font-semibold"}>{pct(capVal.postTxnHardstopUtil)}</span></dd></div>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", capVal.postTxnHardstopUtil > 0.9 ? "bg-danger" : capVal.postTxnHardstopUtil > 0.75 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, capVal.postTxnHardstopUtil * 100)}%` }} />
                </div>
              </div>
              <div className="flex justify-between"><dt className="text-text-faint">Remaining Capacity</dt><dd className="tabular-nums text-text">{fmt(capVal.hardstopRemaining)}</dd></div>
            </dl>
          )}
        </div>
      )}

      {/* Verification Status */}
      <div className="p-4">
        <p className="typo-label mb-2">Verification</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-text-faint">KYC/AML</span><span className="text-success font-medium">Verified</span></div>
          <div className="flex justify-between"><span className="text-text-faint">Sanctions</span><span className="text-success font-medium">Clear</span></div>
          <div className="flex justify-between"><span className="text-text-faint">Settlement Auth</span>
            <span className={cn("font-medium", isActive ? "text-warning" : isLocked ? "text-success" : "text-text-faint")}>{isActive ? "Pending" : isLocked ? "Completed" : "Awaiting"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
