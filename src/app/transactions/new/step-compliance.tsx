"use client";

import { CheckCircle2, AlertCircle, XCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplianceCheck } from "./wizard-policy-engine";

const RESULT_CONFIG = {
  PASS: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Pass" },
  WARN: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10", label: "Warn" },
  FAIL: { icon: XCircle, color: "text-danger", bg: "bg-danger/10", label: "Fail" },
};

interface Props {
  checks: ComplianceCheck[];
  hasBlockers: boolean;
  summary: { counterparty: string; amount: string; corridor: string; hub: string };
  onEditParties: () => void;
  onEditCorridor: () => void;
}

export function StepCompliance({ checks, hasBlockers, summary, onEditParties, onEditCorridor }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-text">Step 3 — Compliance Checks</h2>

      {/* Frozen summary */}
      <div className="rounded-[var(--radius)] border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="typo-label">Selected Configuration</p>
          <div className="flex gap-2">
            <button type="button" onClick={onEditParties} className="flex items-center gap-1 text-xs text-gold hover:text-gold-hover transition-colors">
              <Pencil className="h-3 w-3" /> Edit Parties
            </button>
            <button type="button" onClick={onEditCorridor} className="flex items-center gap-1 text-xs text-gold hover:text-gold-hover transition-colors">
              <Pencil className="h-3 w-3" /> Edit Corridor
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><span className="text-text-faint">Counterparty:</span> <span className="text-text">{summary.counterparty}</span></div>
          <div><span className="text-text-faint">Amount:</span> <span className="text-text tabular-nums">{summary.amount}</span></div>
          <div><span className="text-text-faint">Corridor:</span> <span className="text-text">{summary.corridor}</span></div>
          <div><span className="text-text-faint">Hub:</span> <span className="text-text">{summary.hub}</span></div>
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="space-y-2">
        {checks.map((check) => {
          const cfg = RESULT_CONFIG[check.result];
          const Icon = cfg.icon;
          return (
            <div key={check.id} className={cn("flex items-start gap-3 rounded-[var(--radius-sm)] px-4 py-3", cfg.bg)}>
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{check.name}</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">{check.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {hasBlockers && (
        <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          One or more BLOCK-level checks failed. Resolve issues before proceeding.
        </div>
      )}
    </div>
  );
}
