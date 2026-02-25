/* ================================================================
   MODERN TREASURY WEBHOOK INGESTION ROUTE
   POST /api/webhooks/banking

   Receives webhook events from Modern Treasury, verifies the HMAC
   signature, and triggers the settlement engine's CONFIRM_FUNDS_FINAL
   action when a payment completes.

   Architectural rules:
   1. Never mutate state directly — load → apply → persist (via adapter)
   2. Actor attribution: actorRole "admin", actorUserId "mt-webhook-system"
   3. Reject any request that fails signature validation with 401
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { verifyModernTreasurySignature } from "@/lib/webhook-verify";
import { applySettlementAction } from "@/lib/settlement-engine";
import type { SettlementState } from "@/lib/settlement-engine";
import type { SettlementCase, LedgerEntry } from "@/lib/mock-data";
import { loadSettlementState, saveSettlementState } from "@/lib/settlement-store";
import { getDbClient } from "@/lib/db";
import { recordSettlementFinality, updatePayoutStatus } from "@/lib/settlement-rail";

/* ---------- Zod Schema: Modern Treasury Webhook Payload ---------- */

/**
 * Modern Treasury sends nested payloads. We only care about:
 * - event type: "expected_payment.updated" | "payment_order.completed"
 * - metadata.settlementId: the AurumShield settlement ID we embedded
 *   when creating the expected payment / payment order in MT.
 * - status: for filtering only completed events
 */
const MTWebhookMetadataSchema = z.object({
  settlementId: z.string().min(1, "settlementId is required in metadata"),
  idempotencyKey: z.string().optional(),
  leg: z.string().optional(),
});

const MTWebhookDataSchema = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: MTWebhookMetadataSchema,
});

const MTWebhookPayloadSchema = z.object({
  event: z.enum(["expected_payment.updated", "payment_order.completed"]),
  data: MTWebhookDataSchema,
});

type MTWebhookPayload = z.infer<typeof MTWebhookPayloadSchema>;

/* ---------- Completed Status Sets ---------- */

/** Modern Treasury statuses that indicate funds have actually landed. */
const COMPLETED_STATUSES: Record<string, ReadonlySet<string>> = {
  "expected_payment.updated": new Set(["reconciled"]),
  "payment_order.completed": new Set(["completed"]),
};

/* ---------- Webhook Actor Identity ---------- */

const WEBHOOK_ACTOR = {
  action: "CONFIRM_FUNDS_FINAL",
  actorRole: "admin",
  actorUserId: "mt-webhook-system",
} as const;

/**
 * Persist settlement status + ledger entries to PostgreSQL.
 * Writes the engine's updated settlement status and appends new ledger entries.
 * Fail-open: errors are logged but do not block the webhook response.
 */
async function persistWebhookUpdateToDatabase(
  settlementId: string,
  engineResult: {
    ok: true;
    state: SettlementState;
    settlement: SettlementCase;
    ledgerEntries: LedgerEntry[];
  },
): Promise<void> {
  let client;
  try {
    client = await getDbClient();

    // Update settlement status
    await client.query(
      "UPDATE settlement_cases SET status = $1 WHERE id = $2",
      [engineResult.settlement.status, settlementId],
    );

    // Append ledger entries
    for (const entry of engineResult.ledgerEntries) {
      await client.query(
        `INSERT INTO ledger_entries (id, settlement_id, type, timestamp, actor, actor_role, actor_user_id, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          entry.id,
          entry.settlementId,
          entry.type,
          entry.timestamp,
          entry.actor,
          entry.actorRole ?? null,
          entry.actorUserId ?? null,
          entry.detail,
        ],
      );
    }

    console.log(
      `[MT-WEBHOOK] Persisted settlement ${settlementId} status → ${engineResult.settlement.status} (${engineResult.ledgerEntries.length} ledger entries)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[MT-WEBHOOK] Database persistence error for ${settlementId}:`,
      message,
    );
    // Fail-open: settlement engine state was updated in-memory already
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.MODERN_TREASURY_WEBHOOK_KEY;
  if (!webhookSecret) {
    console.error("[MT-WEBHOOK] MODERN_TREASURY_WEBHOOK_KEY is not configured");
    return NextResponse.json(
      { error: "Webhook endpoint is not configured" },
      { status: 500 },
    );
  }

  if (!verifyModernTreasurySignature(rawBody, signature, webhookSecret)) {
    console.warn("[MT-WEBHOOK] Signature verification failed");
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

  const validation = MTWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn("[MT-WEBHOOK] Payload validation failed:", validation.error.issues);
    return NextResponse.json(
      {
        error: "Invalid webhook payload",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const payload: MTWebhookPayload = validation.data;
  const { event, data } = payload;
  const { settlementId } = data.metadata;

  /* ── Step 3b: Filter — only act on completed/reconciled statuses ── */
  const completedSet = COMPLETED_STATUSES[event];
  if (!completedSet || !completedSet.has(data.status)) {
    // Legitimate event but not a completion — acknowledge without action
    console.log(
      `[MT-WEBHOOK] Ignoring ${event} with status="${data.status}" for settlement ${settlementId}`,
    );
    return NextResponse.json({ received: true, action: "ignored", reason: "non-terminal status" });
  }

  console.log(
    `[MT-WEBHOOK] Processing ${event} (status=${data.status}) for settlement ${settlementId}`,
  );

  /* ── Step 4: Load settlement state ── */
  const currentState = loadSettlementState();

  /* ── Step 4b: Find the settlement ── */
  const settlement = currentState.settlements.find((s) => s.id === settlementId);
  if (!settlement) {
    console.warn(`[MT-WEBHOOK] Settlement ${settlementId} not found`);
    return NextResponse.json(
      { error: "Settlement not found", settlementId },
      { status: 404 },
    );
  }

  /* ── Step 4c: Idempotency check ── */
  if (settlement.fundsConfirmedFinal) {
    console.log(
      `[MT-WEBHOOK] Settlement ${settlementId} already has fundsConfirmedFinal=true — idempotent skip`,
    );
    return NextResponse.json({
      received: true,
      action: "skipped",
      reason: "funds already confirmed",
      settlementId,
    });
  }

  /* ── Step 5: Trigger the settlement engine ── */
  const now = new Date().toISOString();
  const result = applySettlementAction(
    currentState,
    settlementId,
    {
      action: WEBHOOK_ACTOR.action,
      actorRole: WEBHOOK_ACTOR.actorRole,
      actorUserId: WEBHOOK_ACTOR.actorUserId,
    },
    now,
  );

  if (!result.ok) {
    console.error(
      `[MT-WEBHOOK] Engine rejected CONFIRM_FUNDS_FINAL for ${settlementId}: ${result.code} — ${result.message}`,
    );
    // Return 200 to MT so it doesn't retry on business-logic errors
    // (e.g. ACTIVATION_REQUIRED, TERMINAL_STATE). These are not transient.
    return NextResponse.json({
      received: true,
      action: "rejected",
      code: result.code,
      message: result.message,
      settlementId,
    });
  }

  /* ── Step 6: Persist to PostgreSQL ── */
  await persistWebhookUpdateToDatabase(settlementId, result);

  /* ── Step 6b: Persist in-memory settlement state ── */
  saveSettlementState(result.state);

  /* ── Step 6c: Record settlement finality + update payout status ── */
  const idemKey = data.metadata.idempotencyKey ?? `mt:${data.id}`;
  const finalityStatus: "COMPLETED" | "FAILED" = completedSet.has(data.status)
    ? "COMPLETED"
    : "FAILED";

  recordSettlementFinality({
    settlementId,
    rail: "modern_treasury",
    externalTransferId: data.id,
    idempotencyKey: idemKey,
    finalityStatus,
    amountCents: data.amount ?? 0,
    leg: (data.metadata.leg as "seller_payout" | "fee_sweep") ?? "seller_payout",
    isFallback: false,
  }).catch((err) => {
    console.error(`[MT-WEBHOOK] Failed to record settlement finality:`, err);
  });

  updatePayoutStatus({
    idempotencyKey: idemKey,
    status: finalityStatus,
    externalId: data.id,
  }).catch((err) => {
    console.error(`[MT-WEBHOOK] Failed to update payout status:`, err);
  });

  console.log(
    `[MT-WEBHOOK] CONFIRM_FUNDS_FINAL applied successfully for settlement ${settlementId}`,
  );

  return NextResponse.json({
    received: true,
    action: "confirmed",
    settlementId,
    ledgerEntriesCreated: result.ledgerEntries.length,
  });
}
