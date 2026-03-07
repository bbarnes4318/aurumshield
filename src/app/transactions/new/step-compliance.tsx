"use client";

import { ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================
   STEP 2 — Compliance Verification (Fail-Closed)
   ================================================================
   Self-contained display of mock compliance checks.
   All checks auto-pass for the demo environment.
   ================================================================ */

interface ComplianceItem {
  id: string;
  name: string;
  detail: string;
  result: "PASS" | "WARN" | "FAIL";
}

const MOCK_CHECKS: ComplianceItem[] = [
  {
    id: "kyb",
    name: "KYB Entity Verification",
    detail: "Corporate registration, beneficial ownership, and UBO structure validated against FinCEN records.",
    result: "PASS",
  },
  {
    id: "ofac",
    name: "OFAC Sanctions Screening",
    detail: "Entity and all UBOs cleared against OFAC SDN, Consolidated Screening List, and EU sanctions registry.",
    result: "PASS",
  },
  {
    id: "aml",
    name: "AML Transaction Pattern Analysis",
    detail: "Settlement amount within normal institutional parameters. No structuring or velocity anomalies detected.",
    result: "PASS",
  },
  {
    id: "jurisdiction",
    name: "Jurisdiction Clearance",
    detail: "Counterparty jurisdiction is an approved corridor. No FATF grey/black-list match.",
    result: "PASS",
  },
  {
    id: "pep",
    name: "PEP & Adverse Media",
    detail: "No Politically Exposed Person links. Adverse media scan returned zero matches.",
    result: "PASS",
  },
];

const RESULT_CONFIG = {
  PASS: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/[0.06]", border: "border-emerald-400/10", label: "Cleared" },
  WARN: { icon: ShieldCheck, color: "text-warning", bg: "bg-warning/[0.06]", border: "border-warning/10", label: "Review" },
  FAIL: { icon: Lock, color: "text-danger", bg: "bg-danger/[0.06]", border: "border-danger/10", label: "Blocked" },
};

interface Props {
  beneficiaryName: string;
  amount: number;
}

export function StepCompliance({ beneficiaryName, amount }: Props) {
  const allPass = MOCK_CHECKS.every((c) => c.result === "PASS");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <ShieldCheck className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-text">
            Step 2 — Compliance Verification
          </h2>
          <p className="text-xs text-text-faint">
            Fail-closed compliance gate. All checks must pass before funding authorization.
          </p>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
        <p className="typo-label mb-2">Transaction Under Review</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div>
            <span className="text-text-faint">Counterparty:</span>{" "}
            <span className="text-text font-medium">{beneficiaryName}</span>
          </div>
          <div>
            <span className="text-text-faint">Notional:</span>{" "}
            <span className="text-text font-mono font-semibold tabular-nums">
              ${amount > 0 ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="space-y-2">
        {MOCK_CHECKS.map((check) => {
          const cfg = RESULT_CONFIG[check.result];
          const Icon = cfg.icon;
          return (
            <div
              key={check.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                cfg.bg,
                cfg.border
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{check.name}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      cfg.color
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{check.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gate Status */}
      {allPass ? (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400 font-medium">
            All compliance gates cleared. Entity authorized for settlement.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          One or more BLOCK-level checks failed. Resolve issues before proceeding.
        </div>
      )}
    </div>
  );
}
