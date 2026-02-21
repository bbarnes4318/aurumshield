"use client";

import { cn } from "@/lib/utils";
import {
  Lock,
  Fingerprint,
  Landmark,
  Award,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { SettlementStatus, OrderStatus } from "@/lib/mock-data";

/* ================================================================
   Step Model — the 4-phase buyer lifecycle
   ================================================================ */

export type BuyerLifecyclePhase = 1 | 2 | 3 | 4;

interface LifecycleStep {
  phase: BuyerLifecyclePhase;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    phase: 1,
    label: "Inventory Lock",
    sublabel: "Gold reserved, price locked",
    icon: Lock,
  },
  {
    phase: 2,
    label: "Identity Perimeter",
    sublabel: "KYC / KYB verification",
    icon: Fingerprint,
  },
  {
    phase: 3,
    label: "Capital Activation",
    sublabel: "Payment & settlement",
    icon: Landmark,
  },
  {
    phase: 4,
    label: "Finality",
    sublabel: "Certificate issued",
    icon: Award,
  },
];

/* ================================================================
   Phase Derivation — deterministic from order + settlement state
   ================================================================ */

export function deriveCurrentPhase(
  orderStatus?: OrderStatus,
  settlementStatus?: SettlementStatus | null,
  hasCertificate?: boolean,
): BuyerLifecyclePhase {
  // Phase 4: SETTLED with certificate
  if (settlementStatus === "SETTLED" || hasCertificate) return 4;

  // Phase 3: Settlement is open and progressing
  if (
    settlementStatus &&
    [
      "ESCROW_OPEN",
      "AWAITING_FUNDS",
      "AWAITING_GOLD",
      "READY_TO_SETTLE",
      "AUTHORIZED",
    ].includes(settlementStatus)
  ) {
    return 3;
  }

  // Phase 2: Order in verification stage
  if (
    orderStatus === "pending_verification" ||
    orderStatus === "settlement_pending" ||
    settlementStatus === "AWAITING_VERIFICATION"
  ) {
    return 2;
  }

  // Phase 1: Reserved / draft
  return 1;
}

/* ================================================================
   Phase Action Map — per-phase CTA definitions
   ================================================================ */

export interface PhaseAction {
  label: string;
  href: string;
  /** Use primary (filled gold) styling instead of subtle outline */
  primary?: boolean;
}

/** Default phase actions when no parent override is provided */
const DEFAULT_PHASE_ACTIONS: Record<BuyerLifecyclePhase, PhaseAction> = {
  1: { label: "View Order", href: "#" },
  2: { label: "Complete Verification", href: "/verification", primary: true },
  3: { label: "Activate Payment", href: "#", primary: true },
  4: { label: "View Certificate", href: "#" },
};

/* ================================================================
   Component Props
   ================================================================ */

interface TransactionProgressSidebarProps {
  /** Current lifecycle phase (1–4) */
  currentPhase: BuyerLifecyclePhase;
  /** Timestamp strings for each completed phase (index 0 = phase 1) */
  timestamps?: (string | null)[];
  /** Override CTA for the current step (legacy single-CTA mode) */
  ctaLabel?: string;
  ctaHref?: string;
  /** Phase-specific CTA overrides (takes precedence over ctaLabel/ctaHref) */
  phaseActions?: Partial<Record<BuyerLifecyclePhase, PhaseAction>>;
  /** Compact mode for embedding in cards */
  compact?: boolean;
  className?: string;
}

/* ================================================================
   Component
   ================================================================ */

export function TransactionProgressSidebar({
  currentPhase,
  timestamps = [],
  ctaLabel,
  ctaHref,
  phaseActions,
  compact = false,
  className,
}: TransactionProgressSidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0",
        compact ? "gap-0" : "gap-1",
        className,
      )}
      role="list"
      aria-label="Transaction lifecycle progress"
      data-tour="buyer-lifecycle-rail"
    >
      {LIFECYCLE_STEPS.map((step, idx) => {
        const isCompleted = step.phase < currentPhase;
        const isCurrent = step.phase === currentPhase;
        const isPending = step.phase > currentPhase;
        const Icon = step.icon;
        const timestamp = timestamps[idx] ?? null;

        return (
          <div key={step.phase} role="listitem" className="flex gap-3">
            {/* Vertical rail line + dot */}
            <div className="flex flex-col items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted &&
                    "border-success bg-success/10 text-success",
                  isCurrent &&
                    "border-gold bg-gold/10 text-gold shadow-[0_0_12px_rgba(var(--gold-rgb),0.25)]",
                  isPending &&
                    "border-border bg-surface-2 text-text-faint",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 opacity-40" />
                )}
              </div>
              {/* Connector line (not on last item) */}
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[28px] transition-colors duration-300",
                    step.phase < currentPhase
                      ? "bg-success/40"
                      : "bg-border",
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn("pb-5", compact && "pb-3")}>
              <p
                className={cn(
                  "text-sm font-medium leading-tight",
                  isCompleted && "text-success",
                  isCurrent && "text-gold",
                  isPending && "text-text-faint",
                )}
              >
                {step.label}
              </p>
              {!compact && (
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    isCurrent ? "text-text-muted" : "text-text-faint",
                  )}
                >
                  {step.sublabel}
                </p>
              )}
              {/* Completed timestamp */}
              {isCompleted && timestamp && (
                <p className="text-[10px] text-text-faint tabular-nums mt-0.5">
                  {new Date(timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {/* CTA on current step — phase-aware */}
              {isCurrent && (() => {
                // Resolve CTA: phaseActions override > legacy ctaLabel/ctaHref > defaults
                const resolved =
                  phaseActions?.[step.phase] ??
                  (ctaLabel && ctaHref
                    ? { label: ctaLabel, href: ctaHref, primary: step.phase === 2 || step.phase === 3 }
                    : DEFAULT_PHASE_ACTIONS[step.phase]);
                if (!resolved || resolved.href === "#") return null;
                const isPrimary = resolved.primary;
                return (
                  <Link
                    href={resolved.href}
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-[var(--radius-input)] px-3 py-1.5 text-xs font-medium transition-colors",
                      isPrimary
                        ? "bg-gold text-bg hover:bg-gold-hover shadow-sm"
                        : "border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 hover:border-gold/50",
                    )}
                    data-tour="lifecycle-cta"
                  >
                    {resolved.label}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
