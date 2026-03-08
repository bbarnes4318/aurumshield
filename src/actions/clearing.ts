"use server";

/* ================================================================
   ADMIN CLEARING — Concierge Settlement Operations
   ================================================================
   Server action for manual fund verification in the Concierge
   Settlement model. An admin verifies receipt of inbound wire/crypto
   funds in the corporate treasury, then triggers the state machine
   to advance the settlement to SETTLED.

   This file runs ENTIRELY on the server — no secrets are exposed
   to the client.
   ================================================================ */

/** Structured result returned after a manual clearing operation. */
export interface ClearFundsResult {
  /** Whether the clearing operation succeeded. */
  success: boolean;
  /** The settlement that was cleared. */
  settlementId: string;
  /** The new status after clearing. */
  newStatus: "SETTLED";
  /** ISO 8601 timestamp of the clearing event. */
  clearedAt: string;
  /** Admin audit notes attached to the clearing event. */
  adminNotes: string;
  /** Error message if the operation failed. */
  error?: string;
}

/**
 * Manually clear funds for a settlement in AWAITING_FUNDS status.
 *
 * Called from the Operations Control Panel on the settlement detail
 * page. The admin has verified receipt of inbound funds (wire or
 * stablecoin) in the corporate treasury and is authorizing the
 * state machine to advance the settlement to SETTLED.
 *
 * TODO: Replace simulated delay with actual database update:
 *   1. Verify settlement exists and is in AWAITING_FUNDS status
 *   2. Update settlement_cases SET status = 'SETTLED'
 *   3. Insert ledger entry (FUNDS_DEPOSITED + STATUS_CHANGED)
 *   4. Record admin audit trail
 *
 * @param settlementId — AurumShield settlement ID to clear
 * @param adminNotes   — Audit notes (e.g., "Wire received via Chase")
 */
export async function manuallyClearFunds(
  settlementId: string,
  adminNotes: string,
): Promise<ClearFundsResult> {
  /* ── Validate inputs ── */
  if (!settlementId?.trim()) {
    return {
      success: false,
      settlementId: "",
      newStatus: "SETTLED",
      clearedAt: new Date().toISOString(),
      adminNotes,
      error: "Settlement ID is required.",
    };
  }

  if (!adminNotes?.trim()) {
    return {
      success: false,
      settlementId,
      newStatus: "SETTLED",
      clearedAt: new Date().toISOString(),
      adminNotes: "",
      error: "Admin audit notes are required for compliance.",
    };
  }

  /* ── Simulate 1-second database execution ── */
  console.log(
    `[AurumShield] Admin clearing funds for settlement=${settlementId} ` +
      `notes="${adminNotes.trim()}"`,
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const clearedAt = new Date().toISOString();

  console.log(
    `[AurumShield] Settlement ${settlementId} cleared → SETTLED ` +
      `at ${clearedAt} by admin`,
  );

  return {
    success: true,
    settlementId,
    newStatus: "SETTLED",
    clearedAt,
    adminNotes: adminNotes.trim(),
  };
}
