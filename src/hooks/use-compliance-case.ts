"use client";

/* ================================================================
   USE COMPLIANCE CASE — TanStack Query hooks
   ================================================================
   1. useComplianceCaseVerification()
      Fetches the authenticated user's ComplianceCase from
      GET /api/compliance/cases/me and derives verification
      milestone state from the authoritative case status.

   2. useInitiateVerification()
      Mutation that POSTs to /api/compliance/cases/me/initiate
      to create a compliance case and route the user to the
      active provider (iDenfy/Veriff).

   Refetch interval: 10s when case is in a transitional state
   (PENDING_USER, PENDING_PROVIDER, UNDER_REVIEW) so the UI
   updates automatically when the provider webhook fires.
   ================================================================ */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deriveVerificationFromCase,
  isVerificationComplete,
  getVerificationStatusLabel,
  type VerificationStageData,
  type ComplianceCaseStatusLite,
} from "@/lib/schemas/verification-stage-schema";

/* ── API Response Shapes ── */

interface ComplianceCaseResponse {
  case: {
    id: string;
    status: ComplianceCaseStatusLite;
    entityType: string | null;
    verifiedBy: string | null;
    tier: string;
  } | null;
  events: unknown[];
}

export interface InitiateVerificationResponse {
  status: "REDIRECT" | "ALREADY_CLEARED" | "IN_PROGRESS" | "ERROR";
  redirectUrl?: string;
  provider?: "VERIFF" | "IDENFY";
  sessionId?: string;
  error?: string;
}

/* ── Hook Return Type ── */

export interface ComplianceCaseVerification {
  /** Authoritative milestone states derived from compliance case */
  milestones: VerificationStageData;
  /** Whether all 4 milestones are complete (APPROVED) */
  allComplete: boolean;
  /** Raw compliance case status, or null if no case exists */
  caseStatus: ComplianceCaseStatusLite | null;
  /** Human-readable status label for the UI */
  statusLabel: string;
  /** True while the initial fetch is in progress */
  isLoading: boolean;
  /** True if the API call failed */
  isError: boolean;
  /** Compliance case ID, if one exists */
  caseId: string | null;
}

/* ── Transitional statuses that should trigger polling ── */

const POLLING_STATUSES = new Set<ComplianceCaseStatusLite>([
  "PENDING_USER",
  "PENDING_PROVIDER",
  "UNDER_REVIEW",
]);

/* ── Hook: Read compliance case verification status ── */

export function useComplianceCaseVerification(): ComplianceCaseVerification {
  const query = useQuery<ComplianceCaseResponse>({
    queryKey: ["compliance-case-verification"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/cases/me");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 10_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    /* Auto-refetch every 10s when in a transitional state so the
       UI updates when the Veriff/iDenfy webhook fires. */
    refetchInterval: (query) => {
      const caseStatus = query.state.data?.case?.status ?? null;
      if (caseStatus && POLLING_STATUSES.has(caseStatus)) {
        return 10_000; // 10s polling
      }
      return false; // No polling when settled
    },
  });

  const caseStatus = query.data?.case?.status ?? null;
  const milestones = deriveVerificationFromCase(caseStatus);
  const allComplete = isVerificationComplete(milestones);
  const statusLabel = getVerificationStatusLabel(caseStatus);
  const caseId = query.data?.case?.id ?? null;

  return {
    milestones,
    allComplete,
    caseStatus,
    statusLabel,
    isLoading: query.isLoading,
    isError: query.isError,
    caseId,
  };
}

/* ── Hook: Initiate provider verification ── */

export function useInitiateVerification() {
  const queryClient = useQueryClient();

  return useMutation<InitiateVerificationResponse, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/compliance/cases/me/initiate", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      /* Invalidate the case query so the page re-fetches authoritative
         status. This handles ALREADY_CLEARED and IN_PROGRESS transitions. */
      queryClient.invalidateQueries({
        queryKey: ["compliance-case-verification"],
      });
    },
  });
}
