/* Turnkey Webhook — Inbound USDT Deposit Listener */

/* ================================================================
   TURNKEY INBOUND WEBHOOK — USDT Deposit Listener
   ================================================================
   Receives webhook notifications from Turnkey when an ERC-20 USDT
   transfer is detected on a settlement's MPC deposit wallet.

   When the deposited amount >= required notional (converted to
   6-decimal USDT base units), this handler advances the settlement
   state machine by calling CONFIRM_FUNDS_FINAL.

   Security:
     - HMAC-SHA256 signature validation using TURNKEY_WEBHOOK_SECRET
     - X-Turnkey-Signature header verification

   CRITICAL MATH:
     Our DB stores notionalCents (10^2). USDT uses 6 decimals (10^6).
     requiredBaseUnits = BigInt(notionalCents) * BigInt(10000)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPoolClient } from "@/lib/db";

/* ---------- Types ---------- */

interface TurnkeyWebhookPayload {
  /** Webhook event type */
  type: string;
  /** Event timestamp (ISO 8601) */
  timestamp: string;
  /** Organization ID the event belongs to */
  organizationId: string;
  /** Sub-organization ID (maps to settlement-scoped wallet) */
  subOrganizationId?: string;
  /** Token transfer details (for ERC-20 deposit events) */
  tokenTransfer?: {
    /** Contract address of the token (USDT) */
    contractAddress: string;
    /** Sender wallet address */
    fromAddress: string;
    /** Recipient wallet address (our MPC deposit wallet) */
    toAddress: string;
    /**
     * Transfer amount in base units (6 decimals for USDT).
     * Example: "50000000000" = 50,000.000000 USDT
     */
    amount: string;
    /** Ethereum transaction hash */
    transactionHash: string;
    /** Block number */
    blockNumber: number;
    /** Token symbol */
    tokenSymbol?: string;
    /** Token decimals (6 for USDT) */
    tokenDecimals?: number;
  };
}

/* ---------- USDT Constants ---------- */

/** USDT contract address on Ethereum mainnet (checksummed) */
const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/* ---------- Signature Validation ---------- */

/**
 * Validate the webhook signature using HMAC-SHA256.
 * Turnkey sends the signature in the X-Turnkey-Signature header.
 *
 * @param rawBody - Raw request body as a string
 * @param signature - Value of the X-Turnkey-Signature header
 * @param secret - TURNKEY_WEBHOOK_SECRET from environment
 * @returns true if the signature is valid
 */
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/* ---------- POST Handler ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.TURNKEY_WEBHOOK_SECRET;

  /* ── 1. Read raw body ── */
  const rawBody = await request.text();

  /* ── 2. Signature verification ── */
  if (webhookSecret) {
    const signature =
      request.headers.get("x-turnkey-signature") ??
      request.headers.get("X-Turnkey-Signature") ??
      "";

    if (!signature) {
      console.error("[TURNKEY-WEBHOOK] Missing X-Turnkey-Signature header");
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 },
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[TURNKEY-WEBHOOK] Invalid webhook signature — rejecting");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "[TURNKEY-WEBHOOK] TURNKEY_WEBHOOK_SECRET not set — signature validation SKIPPED (development mode only)",
    );
  }

  /* ── 3. Parse payload ── */
  let payload: TurnkeyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TurnkeyWebhookPayload;
  } catch {
    console.error("[TURNKEY-WEBHOOK] Failed to parse webhook payload");
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  console.log(
    `[TURNKEY-WEBHOOK] Received event: type=${payload.type} ` +
      `org=${payload.organizationId} subOrg=${payload.subOrganizationId ?? "N/A"} ` +
      `timestamp=${payload.timestamp}`,
  );

  /* ── 4. Filter for ERC-20 USDT deposits ── */
  const transfer = payload.tokenTransfer;
  if (!transfer) {
    // Non-transfer event — acknowledge and exit
    console.log("[TURNKEY-WEBHOOK] Non-transfer event — acknowledged");
    return NextResponse.json({ received: true });
  }

  // Verify it's a USDT transfer (case-insensitive address comparison)
  if (transfer.contractAddress.toLowerCase() !== USDT_CONTRACT.toLowerCase()) {
    console.log(
      `[TURNKEY-WEBHOOK] Non-USDT token transfer (contract=${transfer.contractAddress}) — skipping`,
    );
    return NextResponse.json({ received: true, skipped: "non-usdt" });
  }

  const depositAddress = transfer.toAddress.toLowerCase();
  const transferredAmount = transfer.amount; // USDT 6-decimal base units as string
  const txHash = transfer.transactionHash;

  console.log(
    `[TURNKEY-WEBHOOK] USDT deposit detected: ` +
      `to=${depositAddress} amount=${transferredAmount} txHash=${txHash}`,
  );

  /* ── 5. Find the SettlementCase tied to this deposit address ── */
  const client = await getPoolClient();
  try {
    const { rows } = await client.query<{
      id: string;
      notional_cents: number;
      status: string;
      funds_confirmed_final: boolean;
    }>(
      `SELECT id, notional_cents, status, funds_confirmed_final
       FROM settlement_cases
       WHERE LOWER(turnkey_deposit_address) = $1
         AND funding_route = 'stablecoin'
       ORDER BY created_at DESC
       LIMIT 1`,
      [depositAddress],
    );

    if (rows.length === 0) {
      console.warn(
        `[TURNKEY-WEBHOOK] No settlement found for deposit address ${depositAddress}`,
      );
      return NextResponse.json(
        { received: true, skipped: "no-matching-settlement" },
        { status: 200 }, // 200 to prevent webhook retry for unknown addresses
      );
    }

    const settlement = rows[0];

    // Already funded — idempotent
    if (settlement.funds_confirmed_final) {
      console.log(
        `[TURNKEY-WEBHOOK] Settlement ${settlement.id} already funded — skipping`,
      );
      return NextResponse.json({
        received: true,
        skipped: "already-funded",
        settlementId: settlement.id,
      });
    }

    /* ── 6. Amount verification (BigInt 6-decimal math) ── */
    // Convert notionalCents (10^2) → USDT base units (10^6)
    // Formula: requiredBaseUnits = notionalCents * 10000
    const requiredBaseUnits = BigInt(settlement.notional_cents) * BigInt(10000);
    const receivedBaseUnits = BigInt(transferredAmount);

    console.log(
      `[TURNKEY-WEBHOOK] Amount check for settlement ${settlement.id}: ` +
        `required=${requiredBaseUnits.toString()} ` +
        `received=${receivedBaseUnits.toString()} ` +
        `sufficient=${receivedBaseUnits >= requiredBaseUnits}`,
    );

    if (receivedBaseUnits < requiredBaseUnits) {
      // Partial deposit — log but don't advance state
      console.warn(
        `[TURNKEY-WEBHOOK] Partial deposit for settlement ${settlement.id}: ` +
          `received ${receivedBaseUnits.toString()} of ${requiredBaseUnits.toString()} required USDT base units. ` +
          `txHash=${txHash}`,
      );

      // Record the partial deposit for reconciliation
      await client.query(
        `INSERT INTO settlement_finality
           (settlement_id, rail, external_transfer_id, idempotency_key,
            finality_status, amount_cents, leg, is_fallback, error_message)
         VALUES ($1, 'turnkey', $2, $3, 'PARTIAL', $4, 'buyer_deposit', FALSE, $5)
         ON CONFLICT DO NOTHING`,
        [
          settlement.id,
          txHash,
          `turnkey-deposit-${txHash}`,
          Number(receivedBaseUnits / BigInt(10000)), // Convert back to cents for ledger
          `Partial USDT deposit: received ${receivedBaseUnits.toString()} of ${requiredBaseUnits.toString()} base units`,
        ],
      );

      return NextResponse.json({
        received: true,
        partial: true,
        settlementId: settlement.id,
        required: requiredBaseUnits.toString(),
        received_amount: receivedBaseUnits.toString(),
      });
    }

    /* ── 7. Full funding confirmed — advance state machine ── */
    console.log(
      `[TURNKEY-WEBHOOK] Full USDT deposit confirmed for settlement ${settlement.id}. ` +
        `Advancing to CONFIRM_FUNDS_FINAL.`,
    );

    // Record finality for the inbound deposit
    await client.query(
      `INSERT INTO settlement_finality
         (settlement_id, rail, external_transfer_id, idempotency_key,
          finality_status, amount_cents, leg, is_fallback, finalized_at)
       VALUES ($1, 'turnkey', $2, $3, 'COMPLETED', $4, 'buyer_deposit', FALSE, NOW())
       ON CONFLICT DO NOTHING`,
      [
        settlement.id,
        txHash,
        `turnkey-deposit-${txHash}`,
        Number(receivedBaseUnits / BigInt(10000)),
      ],
    );

    // Apply CONFIRM_FUNDS_FINAL via the settlement engine (SYSTEM actor)
    try {
      const { apiApplySettlementAction } = await import("@/lib/api");
      await apiApplySettlementAction({
        settlementId: settlement.id,
        payload: {
          action: "CONFIRM_FUNDS_FINAL",
          actorRole: "INSTITUTION_TREASURY",
          actorUserId: "SYSTEM_TURNKEY_WEBHOOK",
          reason: `USDT deposit confirmed via Turnkey webhook. ` +
            `txHash=${txHash} amount=${receivedBaseUnits.toString()} base units. ` +
            `Deposit address: ${depositAddress}`,
        },
        now: new Date().toISOString(),
      });

      console.log(
        `[TURNKEY-WEBHOOK] ✓ Settlement ${settlement.id} funds confirmed final via USDT deposit`,
      );

      return NextResponse.json({
        received: true,
        settled: true,
        settlementId: settlement.id,
        txHash,
        amountBaseUnits: receivedBaseUnits.toString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[TURNKEY-WEBHOOK] Failed to apply CONFIRM_FUNDS_FINAL for settlement ${settlement.id}:`,
        message,
      );

      // Return 200 to prevent infinite webhook retries — log the error for manual review
      return NextResponse.json({
        received: true,
        error: "State machine transition failed",
        settlementId: settlement.id,
        detail: message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[TURNKEY-WEBHOOK] Database error:", message);

    // Return 500 so Turnkey retries the webhook
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
