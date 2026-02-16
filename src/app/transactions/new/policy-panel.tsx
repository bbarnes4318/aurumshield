"use client";

import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { TRIResult, CapitalValidation, ApprovalResult, PolicyBlocker } from "./wizard-policy-engine";

const BAND = { green: { bg: "bg-success/10", text: "text-success", border: "border-success" }, amber: { bg: "bg-warning/10", text: "text-warning", border: "border-warning" }, red: { bg: "bg-danger/10", text: "text-danger", border: "border-danger" } };
const TIER_CLR: Record<string, string> = { auto: "text-success", "desk-head": "text-warning", "credit-committee": "text-warning", board: "text-danger" };
const SEV_CLR: Record<string, string> = { BLOCK: "text-danger bg-danger/10", WARN: "text-warning bg-warning/10", INFO: "text-info bg-info/10" };

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

interface Props {
  tri: TRIResult | null;
  capVal: CapitalValidation | null;
  approval: ApprovalResult | null;
  blockers: PolicyBlocker[];
  ready: boolean;
}

export function PolicyPanel({ tri, capVal, approval, blockers, ready }: Props) {
  if (!ready) {
    return (
      <aside className="rounded-[var(--radius)] border border-border bg-surface-1 p-4">
        <p className="typo-label mb-2">Policy Panel</p>
        <p className="text-xs text-text-faint">Complete Steps 1–2 to see live policy analysis.</p>
      </aside>
    );
  }

  const b = tri ? BAND[tri.band] : BAND.green;

  return (
    <aside className="rounded-[var(--radius)] border border-border bg-surface-1 divide-y divide-border">
      {/* TRI */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="typo-label">TRI Score</p>
          <InfoTooltip content={tri?.formula ?? ""} />
        </div>
        {tri && (
          <>
            <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5", b.bg, b.text, b.border)}>
              <span className="text-2xl font-bold tabular-nums">{tri.score}</span>
              <span className="text-xs font-semibold uppercase">{tri.band}</span>
            </div>
            <dl className="mt-3 space-y-1 text-[11px]">
              {Object.entries(tri.components).map(([k, c]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-text-faint capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd className="tabular-nums text-text">{c.raw} × {c.weight} = {c.weighted.toFixed(2)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>

      {/* Capital Impact */}
      {capVal && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="typo-label">Capital Impact</p>
            <InfoTooltip content={`PostTxnECR = PostTxnExposure / CapitalBase = ${fmt(capVal.postTxnExposure)} / ${fmt(capVal.capitalBase)} = ${capVal.postTxnECR.toFixed(2)}x\nHardstopUtil = PostTxnExposure / HardstopLimit = ${fmt(capVal.postTxnExposure)} / ${fmt(capVal.hardstopLimit)} = ${pct(capVal.postTxnHardstopUtil)}`} />
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between"><dt className="text-text-faint">ECR</dt><dd className="tabular-nums text-text">{capVal.currentECR.toFixed(2)}x → <span className={capVal.postTxnECR > 7 ? "text-danger font-semibold" : "text-text font-semibold"}>{capVal.postTxnECR.toFixed(2)}x</span></dd></div>
            <div>
              <div className="flex justify-between mb-1"><dt className="text-text-faint">Hardstop</dt><dd className="tabular-nums text-text">{pct(capVal.currentHardstopUtil)} → <span className={capVal.postTxnHardstopUtil > 0.9 ? "text-danger font-semibold" : "text-text font-semibold"}>{pct(capVal.postTxnHardstopUtil)}</span></dd></div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", capVal.postTxnHardstopUtil > 0.9 ? "bg-danger" : capVal.postTxnHardstopUtil > 0.75 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, capVal.postTxnHardstopUtil * 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between"><dt className="text-text-faint">Remaining</dt><dd className="tabular-nums text-text">{fmt(capVal.hardstopRemaining)}</dd></div>
          </dl>
        </div>
      )}

      {/* Approval Tier */}
      {approval && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="typo-label">Approval Tier</p>
            <InfoTooltip content={`Rule: ${approval.reason}`} />
          </div>
          <span className={cn("text-sm font-semibold", TIER_CLR[approval.tier])}>{approval.label}</span>
          <p className="mt-1 text-[11px] text-text-faint">{approval.reason}</p>
        </div>
      )}

      {/* Blockers */}
      <div className="p-4">
        <p className="typo-label mb-2">Blockers</p>
        {blockers.length === 0 ? (
          <p className="text-xs text-success">✓ No blockers detected</p>
        ) : (
          <ul className="space-y-1.5">
            {blockers.map((bl) => (
              <li key={bl.id} className="flex items-start gap-2 text-xs">
                <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px] font-bold", SEV_CLR[bl.severity])}>{bl.severity}</span>
                <span className="text-text-muted">{bl.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
