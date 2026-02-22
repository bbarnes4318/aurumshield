"use client";

import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  UserX,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GateResult } from "@/lib/marketplace-engine";

/* ================================================================
   PUBLISH GATE PANEL
   Displays publish gate results with categorized blockers,
   severity badges, and actionable remediation links.
   ================================================================ */

/* ---------- Blocker Categorization ---------- */

interface CategorizedBlocker {
  label: string;
  description: string;
  severity: "critical" | "warning";
  icon: typeof XCircle;
  action?: { label: string; href: string };
}

function categorizeBlocker(raw: string): CategorizedBlocker {
  const upper = raw.toUpperCase();

  // KYC / Seller verification
  if (
    upper.includes("SELLER_NOT_VERIFIED") ||
    upper.includes("KYC") ||
    upper.includes("KYB") ||
    upper.includes("VERIFICATION")
  ) {
    return {
      label: "Identity Verification Required",
      description:
        "Your KYC/KYB identity perimeter must be completed before publishing.",
      severity: "critical",
      icon: UserX,
      action: {
        label: "Complete Verification",
        href: "/verification",
      },
    };
  }

  // Missing evidence
  if (upper.includes("MISSING_EVIDENCE") || upper.includes("EVIDENCE_INCOMPLETE")) {
    // Extract specific evidence type if present
    const match = raw.match(
      /MISSING_EVIDENCE:\s*(ASSAY_REPORT|CHAIN_OF_CUSTODY|SELLER_ATTESTATION)/i,
    );
    const evidenceType = match?.[1]?.replace(/_/g, " ")?.toLowerCase() ?? "required document";
    return {
      label: `Missing: ${evidenceType.charAt(0).toUpperCase() + evidenceType.slice(1)}`,
      description: `Upload the ${evidenceType} in the Evidence Pack step before publishing.`,
      severity: "critical",
      icon: FileWarning,
    };
  }

  // Data mismatch (Textract)
  if (upper.includes("DATA_MISMATCH") || upper.includes("PURITY") || upper.includes("WEIGHT")) {
    return {
      label: "Assay Data Mismatch",
      description: raw.replace(/^DATA_MISMATCH:\s*/i, ""),
      severity: "warning",
      icon: AlertTriangle,
    };
  }

  // Analysis failure
  if (upper.includes("ANALYSIS_FAILED")) {
    return {
      label: "Document Analysis Failed",
      description:
        "Textract could not extract purity/weight data. Upload a clearer scan of your Assay Report.",
      severity: "warning",
      icon: FileWarning,
    };
  }

  // Capital control
  if (upper.includes("CAPITAL_CONTROL")) {
    return {
      label: "Capital Control Block",
      description: raw.replace(/^CAPITAL_CONTROL:\s*/i, ""),
      severity: "critical",
      icon: ShieldAlert,
    };
  }

  // Fallback
  return {
    label: "Publication Blocked",
    description: raw,
    severity: "critical",
    icon: XCircle,
  };
}

/* ---------- Props ---------- */

interface PublishGatePanelProps {
  gateResult: GateResult | undefined;
  isLoading?: boolean;
  className?: string;
}

export function PublishGatePanel({
  gateResult,
  isLoading,
  className,
}: PublishGatePanelProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-faint">
          Publish Gate
        </h3>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-text-faint/10 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 rounded bg-text-faint/10 animate-pulse" />
              <div className="h-2.5 w-48 rounded bg-text-faint/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gateResult) return null;

  const categorized = gateResult.blockers.map(categorizeBlocker);
  const hasKYCBlock = categorized.some((b) =>
    b.action?.href === "/verification",
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-faint">
          Publish Gate
        </h3>
        {gateResult.allowed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All Checks Passed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
            <XCircle className="h-3.5 w-3.5" />
            {categorized.length} blocker{categorized.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Gate Result */}
      {gateResult.allowed ? (
        <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Ready to Publish</p>
              <p className="text-[11px] text-text-faint">
                All security checks passed. Your listing can be published to the
                marketplace.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {categorized.map((blocker, i) => {
            const Icon = blocker.icon;
            const isCritical = blocker.severity === "critical";
            return (
              <div
                key={i}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-4 py-3",
                  isCritical
                    ? "border-danger/20 bg-danger/5"
                    : "border-warning/20 bg-warning/5",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isCritical
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCritical ? "text-danger" : "text-warning",
                      )}
                    >
                      {blocker.label}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {blocker.description}
                    </p>
                    {blocker.action && (
                      <Link
                        href={blocker.action.href}
                        className={cn(
                          "inline-flex items-center gap-1.5 mt-2 rounded-[var(--radius-input)]",
                          "bg-danger px-4 py-2 text-xs font-semibold text-white",
                          "transition-colors hover:bg-danger/90",
                        )}
                      >
                        {blocker.action.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual check summary */}
      {gateResult.checks && (
        <div className="grid grid-cols-3 gap-2">
          <CheckPill
            label="Seller Verified"
            passed={gateResult.checks.sellerVerified}
          />
          <CheckPill
            label="Evidence Complete"
            passed={gateResult.checks.evidenceComplete}
          />
          <CheckPill
            label="Data Validated"
            passed={
              gateResult.checks.sellerVerified &&
              gateResult.checks.evidenceComplete &&
              gateResult.allowed
            }
          />
        </div>
      )}

      {/* KYC high-contrast CTA when verification is the sole remaining block */}
      {hasKYCBlock && !gateResult.allowed && categorized.length === 1 && (
        <div className="rounded-[var(--radius-sm)] border-2 border-danger bg-danger/10 p-4 text-center">
          <p className="text-sm font-semibold text-danger mb-2">
            Identity verification is required before publishing
          </p>
          <Link
            href="/verification"
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
              "bg-danger px-6 py-2.5 text-sm font-bold text-white",
              "transition-all hover:bg-danger/90 hover:shadow-lg",
            )}
          >
            Complete Verification Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------- Check Pill (mini status indicator) ---------- */

function CheckPill({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5",
        passed
          ? "border-success/20 bg-success/5"
          : "border-danger/20 bg-danger/5",
      )}
    >
      {passed ? (
        <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 text-danger shrink-0" />
      )}
      <span
        className={cn(
          "text-[10px] font-medium",
          passed ? "text-success" : "text-danger",
        )}
      >
        {label}
      </span>
    </div>
  );
}
