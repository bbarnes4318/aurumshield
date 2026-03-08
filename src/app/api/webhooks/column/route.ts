/* ================================================================
   COLUMN BANK WEBHOOK INGESTION ROUTE
   POST /api/webhooks/column

   Receives webhook events from Column Bank, verifies the HMAC
   signature, extracts the amount and virtual_account_id, and
   acknowledges with 200 OK.

   Architectural rules:
   1. Never mutate state directly — database is source of truth
   2. Actor attribution: actorRole "system", actorUserId "column-webhook"
   3. Reject any request that fails signature validation with 401
   4. All database writes reference 005_dvp_escrow.sql schema

   Database integration points (005_dvp_escrow.sql):
   ┌─────────────────────────┬──────────────────────────────────────────┐
   │ Table                   │ Purpose                                  │
   ├─────────────────────────┼──────────────────────────────────────────┤
   │ escrow_holds            │ Match virtual_account_id → settlement,   │
   │                         │ verify hold_amount_cents, flip           │
   │                         │ is_released on DVP execution             │
   │ dvp_events              │ Append FUNDS_HELD / DVP_EXECUTED event   │
   │ settlement_finality     │ Record external transfer reconciliation  │
   │ payouts                 │ Idempotency dedup via idempotency_key    │
   └─────────────────────────┴──────────────────────────────────────────┘
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";

/* ---------- Environment ---------- */

const ENV_WEBHOOK_SECRET = "COLUMN_WEBHOOK_SECRET";

/* ---------- Webhook Actor Identity ---------- */

const WEBHOOK_ACTOR = {
  actorRole: "system",
  actorUserId: "column-webhook",
} as const;

/* ---------- Zod Schema: Column Webhook Payload ---------- */

/**
 * Column sends a flat event payload. We validate:
 * - id: unique event ID (used for idempotency)
 * - type: event discriminator
 * - data: contains virtual_account_id, amount, currency, transfer_id, status
 * - created_at: ISO 8601 timestamp
 */
const ColumnWebhookDataSchema = z.object({
  virtual_account_id: z.string().min(1, "virtual_account_id is required"),
  amount: z.number().int().min(0, "amount must be a non-negative integer (cents)"),
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

/* ---------- Relevant Event Types ---------- */

/**
 * Events that indicate funds have arrived or a payout has completed.
 * Only these events trigger downstream settlement state mutations.
 */
const ACTIONABLE_EVENTS: ReadonlySet<string> = new Set([
  "transfer.incoming.completed",
  "transfer.outgoing.completed",
  "virtual_account.credited",
]);

/* ---------- Signature Verification ---------- */

/**
 * Verify a Column Bank webhook signature using HMAC-SHA256.
 *
 * Column signs the raw request body with HMAC-SHA256 using the
 * webhook secret and sends the hex-encoded digest in the
 * `Column-Signature` header.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 * Mirrors the pattern in @/lib/webhook-verify.ts (Modern Treasury).
 */
function verifyColumnSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !signature || !secret) return false;

  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signature = request.headers.get("Column-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env[ENV_WEBHOOK_SECRET];
  if (!webhookSecret) {
    console.error("[COLUMN-WEBHOOK] COLUMN_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook endpoint is not configured" },
      { status: 500 },
    );
  }

  if (!verifyColumnSignature(rawBody, signature, webhookSecret)) {
    console.warn("[COLUMN-WEBHOOK] Signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  /* ── Step 3: Parse + validate payload ── */
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 },
    );
  }

  const validation = ColumnWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[COLUMN-WEBHOOK] Payload validation failed:",
      validation.error.issues,
    );
    return NextResponse.json(
      {
        error: "Invalid webhook payload",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const payload: ColumnWebhookPayload = validation.data;
  const { id: eventId, type: eventType, data } = payload;
  const { virtual_account_id, amount, transfer_id, status } = data;

  console.log(
    `[COLUMN-WEBHOOK] Received event: ${eventType} | ` +
      `event_id=${eventId} virtual_account=${virtual_account_id} ` +
      `amount=${amount} transfer=${transfer_id} status=${status}`,
  );

  /* ── Step 4: Filter — only act on actionable events ── */
  if (!ACTIONABLE_EVENTS.has(eventType)) {
    console.log(
      `[COLUMN-WEBHOOK] Ignoring non-actionable event: ${eventType} (event_id=${eventId})`,
    );
    return NextResponse.json({
      received: true,
      action: "ignored",
      reason: "non-actionable event type",
      eventId,
    });
  }

  /* ── Step 5: Extract settlement context ── */
  //
  // The virtual_account_id maps to a specific settlement via
  // `escrow_holds.external_hold_id` (see 005_dvp_escrow.sql, line 74).
  //
  // In production, this step will:
  //   SELECT settlement_id, hold_amount_cents, is_released
  //   FROM escrow_holds
  //   WHERE external_hold_id = $1
  //   FOR UPDATE
  //
  // This SELECT FOR UPDATE locks the escrow_holds row to prevent
  // concurrent webhook deliveries from double-processing.
  //
  const settlementId = data.metadata?.settlementId ?? null;

  console.log(
    `[COLUMN-WEBHOOK] Processing ${eventType} for ` +
      `virtual_account=${virtual_account_id} ` +
      `settlement=${settlementId ?? "UNKNOWN"} ` +
      `amount_cents=${amount} ` +
      `actor=${WEBHOOK_ACTOR.actorUserId}`,
  );

  /* ── Step 6: Settlement state mutation (database integration points) ── */
  //
  // === 005_dvp_escrow.sql Integration Map ===
  //
  // 6a. ESCROW_HOLDS (lines 67-81):
  //   For "transfer.incoming.completed" / "virtual_account.credited":
  //     UPDATE escrow_holds
  //     SET is_released = FALSE, hold_amount_cents = $amount
  //     WHERE external_hold_id = $virtual_account_id
  //   This confirms the buyer's inbound Fedwire has landed in our FBO.
  //   State machine: AWAITING_FUNDS → FUNDS_HELD
  //
  // 6b. DVP_EVENTS (lines 92-103):
  //   INSERT INTO dvp_events (settlement_id, event_type, previous_state,
  //     actor_user_id, actor_role, detail, metadata)
  //   VALUES ($settlementId, 'FUNDS_HELD', 'RESERVED',
  //     'column-webhook', 'system',
  //     'Column inbound wire confirmed', $webhookPayload)
  //   This creates the append-only audit record for the state transition.
  //
  // 6c. SETTLEMENT_FINALITY (lines 116-132):
  //   INSERT INTO settlement_finality
  //     (settlement_id, rail, external_transfer_id, idempotency_key,
  //      finality_status, amount_cents, leg, is_fallback)
  //   VALUES ($settlementId, 'column', $transfer_id, $eventId,
  //     CASE WHEN $status = 'completed' THEN 'COMPLETED'
  //          WHEN $status = 'failed' THEN 'FAILED'
  //          ELSE 'REQUIRES_REVIEW' END,
  //     $amount, 'seller_payout', FALSE)
  //   This records the external transfer reconciliation for audit.
  //
  // 6d. PAYOUTS (lines 146-162):
  //   The event ID ($eventId) serves as the idempotency_key for dedup:
  //   SELECT 1 FROM payouts WHERE idempotency_key = $eventId
  //   If a prior row exists, we skip processing (idempotent replay).
  //
  // TODO: Wire these database queries when PostgreSQL pool is connected
  //       to this route. Each query runs inside a single BEGIN/COMMIT
  //       transaction to guarantee atomicity.
  //

  /* ── Step 7: Acknowledge receipt ── */
  //
  // Column expects a 200 OK to confirm delivery. Non-200 responses
  // trigger automatic retries with exponential backoff.
  //
  console.log(
    `[COLUMN-WEBHOOK] Event ${eventId} acknowledged ` +
      `(type=${eventType}, status=${status}, amount=${amount})`,
  );

  return NextResponse.json({
    received: true,
    action: status === "completed" ? "processed" : "flagged",
    eventId,
    virtualAccountId: virtual_account_id,
    transferId: transfer_id,
    amountCents: amount,
    settlementId: settlementId ?? "pending_lookup",
  });
}
