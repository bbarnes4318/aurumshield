/* ================================================================
   MOOV SETTLEMENT WEBHOOK RECEIVER
   POST /api/webhooks/moov

   Receives asynchronous transfer status updates from Moov after
   a wallet-to-wallet payout is initiated via the settlement rail.

   Supported events:
     - transfer.completed → CONFIRM_FUNDS_FINAL via settlement engine
     - transfer.failed    → FAIL_SETTLEMENT via settlement engine
     - transfer.reversed  → FAIL_SETTLEMENT via settlement engine

   Security:
     - HMAC-SHA256 signature verification via MOOV_WEBHOOK_SECRET
     - Moov sends the hex digest in `X-Webhook-Signature`
     - MOOV_WEBHOOK_SECRET must be set in production
     - Graceful skip in development when not configured

   Pipeline:
     - Loads current SettlementState from the in-memory store
     - Calls applySettlementAction() with the appropriate action
     - Persists the settlement status change to PostgreSQL
       `settlement_cases.status`

   Zod:
     - Strictly typed payload schema prevents malformed data from
       reaching the settlement engine or database.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";
import { applySettlementAction } from "@/lib/settlement-engine";
import { loadSettlementState } from "@/lib/settlement-store";
import { getDbClient } from "@/lib/db";

/* ---------- HMAC Signature Verification ---------- */

/**
 * Verify a Moov webhook signature using HMAC-SHA256.
 * Moov signs the raw body and sends the hex digest in
 * `X-Webhook-Signature`.
 */
function verifyMoovSignature(
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

/* ---------- Zod Schema: Moov Webhook Payload ---------- */

/**
 * Moov webhook payloads include:
 *   - eventType:  "transfer.completed" | "transfer.failed" | "transfer.reversed"
 *   - data:       the transfer object with transferID, status, and metadata
 *
 * We embed our `settlementId` in the transfer metadata when creating
 * the transfer in moov-adapter.ts, so we can correlate back.
 */
const MoovTransferDataSchema = z.object({
  transferID: z.string().min(1, "transferID is required"),
  status: z.string().min(1, "status is required"),
  metadata: z
    .object({
      settlementId: z.string().min(1, "settlementId is required in metadata"),
    })
    .passthrough(),
});

const MoovWebhookPayloadSchema = z.object({
  eventType: z.enum([
    "transfer.completed",
    "transfer.failed",
    "transfer.reversed",
  ]),
  data: MoovTransferDataSchema,
});

type MoovWebhookPayload = z.infer<typeof MoovWebhookPayloadSchema>;

/* ---------- Event → Engine Action Mapping ---------- */

/**
 * Map Moov transfer events to settlement engine actions.
 *
 * transfer.completed → CONFIRM_FUNDS_FINAL
 *   The payout has landed in the seller's wallet. This confirms
 *   funds are final, enabling the AUTHORIZE → DvP flow.
 *
 * transfer.failed / transfer.reversed → FAIL_SETTLEMENT
 *   The payout did not succeed — mark the settlement as failed so
 *   operations can investigate and retry or cancel.
 */
const EVENT_ACTION_MAP: Record<
  string,
  { action: "CONFIRM_FUNDS_FINAL" | "FAIL_SETTLEMENT"; reason?: string }
> = {
  "transfer.completed": { action: "CONFIRM_FUNDS_FINAL" },
  "transfer.failed": {
    action: "FAIL_SETTLEMENT",
    reason: "Moov transfer failed",
  },
  "transfer.reversed": {
    action: "FAIL_SETTLEMENT",
    reason: "Moov transfer reversed",
  },
};

/* ---------- DB Status Mapping ---------- */

/**
 * Map settlement engine status to the PostgreSQL
 * settlement_status_enum values from our migration.
 */
const ENGINE_TO_DB_STATUS: Record<string, string> = {
  ESCROW_OPEN: "ESCROW_OPEN",
  AWAITING_FUNDS: "AWAITING_FUNDS",
  READY_TO_SETTLE: "READY_TO_SETTLE",
  FUNDS_CONFIRMED: "READY_TO_SETTLE",
  AUTHORIZED: "READY_TO_SETTLE",
  SETTLED: "SETTLED",
  FAILED: "CANCELLED",
  CANCELLED: "CANCELLED",
};

/* ---------- Webhook Actor Identity ---------- */

const WEBHOOK_ACTOR = {
  actorRole: "admin" as const,
  actorUserId: "moov-webhook-system",
};

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signature = request.headers.get("X-Webhook-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.MOOV_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!verifyMoovSignature(rawBody, signature, webhookSecret)) {
      console.warn("[MOOV-WEBHOOK] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[MOOV-WEBHOOK] MOOV_WEBHOOK_SECRET not set — signature verification skipped (development mode)",
      );
    } else {
      console.error(
        "[MOOV-WEBHOOK] MOOV_WEBHOOK_SECRET not configured in non-development environment",
      );
      return NextResponse.json(
        { error: "Webhook endpoint is not configured" },
        { status: 500 },
      );
    }
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

  const validation = MoovWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[MOOV-WEBHOOK] Payload validation failed:",
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

  const payload: MoovWebhookPayload = validation.data;
  const { eventType, data } = payload;
  const { settlementId, } = data.metadata;
  const transferId = data.transferID;

  const mapping = EVENT_ACTION_MAP[eventType];
  if (!mapping) {
    return NextResponse.json({
      received: true,
      action: "ignored",
      reason: `Unhandled event: ${eventType}`,
    });
  }

  console.log(
    `[MOOV-WEBHOOK] Processing ${eventType} (transferId=${transferId}) for settlement ${settlementId}`,
  );

  /* ── Step 4: Load settlement state + apply engine action ── */
  const currentState = loadSettlementState();

  const settlement = currentState.settlements.find(
    (s) => s.id === settlementId,
  );
  if (!settlement) {
    console.warn(`[MOOV-WEBHOOK] Settlement ${settlementId} not found`);
    return NextResponse.json(
      { error: "Settlement not found", settlementId },
      { status: 404 },
    );
  }

  // Idempotency: skip if funds already confirmed for CONFIRM_FUNDS_FINAL
  if (
    mapping.action === "CONFIRM_FUNDS_FINAL" &&
    settlement.fundsConfirmedFinal
  ) {
    console.log(
      `[MOOV-WEBHOOK] Settlement ${settlementId} already has fundsConfirmedFinal=true — idempotent skip`,
    );
    return NextResponse.json({
      received: true,
      action: "skipped",
      reason: "funds already confirmed",
      settlementId,
    });
  }

  const now = new Date().toISOString();
  const result = applySettlementAction(
    currentState,
    settlementId,
    {
      action: mapping.action,
      actorRole: WEBHOOK_ACTOR.actorRole,
      actorUserId: WEBHOOK_ACTOR.actorUserId,
      reason: mapping.reason,
    },
    now,
  );

  if (!result.ok) {
    console.error(
      `[MOOV-WEBHOOK] Engine rejected ${mapping.action} for ${settlementId}: ${result.code} — ${result.message}`,
    );
    // Return 200 so Moov doesn't retry on business-logic errors
    return NextResponse.json({
      received: true,
      action: "rejected",
      code: result.code,
      message: result.message,
      settlementId,
    });
  }

  /* ── Step 5: Persist settlement status to PostgreSQL ── */
  const engineStatus = result.settlement.status;
  const dbStatus = ENGINE_TO_DB_STATUS[engineStatus] ?? engineStatus;

  let client;
  try {
    client = await getDbClient();

    await client.query(
      "UPDATE settlement_cases SET status = $1 WHERE id = $2",
      [dbStatus, settlementId],
    );

    console.log(
      `[MOOV-WEBHOOK] Persisted settlement ${settlementId} status → ${dbStatus} (engine: ${engineStatus})`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[MOOV-WEBHOOK] Database error for settlement ${settlementId}:`,
      message,
    );
    // Engine action succeeded but DB write failed — log for manual reconciliation
    // Still return 200 so Moov doesn't retry (engine state is already updated)
    return NextResponse.json({
      received: true,
      action: "partial",
      engineStatus,
      dbError: "Database write failed — manual reconciliation required",
      settlementId,
    });
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  /* ── Step 6: Respond ── */
  console.log(
    `[MOOV-WEBHOOK] ${mapping.action} applied successfully for settlement ${settlementId}`,
  );

  return NextResponse.json({
    received: true,
    action: mapping.action === "CONFIRM_FUNDS_FINAL" ? "confirmed" : "failed",
    settlementId,
    transferId,
    engineStatus,
    ledgerEntriesCreated: result.ledgerEntries.length,
  });
}
