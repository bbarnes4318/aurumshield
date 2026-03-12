"use client";

/* ================================================================
   LIVE SETTLEMENTS HOOK — React Query + Server Action
   ================================================================
   Client-side synchronization hook for the Settlement Console.
   Calls the getLiveSettlements server action as queryFn.

   Stale time: 15 seconds — financial ledger needs fairly fresh
   data without hammering Postgres on every window focus.
   ================================================================ */

import { useQuery } from "@tanstack/react-query";
import {
  getLiveSettlements,
  type LiveSettlementRow,
} from "@/actions/settlement-queries";

/**
 * Fetch live settlement data from PostgreSQL via server action.
 *
 * - 15s staleTime: treasury operators see fresh data without
 *   redundant DB queries on every tab focus.
 * - refetchOnWindowFocus: true (default) ensures data refreshes
 *   when operator returns to the tab.
 * - gcTime: 60s — cached data lives for 1 minute after going stale.
 */
export function useLiveSettlements() {
  return useQuery<LiveSettlementRow[]>({
    queryKey: ["live-settlements"],
    queryFn: () => getLiveSettlements(),
    staleTime: 15_000,       // 15 seconds — financial-grade freshness
    gcTime: 60_000,          // 60 seconds garbage collection
    refetchOnWindowFocus: true,
  });
}
