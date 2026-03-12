/* ================================================================
   COLUMN BANK FEDWIRE SETTLEMENT LISTENER
   POST /api/webhooks/column
   ================================================================
   Receives inbound wire transfer completion events from Column,
   verifies HMAC-SHA256 signature, matches funds to a pending
   escrow order, and atomically transitions the settlement state.

   Security:
     - HMAC-SHA256 via Column-Signature header
     - Timing-safe comparison (constant-time)
     - Fail-closed: missing secret → 500, bad sig → 401

   Atomic Transaction:
     - BEGIN → idempotency guard → escrow match → amount validation
       → state transition → DVP event → settlement finality → COMMIT
     - Full ROLLBACK on any failure

   Idempotency:
     - settlement_finality.idempotency_key UNIQUE on transfer_id
     - Duplicate transfer_ids acknowledged (200) but skipped

   Financial Validation:
     - Exact match → FUNDS_HELD (ready for release)
     - Discrepancy → FUNDS_RECEIVED_DISCREPANCY_HOLD (treasury review)

   Response:
     - 200 on commit
     - 401 on signature failure
     - 500 on DB failure (Column retries)
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";
import { getPoolClient } from "@/lib/db";

/* ================================================================
   HMAC-SHA256 SIGNATURE VERIFICATION
   ================================================================ */

function verifyColumnSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !signature || !secret) return false;

  try {
    const computed = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "utf-8");
    const computedBuffer = Buffer.from(computed, "utf-8");

    if (sigBuffer.length !== computedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/* ================================================================
   ZOD SCHEMA — Column Webhook Payload
   ================================================================ */

const ColumnWebhookDataSchema = z.object({
  virtual_account_id: z.string().min(1, "virtual_account_id is required"),
  amount: z.number().int().min(0, "amount must be non-negative (cents)"),
  currency: z.literal("USD"),
  transfer_id: z.string().min(1, "transfer_id is required"),
  status: z.enum(["completed", "failed", "reversed"]),
  metadata: z.record(z.string(), z.string()).optional(),
});

const ColumnWebhookPayloadSchema = z.object({
  id: z.string().min(1, "event id is required"),
  type: z.enum([
    "transfer.incoming.completed",
    "transfer.outgoing.completed",
    "transfer.outgoing.failed",
    "virtual_account.credited",
  ]),
  data: ColumnWebhookDataSchema,
  created_at: z.string().min(1, "created_at is required"),
});

type ColumnWebhookPayload = z.infer<typeof ColumnWebhookPayloadSchema>;

/* ================================================================
   SETTLEMENT STATE CONSTANTS
   ================================================================ */

const INBOUND_FUNDS_EVENTS: ReadonlySet<string> = new Set([
  "transfer.incoming.completed",
  "virtual_account.credited",
]);

const WEBHOOK_ACTOR = {
  actorRole: "system",
  actorUserId: "column-webhook",
} as const;

/* ================================================================
   POST HANDLER
   ================================================================ */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── 1. Read Raw Body & Signature ── */
  const rawBody = await request.text();
  const signature =
    request.headers.get("Column-Signature") ??
    request.headers.get("column-signature") ??
    "";

  /* ── 2. Cryptographic Verification (fail-closed) ── */
  const webhookSecret = process.env.COLUMN_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[COLUMN-WEBHOOK] CRITICAL: COLUMN_WEBHOOK_SECRET is not configured. " +
        "Cannot verify webhook origin. Rejecting all payloads.",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!verifyColumnSignature(rawBody, signature, webhookSecret)) {
    console.warn(
      "[COLUMN-WEBHOOK] ⚠ SECURITY ALERT — HMAC signature verification FAILED. " +
        `IP: ${request.headers.get("x-forwarded-for") ?? "unknown"}, ` +
        `UA: ${request.headers.get("user-agent") ?? "unknown"}`,
    );
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  /* ── 3. Parse & Validate Payload ── */
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.warn("[COLUMN-WEBHOOK] Malformed JSON body — rejected.");
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const validation = ColumnWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[COLUMN-WEBHOOK] Payload schema validation failed:",
      validation.error.issues,
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const payload: ColumnWebhookPayload = validation.data;
  const { id: eventId, type: eventType, data } = payload;
  const { virtual_account_id, amount: amountCents, transfer_id, status } = data;

  console.log(
    `[COLUMN-WEBHOOK] Received: type=${eventType} event_id=${eventId} ` +
      `transfer=${transfer_id} account=${virtual_account_id} ` +
      `amount_cents=${amountCents} status=${status}`,
  );

  /* ── 4. Filter Non-Actionable Events ── */
  if (!INBOUND_FUNDS_EVENTS.has(eventType)) {
    console.info(
      `[COLUMN-WEBHOOK] Non-settlement event type: ${eventType} — acknowledged, no action.`,
    );
    return NextResponse.json({
      success: true,
      action: "ignored",
      reason: "non-settlement event type",
      eventId,
    });
  }

  if (status !== "completed") {
    console.info(
      `[COLUMN-WEBHOOK] Transfer status="${status}" (not completed) — acknowledged, no action.`,
    );
    return NextResponse.json({
      success: true,
      action: "ignored",
      reason: `transfer status: ${status}`,
      eventId,
    });
  }

  /* ── 5. Atomic Database Transaction ── */
  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    /* ── 5a. Idempotency Guard ──
       settlement_finality.idempotency_key is UNIQUE.
       If transfer_id already exists, this is a duplicate delivery. */
    const { rows: dupeCheck } = await client.query<{ id: string }>(
      `SELECT id FROM settlement_finality
       WHERE idempotency_key = $1`,
      [transfer_id],
    );

    if (dupeCheck.length > 0) {
      await client.query("COMMIT");
      console.info(
        `[COLUMN-WEBHOOK] Duplicate transfer_id=${transfer_id} — idempotent skip.`,
      );
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "already_processed",
        transferId: transfer_id,
      });
    }

    /* ── 5b. Order Matching ──
       Find the escrow hold where the external_hold_id (Column virtual
       account) matches AND the parent settlement is AWAITING_FUNDS.
       Lock the row with FOR UPDATE to prevent concurrent processing. */
    const { rows: escrowRows } = await client.query<{
      id: string;
      settlement_id: string;
      hold_amount_cents: string; // BIGINT returns as string in pg
      buyer_id: string;
    }>(
      `SELECT eh.id, eh.settlement_id, eh.hold_amount_cents, eh.buyer_id
       FROM escrow_holds eh
       JOIN settlement_cases sc ON sc.id = eh.settlement_id
       WHERE eh.external_hold_id = $1
         AND sc.status = 'AWAITING_FUNDS'
         AND eh.is_released = FALSE
       FOR UPDATE OF eh, sc`,
      [virtual_account_id],
    );

    if (escrowRows.length === 0) {
      /* No matching pending order — record the finality anyway for
         treasury reconciliation, then commit and return 200 so
         Column doesn't retry infinitely. */
      await client.query(
        `INSERT INTO settlement_finality
           (settlement_id, rail, external_transfer_id, idempotency_key,
            finality_status, amount_cents, leg, is_fallback, error_message)
         VALUES ('UNMATCHED', 'column', $1, $2, 'REQUIRES_REVIEW', $3,
                 'inbound_wire', FALSE, 'No matching AWAITING_FUNDS escrow found')`,
        [transfer_id, transfer_id, amountCents],
      );
      await client.query("COMMIT");

      console.warn(
        `[COLUMN-WEBHOOK] No matching escrow for virtual_account=${virtual_account_id} — ` +
          "logged for treasury review.",
      );
      return NextResponse.json({
        success: true,
        action: "unmatched",
        reason: "no_pending_escrow",
        virtualAccountId: virtual_account_id,
        transferId: transfer_id,
      });
    }

    const escrow = escrowRows[0];
    const expectedAmountCents = BigInt(escrow.hold_amount_cents);
    const receivedAmountCents = BigInt(amountCents);

    /* ── 5c. Financial Validation ── */
    let newSettlementStatus: string;
    let dvpEventType: string;
    let finalityStatus: string;
    let dvpDetail: string;

    if (receivedAmountCents === expectedAmountCents) {
      // Exact match — clear for release
      newSettlementStatus = "FUNDS_HELD";
      dvpEventType = "FUNDS_HELD";
      finalityStatus = "COMPLETED";
      dvpDetail = `Fedwire received: $${(Number(receivedAmountCents) / 100).toFixed(2)} — exact match. Ready for DvP.`;
    } else {
      // Discrepancy — hold for treasury review
      newSettlementStatus = "AWAITING_FUNDS"; // Keep in AWAITING state
      dvpEventType = "FAILED";
      finalityStatus = "REQUIRES_REVIEW";
      dvpDetail =
        `FUNDS_RECEIVED_DISCREPANCY_HOLD: Expected $${(Number(expectedAmountCents) / 100).toFixed(2)}, ` +
        `received $${(Number(receivedAmountCents) / 100).toFixed(2)}. ` +
        `Delta: $${(Number(receivedAmountCents - expectedAmountCents) / 100).toFixed(2)}. Flagged for manual treasury review.`;

      console.warn(
        `[COLUMN-WEBHOOK] ⚠ AMOUNT DISCREPANCY on settlement=${escrow.settlement_id}: ` +
          `expected=${expectedAmountCents} received=${receivedAmountCents}`,
      );
    }

    /* ── 5d. State Transition — settlement_cases ── */
    await client.query(
      `UPDATE settlement_cases SET status = $1 WHERE id = $2`,
      [newSettlementStatus, escrow.settlement_id],
    );

    /* ── 5e. Escrow Hold Update (mark amount confirmed) ── */
    if (receivedAmountCents === expectedAmountCents) {
      await client.query(
        `UPDATE escrow_holds
         SET hold_amount_cents = $1, updated_at = NOW()
         WHERE id = $2`,
        [amountCents, escrow.id],
      );
    }

    /* ── 5f. DVP Event (append-only audit) ── */
    await client.query(
      `INSERT INTO dvp_events
         (settlement_id, event_type, previous_state,
          actor_user_id, actor_role, detail, metadata)
       VALUES ($1, $2, 'RESERVED', $3, $4, $5, $6)`,
      [
        escrow.settlement_id,
        dvpEventType,
        WEBHOOK_ACTOR.actorUserId,
        WEBHOOK_ACTOR.actorRole,
        dvpDetail,
        JSON.stringify({
          column_event_id: eventId,
          transfer_id,
          virtual_account_id,
          amount_cents: amountCents,
          expected_amount_cents: Number(expectedAmountCents),
          match: receivedAmountCents === expectedAmountCents,
        }),
      ],
    );

    /* ── 5g. Settlement Finality Record ── */
    await client.query(
      `INSERT INTO settlement_finality
         (settlement_id, rail, external_transfer_id, idempotency_key,
          finality_status, amount_cents, leg, is_fallback, finalized_at)
       VALUES ($1, 'column', $2, $3, $4, $5, 'inbound_wire', FALSE, NOW())`,
      [
        escrow.settlement_id,
        transfer_id,
        transfer_id, // idempotency_key = transfer_id
        finalityStatus,
        amountCents,
      ],
    );

    /* ── 5h. COMMIT ── */
    await client.query("COMMIT");

    console.info(
      `[COLUMN-WEBHOOK] COMMITTED: settlement=${escrow.settlement_id} ` +
        `status→${newSettlementStatus} finality=${finalityStatus} ` +
        `amount_cents=${amountCents} transfer=${transfer_id}`,
    );

    return NextResponse.json({
      success: true,
      action: receivedAmountCents === expectedAmountCents ? "funds_cleared" : "discrepancy_hold",
      settlementId: escrow.settlement_id,
      transferId: transfer_id,
      amountCents,
      expectedAmountCents: Number(expectedAmountCents),
      newStatus: newSettlementStatus,
      finalityStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[COLUMN-WEBHOOK] Transaction FAILED for transfer=${transfer_id}:`,
      message,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
