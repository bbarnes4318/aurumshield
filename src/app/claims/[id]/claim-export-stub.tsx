"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Claim } from "@/lib/mock-data";
import type { DeterministicDecision } from "./deterministic-claim-engine";

interface Props {
  claim: Claim;
  decision: DeterministicDecision;
}

/**
 * Export Reinsurer Package — Stub
 * TODO: Replace console.log with actual API call to generate PDF/JSON package
 * Interface: POST /api/claims/:id/export → { format: "json" | "pdf" }
 */
export function ClaimExportStub({ claim, decision }: Props) {
  const [exported, setExported] = useState(false);

  function handleExport() {
    const pkg = {
      claimId: claim.id,
      transactionId: claim.transactionId,
      filedAt: claim.filedDate,
      decision: {
        verdict: decision.verdict,
        decidedAt: decision.decidedAt,
        signer: decision.signer,
        approvalTier: decision.approvalTier,
      },
      ruleMatrix: decision.rules.map((r) => ({
        ruleId: r.ruleId,
        description: r.description,
        inputSnapshot: r.inputSnapshot,
        result: r.result,
      })),
      evidenceBundle: decision.evidenceBundle.map((e) => ({
        id: e.id,
        classification: e.classification,
        verified: e.verified,
        integrityHash: e.integrityHash,
      })),
      capitalImpact: decision.capitalImpact
        ? {
            capitalBefore: decision.capitalImpact.capitalBefore,
            projectedPayout: decision.capitalImpact.projectedPayout,
            capitalAfter: decision.capitalImpact.capitalAfter,
            hardstopUtilizationBefore: decision.capitalImpact.hardstopUtilizationBefore,
            hardstopUtilizationAfter: decision.capitalImpact.hardstopUtilizationAfter,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    // Generate and download the reinsurer package as a JSON file
    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reinsurer-package-${claim.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className={cn(
        "flex items-center gap-2 rounded-(--radius) px-4 py-2.5 text-sm font-medium transition-colors border",
        exported
          ? "bg-success/10 text-success border-success/30"
          : "bg-surface-2 text-text-muted border-border hover:text-gold hover:border-gold/30 hover:bg-gold/5"
      )}
    >
      {exported ? <><Check className="h-4 w-4" /> Package Exported</> : <><Download className="h-4 w-4" /> Export Reinsurer Package</>}
    </button>
  );
}
