"use client";

/* ================================================================
   USE AML STATUS — TanStack Query hook
   ================================================================
   Client-side hook for checking AML training completion status.
   Used by Broker and Counterparty dashboards to render blocking
   banners when AML training is incomplete.

   Wraps GET /api/compliance/aml-status.
   Falls back to mock data if the endpoint is unavailable.
   ================================================================ */

import { useQuery } from "@tanstack/react-query";

/* ── Types ── */

interface AmlStatusResponse {
  /** Whether AML training has been completed */
  isComplete: boolean;
  /** ISO timestamp of last completion, null if never completed */
  completedAt: string | null;
  /** User's full name on the certificate */
  certifiedName: string | null;
}

/* ── Default mock response (training NOT complete) ── */
const MOCK_AML_STATUS: AmlStatusResponse = {
  isComplete: false,
  completedAt: null,
  certifiedName: null,
};

/* ── Hook ── */

export function useAmlStatus(enabled = true) {
  return useQuery<AmlStatusResponse>({
    queryKey: ["aml-status"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/compliance/aml-status");
        if (!res.ok) {
          // TODO: Wire to real endpoint — return mock for now
          console.warn(`[useAmlStatus] API returned ${res.status}, using mock data`);
          return MOCK_AML_STATUS;
        }
        return await res.json();
      } catch {
        // Network error — fall back to mock (training incomplete)
        console.warn("[useAmlStatus] Network error, using mock data");
        return MOCK_AML_STATUS;
      }
    },
    enabled,
    staleTime: 30_000, // 30s — AML status changes very infrequently
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}
