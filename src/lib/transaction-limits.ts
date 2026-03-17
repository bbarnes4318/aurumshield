/* ================================================================
   TRANSACTION LIMITS — Configurable Risk Controls
   ================================================================
   Centralized transaction limit configuration and enforcement.
   All limits are expressed in USD cents for precision.

   Limits are enforced at two points:
     1. MARKETPLACE — prevents order placement outside bounds
     2. WEBHOOK — holds deposits above manual review threshold

   Environment overrides (optional):
     TX_LIMIT_MIN_CENTS       — Minimum transaction (default: $1,000)
     TX_LIMIT_MAX_CENTS       — Hard cap (default: $50,000,000)
     TX_LIMIT_REVIEW_CENTS    — Manual review threshold (default: $5,000,000)
   ================================================================ */

/* ---------- Configuration ---------- */

export interface TransactionLimits {
  /** Minimum transaction amount in cents. Orders below this are rejected. */
  minCents: number;
  /** Manual review threshold in cents. Orders at or above this require human approval. */
  manualReviewCents: number;
  /** Hard maximum in cents. Orders above this are categorically rejected. */
  maxCents: number;
}

/**
 * Load transaction limits from environment variables with sensible defaults.
 * All values are in USD cents.
 */
export function getTransactionLimits(): TransactionLimits {
  return {
    minCents: parseInt(process.env.TX_LIMIT_MIN_CENTS ?? "100000", 10),          // $1,000
    manualReviewCents: parseInt(process.env.TX_LIMIT_REVIEW_CENTS ?? "500000000", 10), // $5,000,000
    maxCents: parseInt(process.env.TX_LIMIT_MAX_CENTS ?? "5000000000", 10),      // $50,000,000
  };
}

/* ---------- Validation ---------- */

export type LimitCheckResult =
  | { allowed: true; requiresReview: false }
  | { allowed: true; requiresReview: true; reason: string }
  | { allowed: false; reason: string };

/**
 * Validate a transaction amount against configured limits.
 *
 * @param amountCents — Transaction amount in USD cents
 * @returns Validation result with allowed/review/rejected status
 */
export function checkTransactionLimits(amountCents: number): LimitCheckResult {
  const limits = getTransactionLimits();

  if (amountCents < limits.minCents) {
    const minUsd = (limits.minCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return {
      allowed: false,
      reason: `Transaction amount below minimum threshold of ${minUsd}.`,
    };
  }

  if (amountCents > limits.maxCents) {
    const maxUsd = (limits.maxCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return {
      allowed: false,
      reason: `Transaction amount exceeds hard cap of ${maxUsd}. Contact Treasury for bespoke arrangements.`,
    };
  }

  if (amountCents >= limits.manualReviewCents) {
    const reviewUsd = (limits.manualReviewCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return {
      allowed: true,
      requiresReview: true,
      reason: `Transaction at or above ${reviewUsd} requires manual review before settlement proceeds.`,
    };
  }

  return { allowed: true, requiresReview: false };
}

/**
 * Format cents as USD for display.
 */
export function formatCentsAsUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
