/* ================================================================
   MOOV SETTLEMENT WEBHOOK RECEIVER
   POST /api/webhooks/moov

   RSK-013: Idempotent Webhook Ledger Transactions

   Receives asynchronous transfer status updates from Moov after
   a wallet-to-wallet payout is initiated via the settlement rail.

   Security invariant:
     External webhooks execute state transitions against a
     LOCKED PostgreSQL row (SELECT ... FOR UPDATE) inside a
     single transaction to prevent split-brain corruption from
     concurrent webhook retries across multiple nodes.

   Supported events:
     - transfer.completed → SETTLED
     - transfer.failed    → CANCELLED
     - transfer.reversed  → CANCELLED

   Idempotency:
     If the row is already SETTLED or CANCELLED when locked,
     the webhook is acknowledged (200 OK) without mutation.

   Pipeline (post-COMMIT only):
     - recordSettlementFinality / updatePayoutStatus
     - issueCertificate (if SETTLED)
     - notifyPartiesOfSettlement (if SETTLED)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";
import { getDbClient } from "@/lib/db";
import { issueCertificate } from "@/lib/certificate-engine";
import { recordSettlementFinality, updatePayoutStatus } from "@/lib/settlement-rail";
import { notifyPartiesOfSettlement } from "@/actions/notifications";
import { mockOrders, mockListings, mockUsers } from "@/lib/mock-data";
import type { SettlementCase, LedgerEntry } from "@/lib/mock-data";


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
  amount: z.object({
    value: z.number(),
    currency: z.string(),
  }).optional(),
  metadata: z
    .object({
      settlementId: z.string().min(1, "settlementId is required in metadata"),
      idempotencyKey: z.string().optional(),
      leg: z.string().optional(),
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

/* ---------- Event → Terminal Status Mapping ---------- */

/**
 * Map Moov transfer events to terminal settlement statuses.
 *
 * transfer.completed → SETTLED
 *   The payout has landed in the seller's wallet. Settlement is final.
 *
 * transfer.failed / transfer.reversed → CANCELLED
 *   The payout did not succeed — mark the settlement as cancelled so
 *   operations can investigate and retry or cancel.
 */
const EVENT_TO_STATUS: Record<
  string,
  { dbStatus: "SETTLED" | "CANCELLED"; reason?: string }
> = {
  "transfer.completed": { dbStatus: "SETTLED" },
  "transfer.failed": {
    dbStatus: "CANCELLED",
    reason: "Moov transfer failed",
  },
  "transfer.reversed": {
    dbStatus: "CANCELLED",
    reason: "Moov transfer reversed",
  },
};

/* ---------- Terminal statuses (idempotency guard) ---------- */

const TERMINAL_STATUSES = new Set(["SETTLED", "CANCELLED"]);

/* ---------- Webhook Actor Identity ---------- */

const WEBHOOK_ACTOR_ID = "moov-webhook-system";

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
  const { settlementId } = data.metadata;
  const transferId = data.transferID;

  const mapping = EVENT_TO_STATUS[eventType];
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

  /* ── Step 4: Transactional settlement update (RSK-013) ──
       BEGIN
       → SELECT ... FOR UPDATE (lock the row)
       → Idempotency guard (already terminal → 200 OK)
       → INSERT ledger journal + entries
       → UPDATE settlement_cases.status
       COMMIT
       → Post-commit side effects (certificate, email)
     ── */

  const client = await getDbClient();
  let committedStatus: string | null = null;
  let previousStatus: string | null = null;
  let settlementRow: {
    id: string;
    order_id: string;
    listing_id: string;
    buyer_id: string;
    weight_oz: number;
    total_notional: number;
    status: string;
  } | null = null;

  try {
    await client.query("BEGIN");

    // ── Lock the settlement row ──
    const lockResult = await client.query(
      `SELECT id, order_id, listing_id, buyer_id, weight_oz, total_notional, status
       FROM settlement_cases
       WHERE id = $1
       FOR UPDATE`,
      [settlementId],
    );

    if (lockResult.rows.length === 0) {
      await client.query("COMMIT");
      console.warn(`[MOOV-WEBHOOK] Settlement ${settlementId} not found`);
      return NextResponse.json(
        { error: "Settlement not found", settlementId },
        { status: 404 },
      );
    }

    settlementRow = lockResult.rows[0];
    previousStatus = settlementRow!.status;

    // ── Idempotency guard: already terminal → discard ──
    if (TERMINAL_STATUSES.has(previousStatus!)) {
      await client.query("COMMIT");
      console.log(
        `[MOOV-WEBHOOK] webhook_duplicate_retry_discarded: Settlement ${settlementId} already ${previousStatus} — idempotent skip`,
      );
      return NextResponse.json({
        received: true,
        action: "skipped",
        reason: `Settlement already ${previousStatus}`,
        settlementId,
        audit: "webhook_duplicate_retry_discarded",
      });
    }

    // ── Insert ledger journal + entries within the locked transaction ──
    const idemKey = data.metadata.idempotencyKey ?? `moov:${transferId}`;
    const now = new Date();

    // Create the journal (idempotent via UNIQUE idempotency_key — ON CONFLICT DO NOTHING)
    const journalResult = await client.query(
      `INSERT INTO ledger_journals (settlement_case_id, idempotency_key, description, posted_at, created_by)
       VALUES ($1, $2::uuid, $3, $4, $5)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        settlementId,
        idemKey,
        `Moov ${eventType}: transfer ${transferId}`,
        now,
        WEBHOOK_ACTOR_ID,
      ],
    );

    // If the journal was already created (duplicate idempotency key), skip entries
    if (journalResult.rows.length > 0) {
      const journalId = journalResult.rows[0].id;
      const notionalCents = Math.round((settlementRow!.total_notional ?? 0) * 100);

      if (mapping.dbStatus === "SETTLED" && notionalCents > 0) {
        // Double-entry: DEBIT escrow, CREDIT seller proceeds
        await client.query(
          `INSERT INTO ledger_entries (journal_id, account_id, direction, amount_cents, currency, memo)
           VALUES
             ($1, (SELECT id FROM ledger_accounts WHERE code = 'SETTLEMENT_ESCROW'), 'DEBIT', $2, 'USD', $3),
             ($1, (SELECT id FROM ledger_accounts WHERE code = 'SELLER_PROCEEDS'), 'CREDIT', $2, 'USD', $4)`,
          [
            journalId,
            notionalCents,
            `Escrow release for settlement ${settlementId}`,
            `Seller payout for settlement ${settlementId}`,
          ],
        );
      } else if (mapping.dbStatus === "CANCELLED" && notionalCents > 0) {
        // Reversal: DEBIT escrow, CREDIT buyer (refund)
        await client.query(
          `INSERT INTO ledger_entries (journal_id, account_id, direction, amount_cents, currency, memo)
           VALUES
             ($1, (SELECT id FROM ledger_accounts WHERE code = 'SETTLEMENT_ESCROW'), 'DEBIT', $2, 'USD', $3),
             ($1, (SELECT id FROM ledger_accounts WHERE code = 'BUYER_ESCROW'), 'CREDIT', $2, 'USD', $4)`,
          [
            journalId,
            notionalCents,
            `Escrow unwind for cancelled settlement ${settlementId}`,
            `Buyer refund for cancelled settlement ${settlementId}`,
          ],
        );
      }
    }

    // ── Update settlement status ──
    await client.query(
      `UPDATE settlement_cases SET status = $1 WHERE id = $2`,
      [mapping.dbStatus, settlementId],
    );

    await client.query("COMMIT");
    committedStatus = mapping.dbStatus;

    console.log(
      `[MOOV-WEBHOOK] COMMITTED: settlement ${settlementId} ${previousStatus} → ${committedStatus}`,
    );
  } catch (err) {
    // ── ROLLBACK on any error ──
    try {
      await client.query("ROLLBACK");
    } catch {
      // ROLLBACK itself failed — log but don't mask original error
      console.error(`[MOOV-WEBHOOK] ROLLBACK failed for settlement ${settlementId}`);
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[MOOV-WEBHOOK] Transaction failed for settlement ${settlementId}:`,
      message,
    );
    return NextResponse.json(
      { error: "Internal server error", settlementId },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => {});
  }

  /* ── Step 5: Post-COMMIT side effects (fire-and-forget) ──
       These run AFTER the transaction is committed.
       Failures here do NOT affect the settlement status. */

  const idemKey = data.metadata.idempotencyKey ?? `moov:${transferId}`;
  const finalityStatus: "COMPLETED" | "FAILED" | "REVERSED" =
    eventType === "transfer.completed" ? "COMPLETED"
    : eventType === "transfer.reversed" ? "REVERSED"
    : "FAILED";

  recordSettlementFinality({
    settlementId,
    rail: "moov",
    externalTransferId: transferId,
    idempotencyKey: idemKey,
    finalityStatus,
    amountCents: data.amount?.value ?? 0,
    leg: (data.metadata.leg as "seller_payout" | "fee_sweep") ?? "seller_payout",
    isFallback: false,
  }).catch((err) => {
    console.error(`[MOOV-WEBHOOK] Failed to record settlement finality:`, err);
  });

  updatePayoutStatus({
    idempotencyKey: idemKey,
    status: finalityStatus,
    externalId: transferId,
    errorMessage: eventType !== "transfer.completed" ? mapping.reason : undefined,
  }).catch((err) => {
    console.error(`[MOOV-WEBHOOK] Failed to update payout status:`, err);
  });

  /* ── Step 6: Post-SETTLED pipeline (certificate + email) ── */
  let certificateNumber: string | undefined;

  if (committedStatus === "SETTLED" && settlementRow) {
    console.log(
      `[MOOV-WEBHOOK] Settlement ${settlementId} reached SETTLED — triggering post-settlement pipeline`,
    );

    try {
      const now = new Date().toISOString();
      const order = mockOrders.find((o) => o.id === settlementRow!.order_id);
      const listing = mockListings.find((l) => l.id === settlementRow!.listing_id);

      if (order && listing) {
        // Construct minimal settlement shape for certificate engine
        // TODO: Replace with full DB-sourced SettlementCase when ORM is available
        const settlementForCert = {
          id: settlementId,
          orderId: settlementRow!.order_id,
          listingId: settlementRow!.listing_id,
          buyerUserId: String(settlementRow!.buyer_id),
          sellerUserId: listing.sellerUserId,
          weightOz: Number(settlementRow!.weight_oz),
          notionalUsd: Number(settlementRow!.total_notional),
          status: "SETTLED" as const,
          vaultHubId: listing.vaultHubId,
          rail: "moov" as const,
          openedAt: now,
          updatedAt: now,
          fundsConfirmedFinal: true,
          goldAllocated: true,
          verificationCleared: true,
          activationStatus: "activated" as const,
        } as unknown as SettlementCase;

        const dvpEntry = {
          id: `le-cert-${settlementId}`,
          settlementId,
          type: "DVP_EXECUTED" as const,
          timestamp: now,
          actor: "SYSTEM" as const,
          actorRole: "admin" as const,
          actorUserId: WEBHOOK_ACTOR_ID,
          detail: `DvP executed for settlement ${settlementId}`,
        } as LedgerEntry;

        const certificate = await issueCertificate({
          settlement: settlementForCert,
          order,
          listing,
          dvpLedgerEntry: dvpEntry,
          now,
          escrowReleased: true,
        });
        certificateNumber = certificate.certificateNumber;

        console.log(
          `[MOOV-WEBHOOK] Certificate issued: ${certificateNumber} for settlement ${settlementId}`,
        );
      } else {
        console.warn(
          `[MOOV-WEBHOOK] Could not issue certificate — missing dependencies: ` +
            `order=${!!order}, listing=${!!listing}`,
        );
      }

      // ── Email notifications (fire-and-forget) ──
      const buyerUser = mockUsers.find(
        (u) => u.id === String(settlementRow!.buyer_id),
      );
      const sellerUser = listing
        ? mockUsers.find((u) => u.id === listing.sellerUserId)
        : undefined;
      const buyerEmail =
        buyerUser?.email ?? "unknown-buyer@aurumshield.vip";
      const sellerEmail =
        sellerUser?.email ?? "unknown-seller@aurumshield.vip";

      notifyPartiesOfSettlement(
        buyerEmail,
        sellerEmail,
        settlementId,
        certificateNumber,
      ).catch((err) => {
        console.error(
          `[MOOV-WEBHOOK] Post-SETTLED email notification failed for ${settlementId}:`,
          err,
        );
      });
    } catch (pipelineErr) {
      const pipelineMsg =
        pipelineErr instanceof Error
          ? pipelineErr.message
          : String(pipelineErr);
      console.error(
        `[MOOV-WEBHOOK] Post-SETTLED pipeline error for ${settlementId}:`,
        pipelineMsg,
      );
      // Non-fatal — the settlement status was already committed
    }
  }

  /* ── Step 7: Respond ── */
  console.log(
    `[MOOV-WEBHOOK] ${eventType} processed successfully for settlement ${settlementId}`,
  );

  return NextResponse.json({
    received: true,
    action: committedStatus === "SETTLED" ? "confirmed" : "failed",
    settlementId,
    transferId,
    committedStatus,
    previousStatus,
    ...(certificateNumber ? { certificateNumber } : {}),
  });
}
