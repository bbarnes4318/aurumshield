"use client";

/* ================================================================
   COMPLIANCE BANNER — Persistent Compliance Status Panel
   ================================================================
   Displayed at the top of the authenticated app shell when the
   user's compliance status ≠ APPROVED. Shows current status,
   a contextual message, and actionable CTAs.

   Parallel Engagement:
     UNDER_REVIEW users with parallel_engagement_enabled see an
     informational banner encouraging mock checkout and live
     pricing exploration while KYB review proceeds.

   Progressive Profiling:
     NOT_STARTED users are informed they have BROWSE access and
     can explore before completing identity verification.

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
  Sparkles,
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
      "You have BROWSE access — explore the marketplace. Complete verification to unlock trading.",
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
    ctaHref: "/compliance/case",
  },
  APPROVED: null, // No banner when approved
};

/** Parallel Engagement banner — shown for UNDER_REVIEW + parallel_engagement_enabled */
const PARALLEL_ENGAGEMENT_CONFIG: BannerConfig = {
  icon: Sparkles,
  bg: "bg-info/5",
  border: "border-info/15",
  iconColor: "text-info",
  textColor: "text-info",
  message:
    "Your KYB review is in progress — explore live indicative pricing and mock checkouts while you wait",
  ctaLabel: "Browse Marketplace",
  ctaHref: "/buyer",
};

/* ── Component ── */

export function ComplianceBanner() {
  const {
    status,
    isLoading,
    isApproved,
    parallelEngagementEnabled,
    rawKycStatus,
  } = useComplianceCapabilities();

  // Don't render while loading or when approved
  if (isLoading || isApproved) return null;

  // Parallel Engagement: UNDER_REVIEW users with the flag get a special banner
  const isParallelEngagement =
    rawKycStatus === "UNDER_REVIEW" && parallelEngagementEnabled;

  const config = isParallelEngagement
    ? PARALLEL_ENGAGEMENT_CONFIG
    : BANNER_CONFIG[status];

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
          isParallelEngagement
            ? "bg-info/15 border border-info/25 text-info"
            : status === "REJECTED" || status === "MANUAL_REVIEW"
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
