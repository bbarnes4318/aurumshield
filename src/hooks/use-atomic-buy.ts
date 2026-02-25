"use client";

import { useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiExecuteAtomicCheckout, apiGetOrderStatus } from "@/lib/api";
import type { Reservation, Order } from "@/lib/mock-data";
import type { TradeStatus } from "@/lib/state-machine";

/* ================================================================
   Atomic Buy Hook — Server-Authoritative State Machine (Phase 0)
   ================================================================
   RSK-001/002: The UI MUST NOT maintain optimistic local state for
   trade lifecycle. After the initial atomic checkout call, the hook
   polls the server for the definitive TradeStatus until a terminal
   state is reached.

   The local `AtomicBuyStep` is retained ONLY for UI chrome
   (loading spinners, error boundaries). It is derived from the
   server's `TradeStatus`, never set independently.

   State flow:
     idle → executing → [polling server TradeStatus] → done | error

   The client MUST NOT import or execute any policy engine functions.
   ================================================================ */

export interface AtomicBuyInput {
  /** Listing to purchase from */
  listingId: string;
  /** Authenticated buyer ID */
  userId: string;
  /** Weight in troy ounces to purchase */
  weightOz: number;
  /** Quote ID from price-lock step — REQUIRED for server-side oracle binding (RSK-004) */
  quoteId: string;
}

/**
 * UI display step — derived from server TradeStatus.
 * "polling" indicates the hook is waiting for the server to
 * reach a terminal state.
 */
export type AtomicBuyStep = "idle" | "executing" | "polling" | "done" | "error";

/** Terminal TradeStatus values that stop polling. */
const TERMINAL_TRADE_STATUSES: ReadonlySet<TradeStatus> = new Set([
  "SETTLED",
  "REJECTED_COMPLIANCE",
  "CANCELLED",
  "FAILED",
]);

export interface AtomicBuyResult {
  reservation: Reservation;
  order: Order;
}

export interface UseAtomicBuyReturn {
  /** Trigger the atomic buy flow */
  execute: (input: AtomicBuyInput) => Promise<AtomicBuyResult>;
  /** Current step in the flow (derived from server state) */
  step: AtomicBuyStep;
  /** Server-authoritative trade status (null before execution) */
  tradeStatus: TradeStatus | null;
  /** Error message if step === "error" */
  error: string | null;
  /** Whether the flow is in progress */
  isPending: boolean;
  /** Result from a successful flow */
  result: AtomicBuyResult | null;
  /** Reset state back to idle */
  reset: () => void;
}

/** Polling interval for trade status (ms). */
const POLL_INTERVAL_MS = 2_000;

export function useAtomicBuy(): UseAtomicBuyReturn {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AtomicBuyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtomicBuyResult | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus | null>(null);

  const [isPolling, setIsPolling] = useState(false);

  // ── Server-authoritative polling ──
  // Polls the order status until a terminal TradeStatus is reached.
  // Terminal state handling is done inline in queryFn to avoid
  // setState-in-effect cascading render warnings.
  useQuery({
    queryKey: ["order-trade-status", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const status = await apiGetOrderStatus(orderId);

      // Handle terminal state inline — stop polling and update UI state
      if (status && TERMINAL_TRADE_STATUSES.has(status.tradeStatus)) {
        setIsPolling(false);
        setTradeStatus(status.tradeStatus);

        if (status.tradeStatus === "SETTLED") {
          setStep("done");
        } else {
          setError(
            `Trade ${status.tradeStatus}: ${status.reason ?? "See order details"}`,
          );
          setStep("error");
        }

        // Invalidate queries on terminal state
        queryClient.invalidateQueries({ queryKey: ["listings"] });
        queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
        queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        queryClient.invalidateQueries({ queryKey: ["order"] });
      } else if (status) {
        // Non-terminal — update trade status for UI display
        setTradeStatus(status.tradeStatus);
      }

      return status;
    },
    enabled: isPolling && !!orderId,
    refetchInterval: isPolling ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  const execute = useCallback(
    async (input: AtomicBuyInput): Promise<AtomicBuyResult> => {
      setStep("executing");
      setError(null);
      setResult(null);
      setTradeStatus("PENDING_ALLOCATION");
      setIsPolling(false);

      try {
        // Generate client-side idempotency key for retry safety
        const idempotencyKey = crypto.randomUUID();

        // Single atomic API call — server handles ALL compliance evaluation
        const { reservation, order } = await apiExecuteAtomicCheckout({
          listingId: input.listingId,
          userId: input.userId,
          weightOz: input.weightOz,
          idempotencyKey,
          quoteId: input.quoteId,
        });

        const res: AtomicBuyResult = { reservation, order };
        setResult(res);
        setOrderId(order.id);

        // Transition to polling — the server state machine is now authoritative.
        // The UI will poll until the TradeStatus reaches a terminal state.
        // For the mock environment, the order is immediately completed,
        // so we check the order status and may skip polling.
        if (order.status === "completed") {
          setTradeStatus("SETTLED");
          setStep("done");

          // Invalidate immediately for completed orders
          queryClient.invalidateQueries({ queryKey: ["listings"] });
          queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
          queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
          queryClient.invalidateQueries({ queryKey: ["my-orders"] });
          queryClient.invalidateQueries({ queryKey: ["order"] });
        } else {
          // Non-terminal — begin polling
          setStep("polling");
          setIsPolling(true);
        }

        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep("error");
        setTradeStatus(null);
        throw err;
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
    setOrderId(null);
    setTradeStatus(null);
    setIsPolling(false);
  }, []);

  return {
    execute,
    step,
    tradeStatus,
    error,
    isPending: step === "executing" || step === "polling",
    result,
    reset,
  };
}
