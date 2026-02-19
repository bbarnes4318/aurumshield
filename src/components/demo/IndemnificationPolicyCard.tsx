/* ================================================================
   INDEMNIFICATION POLICY CARD

   Official-looking policy card shown after activation.
   Displays policy ID, coverage limit, status, and timestamp.
   ================================================================ */

"use client";

import { Shield, CheckCircle2 } from "lucide-react";

interface IndemnificationPolicyCardProps {
  active?: boolean;
  policyId?: string;
  coverageLimitUsd?: number;
  issuedAt?: string;
}

export function IndemnificationPolicyCard({
  active = false,
  policyId = "AS-IND-2026-000123",
  coverageLimitUsd = 500_000,
  issuedAt = "2026-02-18T10:15:00Z",
}: IndemnificationPolicyCardProps) {
  return (
    <div
      className="card-base border border-border p-5 space-y-3"
      data-tour="indemnification-status"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">
            Indemnification Coverage
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            active
              ? "bg-success/10 text-success border-success/20"
              : "bg-surface-3 text-text-faint border-border"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              active ? "bg-success" : "bg-text-faint/40"
            }`}
          />
          {active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Policy details */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Policy ID</span>
          <span className="font-mono text-text">{policyId}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Coverage Limit</span>
          <span className="font-mono tabular-nums text-text">
            ${coverageLimitUsd.toLocaleString("en-US")}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Issued</span>
          <span className="font-mono tabular-nums text-text">
            {new Date(issuedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </span>
        </div>
      </div>

      {/* Status line */}
      {active && (
        <div className="flex items-center gap-2 rounded-sm bg-success/5 border border-success/20 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-[11px] font-medium text-success">
            Fraud Protection Engaged
          </span>
        </div>
      )}
    </div>
  );
}
