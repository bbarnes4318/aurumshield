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
  /** Maximum capability granted by current KYC status */
  maxCapability: ComplianceCapability;
  /** Check if a specific capability is available */
  can: (capability: ComplianceCapability) => boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether the user is fully approved */
  isApproved: boolean;
}

/**
 * React hook that derives compliance capabilities from the
 * user's live KYC status (via the existing TanStack Query).
 *
 * Usage:
 *   const { can, status, isApproved } = useComplianceCapabilities();
 *   if (can("LOCK_PRICE")) { showLockButton(); }
 */
export function useComplianceCapabilities(): ComplianceCapabilities {
  const { user } = useAuth();
  const kycQ = useKycStatus(user?.id ?? undefined);

  const rawKycStatus = kycQ.data?.kycStatus ?? "NOT_STARTED";

  return useMemo(() => {
    const status = deriveComplianceStatus(rawKycStatus);
    const maxCapability = deriveMaxCapability(rawKycStatus);

    return {
      status,
      rawKycStatus,
      maxCapability,
      can: (cap: ComplianceCapability) => hasCapability(maxCapability, cap),
      isLoading: kycQ.isLoading,
      isApproved: status === "APPROVED",
    };
  }, [rawKycStatus, kycQ.isLoading]);
}
