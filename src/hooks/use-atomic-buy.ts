"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createReservation, convertReservationToOrder } from "@/lib/api";
import { mockCapitalPhase1, mockCounterparties, mockCorridors } from "@/lib/mock-data";
import { computeTRI, validateCapital, checkBlockers, determineApproval, hasBlockLevel } from "@/lib/policy-engine";
import type { MarketplacePolicySnapshot } from "@/lib/policy-engine";
import type { Reservation, Order } from "@/lib/mock-data";

/* ================================================================
   Atomic Buy Hook — chains Reserve → Convert into a single action
   ================================================================ */

export interface AtomicBuyInput {
  listingId: string;
  userId: string;
  weightOz: number;
  /** Notional value for policy evaluation */
  notional: number;
}

export type AtomicBuyStep = "idle" | "reserving" | "converting" | "done" | "error";

export interface AtomicBuyResult {
  reservation: Reservation;
  order: Order;
}

export interface UseAtomicBuyReturn {
  /** Trigger the atomic buy flow */
  execute: (input: AtomicBuyInput) => Promise<AtomicBuyResult>;
  /** Current step in the flow */
  step: AtomicBuyStep;
  /** Error message if step === "error" */
  error: string | null;
  /** Whether the flow is in progress */
  isPending: boolean;
  /** Result from a successful flow */
  result: AtomicBuyResult | null;
  /** Reset state back to idle */
  reset: () => void;
}

/**
 * Deterministically generates a MarketplacePolicySnapshot for the conversion step.
 * Uses the same policy engine functions as the reservations page.
 */
function buildPolicySnapshot(notional: number): MarketplacePolicySnapshot {
  // Use a default counterparty and corridor for the buyer-side policy evaluation
  const cp = mockCounterparties[0]; // Aurelia Sovereign Fund
  const corridor = mockCorridors[0]; // US-UK corridor
  const capital = mockCapitalPhase1;

  const tri = computeTRI(cp, corridor, notional, capital);
  const capVal = validateCapital(notional, capital);
  const blockers = checkBlockers(cp, corridor, undefined, tri, notional, capital);
  const approval = determineApproval(tri.score, notional);

  return {
    triScore: tri.score,
    triBand: tri.band,
    ecrBefore: capVal.currentECR,
    ecrAfter: capVal.postTxnECR,
    hardstopBefore: capVal.currentHardstopUtil,
    hardstopAfter: capVal.postTxnHardstopUtil,
    approvalTier: approval.tier,
    blockers,
    timestamp: new Date().toISOString(),
  };
}

export function useAtomicBuy(): UseAtomicBuyReturn {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AtomicBuyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtomicBuyResult | null>(null);

  const execute = useCallback(
    async (input: AtomicBuyInput): Promise<AtomicBuyResult> => {
      setStep("reserving");
      setError(null);
      setResult(null);

      try {
        // Step 1: Create reservation (locks inventory)
        const reservation = await createReservation({
          listingId: input.listingId,
          userId: input.userId,
          weightOz: input.weightOz,
        });

        setStep("converting");

        // Step 2: Build policy snapshot + convert to order
        const policySnapshot = buildPolicySnapshot(input.notional);

        // Guard: if policy has BLOCK-level blockers, abort
        if (hasBlockLevel(policySnapshot.blockers)) {
          const blockMessages = policySnapshot.blockers
            .filter((b) => b.severity === "BLOCK")
            .map((b) => b.title)
            .join(", ");
          throw new Error(`Policy blocked: ${blockMessages}`);
        }

        const order = await convertReservationToOrder({
          reservationId: reservation.id,
          userId: input.userId,
          policySnapshot,
        });

        const res: AtomicBuyResult = { reservation, order };
        setResult(res);
        setStep("done");

        // Invalidate all relevant queries so the UI refreshes
        queryClient.invalidateQueries({ queryKey: ["listings"] });
        queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
        queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        queryClient.invalidateQueries({ queryKey: ["order"] });

        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep("error");
        throw err;
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
  }, []);

  return {
    execute,
    step,
    error,
    isPending: step === "reserving" || step === "converting",
    result,
    reset,
  };
}
