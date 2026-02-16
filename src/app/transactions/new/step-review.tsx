"use client";

import type { UseFormReturn } from "react-hook-form";
import type { WizardFormData } from "./wizard-schema";
import type { TRIResult, CapitalValidation, ApprovalResult, PolicyBlocker } from "./wizard-policy-engine";
import { cn } from "@/lib/utils";

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

const BAND_COLORS = { green: "text-success", amber: "text-warning", red: "text-danger" };
const TIER_COLORS: Record<string, string> = { auto: "text-success", "desk-head": "text-warning", "credit-committee": "text-warning", board: "text-danger" };
const SEV_COLORS: Record<string, string> = { BLOCK: "text-danger", WARN: "text-warning", INFO: "text-info" };

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

interface Props {
  form: UseFormReturn<WizardFormData>;
  summary: { counterparty: string; type: string; amount: string; currency: string; corridor: string; hub: string };
  tri: TRIResult;
  capVal: CapitalValidation;
  approval: ApprovalResult;
  blockers: PolicyBlocker[];
  isCreating: boolean;
  onCreate: () => void;
}

export function StepReview({ form, summary, tri, capVal, approval, blockers, isCreating, onCreate }: Props) {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-text">Step 4 — Review & Create</h2>

      {/* Summary grid */}
      <div className="rounded-[var(--radius)] border border-border bg-surface-2 px-4 py-3 space-y-2">
        <p className="typo-label mb-2">Transaction Summary</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div><span className="text-text-faint">Type:</span> <span className="text-text capitalize">{summary.type}</span></div>
          <div><span className="text-text-faint">Counterparty:</span> <span className="text-text">{summary.counterparty}</span></div>
          <div><span className="text-text-faint">Amount:</span> <span className="text-text tabular-nums">{summary.amount} {summary.currency}</span></div>
          <div><span className="text-text-faint">Corridor:</span> <span className="text-text">{summary.corridor}</span></div>
          <div><span className="text-text-faint">Hub:</span> <span className="text-text">{summary.hub}</span></div>
          <div><span className="text-text-faint">TRI:</span> <span className={cn("font-semibold", BAND_COLORS[tri.band])}>{tri.score} ({tri.band})</span></div>
        </div>
        <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div><span className="text-text-faint">ECR:</span> <span className="tabular-nums text-text">{capVal.currentECR.toFixed(2)}x → {capVal.postTxnECR.toFixed(2)}x</span></div>
          <div><span className="text-text-faint">Hardstop:</span> <span className="tabular-nums text-text">{(capVal.currentHardstopUtil * 100).toFixed(1)}% → {(capVal.postTxnHardstopUtil * 100).toFixed(1)}%</span></div>
          <div><span className="text-text-faint">Approval:</span> <span className={cn("font-medium", TIER_COLORS[approval.tier])}>{approval.label}</span></div>
          <div><span className="text-text-faint">Remaining:</span> <span className="tabular-nums text-text">{fmt(capVal.hardstopRemaining)}</span></div>
        </div>
        {blockers.length > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-1">
            <p className="typo-label">Blockers / Warnings</p>
            {blockers.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className={cn("font-bold", SEV_COLORS[b.severity])}>{b.severity}</span>
                <span className="text-text-muted">{b.title}: {b.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-desc">Description</label>
        <textarea id="w-desc" {...register("description")} rows={3} placeholder="Purpose and context for this transaction…" className={FIELD} />
        {errors.description && <p className="mt-1 text-xs text-danger">{errors.description.message}</p>}
      </div>

      {/* Create */}
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="w-full rounded-[var(--radius-input)] bg-gold px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50"
      >
        {isCreating ? "Creating…" : "Create Transaction"}
      </button>
    </div>
  );
}
