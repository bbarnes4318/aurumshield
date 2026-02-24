"use client";

/* ================================================================
   COMPLIANCE BANNER — Persistent Compliance Status Panel
   ================================================================
   Displayed at the top of the authenticated app shell when the
   user's compliance status ≠ APPROVED. Shows current status,
   a contextual message, and actionable CTAs.

   Renders nothing when the user is fully approved — the banner
   silently disappears once KYC is complete.
   ================================================================ */

import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useComplianceCapabilities,
  type ComplianceStatus,
} from "@/lib/compliance/capabilities";

/* ── Banner Configuration ── */

interface BannerConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

const BANNER_CONFIG: Record<ComplianceStatus, BannerConfig | null> = {
  NOT_STARTED: {
    icon: Shield,
    bg: "bg-gold/5",
    border: "border-gold/15",
    iconColor: "text-gold",
    textColor: "text-gold",
    message:
      "Complete identity verification to unlock trading capabilities",
    ctaLabel: "Start Verification",
    ctaHref: "/onboarding/compliance",
  },
  IN_PROGRESS: {
    icon: Clock,
    bg: "bg-info/5",
    border: "border-info/15",
    iconColor: "text-info",
    textColor: "text-info",
    message:
      "Verification in progress — you can browse the marketplace while we process",
    ctaLabel: "View Status",
    ctaHref: "/onboarding/compliance",
  },
  MANUAL_REVIEW: {
    icon: AlertTriangle,
    bg: "bg-warning/5",
    border: "border-warning/15",
    iconColor: "text-warning",
    textColor: "text-warning",
    message:
      "Your verification is under manual review by our compliance team",
    ctaLabel: "Contact Compliance",
    // TODO: Phase 2 — route to /compliance/case when Compliance Case page is built
    ctaHref: "/compliance/case",
  },
  REJECTED: {
    icon: XCircle,
    bg: "bg-danger/5",
    border: "border-danger/15",
    iconColor: "text-danger",
    textColor: "text-danger",
    message:
      "Your verification requires attention — please contact our compliance team",
    ctaLabel: "Contact Compliance",
    // TODO: Phase 2 — route to /compliance/case when Compliance Case page is built
    ctaHref: "/compliance/case",
  },
  APPROVED: null, // No banner when approved
};

/* ── Component ── */

export function ComplianceBanner() {
  const { status, isLoading, isApproved } = useComplianceCapabilities();

  // Don't render while loading or when approved
  if (isLoading || isApproved) return null;

  const config = BANNER_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 border-b px-4 py-2.5",
        config.bg,
        config.border,
      )}
      role="status"
      aria-live="polite"
      aria-label="Compliance status"
    >
      {/* Status Icon */}
      <Icon className={cn("h-4 w-4 shrink-0", config.iconColor)} />

      {/* Message */}
      <p className={cn("flex-1 text-xs font-medium", config.textColor)}>
        {config.message}
      </p>

      {/* Help Link */}
      <Link
        href="/compliance/case"
        className="inline-flex items-center gap-1 text-[10px] text-text-faint hover:text-text-muted transition-colors"
        title="Help / Contact Compliance"
      >
        <HelpCircle className="h-3 w-3" />
        <span className="hidden sm:inline">Help</span>
      </Link>

      {/* Primary CTA */}
      <Link
        href={config.ctaHref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-input)]",
          "px-3 py-1 text-xs font-semibold",
          "transition-all hover:opacity-90 active:scale-[0.98]",
          status === "REJECTED" || status === "MANUAL_REVIEW"
            ? "bg-surface-1 border border-border text-text"
            : "bg-gold text-bg hover:bg-gold-hover",
        )}
      >
        {status === "APPROVED" ? (
          <ShieldCheck className="h-3 w-3" />
        ) : null}
        {config.ctaLabel}
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
