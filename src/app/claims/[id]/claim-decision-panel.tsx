"use client";

import { cn } from "@/lib/utils";
import type { RuleResult, DeterministicDecision } from "./deterministic-claim-engine";

const GROUP_LABELS: Record<string, string> = {
  ELIGIBILITY: "Group 1 — Eligibility (Blocking)",
  PROTOCOL: "Group 2 — Protocol Integrity (Blocking)",
  COVERAGE: "Group 3 — Coverage Scope",
  CAPITAL: "Group 4 — Capital & Approval (Non-Blocking)",
};

const RESULT_BADGE: Record<string, string> = {
  PASS: "bg-success/10 text-success", FAIL: "bg-danger/10 text-danger", PENDING: "bg-warning/10 text-warning",
};
const VERDICT_BADGE: Record<string, string> = {
  APPROVED: "bg-success/10 text-success border-success/30", DENIED: "bg-danger/10 text-danger border-danger/30",
  PENDING: "bg-warning/10 text-warning border-warning/30",
};

interface Props { decision: DeterministicDecision }

export function ClaimDecisionPanel({ decision }: Props) {
  const groups = ["ELIGIBILITY", "PROTOCOL", "COVERAGE", "CAPITAL"] as const;

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="typo-label mb-1">Protocol Verdict</p>
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold", VERDICT_BADGE[decision.verdict])}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {decision.verdict}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-text-faint">Transparency Score</p>
            <p className="text-xl font-bold tabular-nums text-text">{decision.score}<span className="text-xs text-text-faint">%</span></p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-text-faint">
          <span>Approval: <span className="font-semibold text-text capitalize">{decision.approvalTier.replace("-", " ")}</span></span>
          <span>Signer: <span className="font-semibold text-text">{decision.signer}</span></span>
          <span>Decided: <span className="font-semibold text-text tabular-nums">{decision.decidedAt ? new Date(decision.decidedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span></span>
        </div>
      </div>

      {/* Rule matrix grouped */}
      {groups.map((group) => {
        const rules = decision.rules.filter((r) => r.group === group);
        if (rules.length === 0) return null;
        return (
          <div key={group} className="card-base overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-surface-2">
              <p className="text-xs font-semibold text-text">{GROUP_LABELS[group]}</p>
            </div>
            <div className="divide-y divide-border">
              {rules.map((r) => (
                <div key={r.ruleId} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-faint">{r.ruleId}</span>
                      <span className="text-sm text-text">{r.description}</span>
                      {r.blocking && <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-surface-3 text-text-faint">BLOCK</span>}
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", RESULT_BADGE[r.result])}>
                      {r.result}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-text-faint break-all">{r.inputSnapshot}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
