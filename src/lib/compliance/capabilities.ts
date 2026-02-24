/* ================================================================
   COMPLIANCE CAPABILITIES — Client-side Capability Model
   ================================================================
   Mirrors the server-side capability ladder defined in authz.ts.
   This module provides UI-level gating: derive what the current
   user *can do* based on their KYC status, and expose a React
   hook for components to consume.

   IMPORTANT: This is for UI rendering only. Server-side
   enforcement via requireComplianceCapability() in authz.ts
   remains the authoritative gate for all privileged actions.
   ================================================================ */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useKycStatus } from "@/hooks/use-mock-queries";

/* ── Status & Capability Types ── */

/**
 * Compliance status as surfaced to the UI.
 * Maps from the raw KYC status values stored in the database.
 */
export type ComplianceStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "MANUAL_REVIEW"
  | "APPROVED"
  | "REJECTED";

/**
 * Capability ladder — matches the server-side definition in authz.ts.
 * Each capability implies all lower capabilities.
 */
export type ComplianceCapability =
  | "BROWSE"
  | "QUOTE"
  | "LOCK_PRICE"
  | "EXECUTE_PURCHASE"
  | "SETTLE";

/* ── Ordered Ladder ── */

const CAPABILITY_LADDER: ComplianceCapability[] = [
  "BROWSE",
  "QUOTE",
  "LOCK_PRICE",
  "EXECUTE_PURCHASE",
  "SETTLE",
];

/* ── KYC Status → Compliance Status ── */

const STATUS_MAP: Record<string, ComplianceStatus> = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "IN_PROGRESS",
  IN_REVIEW: "MANUAL_REVIEW",
  DOCUMENTS_REQUIRED: "IN_PROGRESS",
  ELEVATED: "MANUAL_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/* ── KYC Status → Maximum Capability (mirrors authz.ts KYC_CAPABILITY_MAP) ── */

const KYC_CAPABILITY_MAP: Record<string, ComplianceCapability> = {
  NOT_STARTED: "BROWSE",
  PENDING: "BROWSE",
  DOCUMENTS_REQUIRED: "BROWSE",
  IN_REVIEW: "QUOTE",
  ELEVATED: "QUOTE",
  APPROVED: "SETTLE",
  REJECTED: "BROWSE",
};

/* ── Pure Functions ── */

/**
 * Derive the user-facing compliance status from a raw KYC status string.
 */
export function deriveComplianceStatus(kycStatus: string): ComplianceStatus {
  return STATUS_MAP[kycStatus] ?? "NOT_STARTED";
}

/**
 * Derive the maximum capability from a raw KYC status string.
 */
export function deriveMaxCapability(kycStatus: string): ComplianceCapability {
  return KYC_CAPABILITY_MAP[kycStatus] ?? "BROWSE";
}

/**
 * Check whether a given max capability satisfies a required capability.
 * Returns true if maxCapability ≥ requiredCapability on the ladder.
 */
export function hasCapability(
  maxCapability: ComplianceCapability,
  requiredCapability: ComplianceCapability,
): boolean {
  const maxIndex = CAPABILITY_LADDER.indexOf(maxCapability);
  const reqIndex = CAPABILITY_LADDER.indexOf(requiredCapability);
  return maxIndex >= reqIndex;
}

/* ── React Hook ── */

export interface ComplianceCapabilities {
  /** User-facing compliance status */
  status: ComplianceStatus;
  /** Raw KYC status from the database */
  rawKycStatus: string;
  /** Maximum capability granted by current KYC status or tier */
  maxCapability: ComplianceCapability;
  /** Check if a specific capability is available */
  can: (capability: ComplianceCapability) => boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether the user is fully approved */
  isApproved: boolean;
  /** Active compliance case tier (null if no case exists) */
  caseTier: string | null;
}

/* ── Tier → Capability (mirrors server-side tiering.ts) ── */

const TIER_CAPABILITY_MAP: Record<string, ComplianceCapability> = {
  BROWSE: "BROWSE",
  QUOTE: "QUOTE",
  LOCK: "LOCK_PRICE",
  EXECUTE: "SETTLE",
};

/**
 * React hook that derives compliance capabilities from the
 * user's live KYC status AND their ComplianceCase tier.
 *
 * Priority:
 *   1. If a ComplianceCase exists with tier → use TIER_CAPABILITY_MAP
 *   2. Otherwise → fall back to KYC_CAPABILITY_MAP (legacy path)
 *
 * Usage:
 *   const { can, status, isApproved } = useComplianceCapabilities();
 *   if (can("LOCK_PRICE")) { showLockButton(); }
 */
export function useComplianceCapabilities(): ComplianceCapabilities {
  const { user } = useAuth();
  const kycQ = useKycStatus(user?.id ?? undefined);

  // Fetch the user's active ComplianceCase for tier-based capability
  const caseQ = useQuery<{ case: { tier: string; status: string } | null }>({
    queryKey: ["compliance-case-me"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/cases/me");
      if (!res.ok) return { case: null };
      return res.json();
    },
    staleTime: 15_000,
    enabled: !!user?.id,
  });

  const rawKycStatus = kycQ.data?.kycStatus ?? "NOT_STARTED";
  const caseTier = caseQ.data?.case?.tier ?? null;
  const caseStatus = caseQ.data?.case?.status ?? null;

  return useMemo(() => {
    const status = deriveComplianceStatus(rawKycStatus);

    // If a case exists and is APPROVED, use the tier-based capability
    let maxCapability: ComplianceCapability;
    if (caseTier && caseStatus === "APPROVED") {
      maxCapability = TIER_CAPABILITY_MAP[caseTier] ?? "BROWSE";
    } else {
      maxCapability = deriveMaxCapability(rawKycStatus);
    }

    return {
      status,
      rawKycStatus,
      maxCapability,
      can: (cap: ComplianceCapability) => hasCapability(maxCapability, cap),
      isLoading: kycQ.isLoading || caseQ.isLoading,
      isApproved: status === "APPROVED",
      caseTier,
    };
  }, [rawKycStatus, kycQ.isLoading, caseQ.isLoading, caseTier, caseStatus]);
}
