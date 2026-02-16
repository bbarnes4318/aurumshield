"use client";

import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { DeterministicDecision, CapitalImpact, EvidenceBundleEntry } from "./deterministic-claim-engine";

const CLASS_CLR: Record<string, string> = {
  public: "text-success bg-success/10", internal: "text-info bg-info/10",
  confidential: "text-warning bg-warning/10", restricted: "text-danger bg-danger/10",
};

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

interface Props { decision: DeterministicDecision }

export function ClaimEvidencePanel({ decision }: Props) {
  const { evidenceBundle, capitalImpact } = decision;

  return (
    <aside className="space-y-4">
      {/* Evidence Bundle */}
      <div className="card-base p-4">
        <p className="typo-label mb-3">Evidence Bundle</p>
        {evidenceBundle.length === 0 ? (
          <p className="text-xs text-text-faint">No evidence items on file.</p>
        ) : (
          <div className="space-y-2">
            {evidenceBundle.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CLASS_CLR[e.classification] ?? "bg-surface-3 text-text-faint")}>{e.classification}</span>
                  <span className="font-mono text-text-faint truncate">{e.id}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] font-bold", e.verified ? "text-success" : "text-danger")}>{e.verified ? "VERIFIED" : "UNVERIFIED"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-1">
          <p className="text-[11px] text-text-faint">Integrity Hashes:</p>
          {evidenceBundle.map((e) => (
            <p key={e.id} className="font-mono text-[10px] text-text-faint">{e.id}: {e.integrityHash}</p>
          ))}
        </div>
      </div>

      {/* Capital Impact */}
      {capitalImpact && <CapitalImpactCard impact={capitalImpact} />}

      {/* Verification Status */}
      <div className="card-base p-4">
        <p className="typo-label mb-2">Verification Protocol</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-text-faint">Evidence Integrity</span><span className={cn("font-medium", evidenceBundle.every(e => e.verified) ? "text-success" : "text-warning")}>{evidenceBundle.every(e => e.verified) ? "All Verified" : "Partial"}</span></div>
          <div className="flex justify-between"><span className="text-text-faint">Hash Validation</span><span className="text-success font-medium">Complete</span></div>
          <div className="flex justify-between"><span className="text-text-faint">Quarantine Status</span><span className="text-success font-medium">Clear</span></div>
        </div>
      </div>
    </aside>
  );
}

function CapitalImpactCard({ impact }: { impact: CapitalImpact }) {
  const barColor = impact.hardstopUtilizationAfter > 0.9 ? "bg-danger" : impact.hardstopUtilizationAfter > 0.75 ? "bg-warning" : "bg-success";

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="typo-label">Capital Impact</p>
        <InfoTooltip content={`Payout: ${fmt(impact.projectedPayout)}\nCapital Before: ${fmt(impact.capitalBefore)}\nCapital After: ${fmt(impact.capitalAfter)}`} side="left" />
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between"><dt className="text-text-faint">Capital Before</dt><dd className="tabular-nums font-medium text-text">{fmt(impact.capitalBefore)}</dd></div>
        <div className="flex justify-between"><dt className="text-text-faint">Projected Payout</dt><dd className="tabular-nums font-medium text-danger">−{fmt(impact.projectedPayout)}</dd></div>
        <div className="flex justify-between"><dt className="text-text-faint">Capital After</dt><dd className="tabular-nums font-semibold text-text">{fmt(impact.capitalAfter)}</dd></div>
        <div>
          <div className="flex justify-between mb-1">
            <dt className="text-text-faint">Hardstop Utilization</dt>
            <dd className="tabular-nums text-text">{pct(impact.hardstopUtilizationBefore)} → <span className={cn("font-semibold", impact.hardstopUtilizationAfter > 0.9 ? "text-danger" : "")}>{pct(impact.hardstopUtilizationAfter)}</span></dd>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(100, impact.hardstopUtilizationAfter * 100)}%` }} />
          </div>
        </div>
      </dl>
    </div>
  );
}
