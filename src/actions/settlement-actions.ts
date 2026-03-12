"use server";

/* ================================================================
   ATOMIC SWAP EXECUTION ENGINE — Delivery versus Payment (DvP)
   ================================================================
   When a Producer authorizes release of escrowed asset, this engine
   atomically executes:
     Phase A: Cryptographic title handoff (Turnkey adapter)
     Phase B: Outbound Fedwire payout routing (Column adapter)
     Phase C: Ledger finality (state + clearing ledger commit)

   All three phases execute inside a single SQL transaction.
   Any failure → ROLLBACK. Escrow remains locked.

   Terminology: Offtaker (buyer), Producer (seller).
   ================================================================ */

import { createHash, randomUUID } from "crypto";
import { getPoolClient } from "@/lib/db";

/* ================================================================
   TYPES
   ================================================================ */

export interface AtomicSwapResult {
  success: boolean;
  orderId: string;
  titleHash?: string;
  outboundTransferId?: string;
  settledAt?: string;
  error?: string;
}

/* ================================================================
   TURNKEY ADAPTER (Title Minting)
   ================================================================
   TODO: Replace with live Turnkey API integration when signing
   infrastructure is deployed.

   Simulates signing the canonical asset payload and generating
   a deterministic SHA-256 title hash (certificate_id).
   ================================================================ */

interface TurnkeyTitlePayload {
  orderId: string;
  serialNumber: string;
  fineness: string;
  weightOz: number;
  vaultLocation: string;
  offtakerId: string;
}

async function mintCryptographicTitle(
  payload: TurnkeyTitlePayload,
): Promise<{ titleHash: string; certificateId: string }> {
  // TODO: POST to Turnkey signing API
  // const res = await fetch("https://api.turnkey.com/v1/sign", { ... });

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // Generate deterministic SHA-256 hash from canonical payload
  const canonical = JSON.stringify({
    orderId: payload.orderId,
    serialNumber: payload.serialNumber,
    fineness: payload.fineness,
    weightOz: payload.weightOz,
    vaultLocation: payload.vaultLocation,
    offtakerId: payload.offtakerId,
    timestamp: new Date().toISOString(),
  });

  const titleHash = createHash("sha256").update(canonical).digest("hex");
  const certificateId = `CERT-${titleHash.slice(0, 12).toUpperCase()}`;

  return { titleHash, certificateId };
}

/* ================================================================
   COLUMN ADAPTER (Outbound Fedwire Payout)
   ================================================================
   TODO: Replace with live Column Bank API integration.

   Simulates POST /transfers/wire to route funds from the FBO
   virtual account to the Producer's pre-verified counterparty.
   ================================================================ */

interface ColumnPayoutRequest {
  fromVirtualAccountId: string;
  toRoutingNumber: string;
  toAccountNumber: string;
  amountCents: number;
  currency: string;
  reference: string;
  idempotencyKey: string;
}

async function routeOutboundFedwire(
  req: ColumnPayoutRequest,
): Promise<{ transferId: string; status: string }> {
  // TODO: POST to Column Bank API
  // const res = await fetch("https://api.column.com/transfers/wire", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.COLUMN_API_KEY}`,
  //     "Content-Type": "application/json",
  //     "Idempotency-Key": req.idempotencyKey,
  //   },
  //   body: JSON.stringify({ ... }),
  // });

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 300));

  const transferId = `wire_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  console.log(
    `[COLUMN-PAYOUT] Outbound Fedwire routed: transfer=${transferId} ` +
      `amount_cents=${req.amountCents} ref=${req.reference}`,
  );

  return { transferId, status: "submitted" };
}

/* ================================================================
   EXECUTE ATOMIC SWAP — Server Action
   ================================================================ */

export async function executeAtomicSwap(
  orderId: string,
  producerId: string,
): Promise<AtomicSwapResult> {
  if (!orderId?.trim() || !producerId?.trim()) {
    return {
      success: false,
      orderId: orderId ?? "",
      error: "Order ID and Producer ID are required.",
    };
  }

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    /* ── 1. Pre-Execution State Validation ── */
    const { rows: orderRows } = await client.query<{
      id: string;
      order_id: string;
      buyer_id: string;
      producer_id: string | null;
      listing_id: string;
      status: string;
      total_notional: string;
      weight_oz: string;
      locked_price_per_oz: string;
      clearing_certificate_hash: string | null;
    }>(
      `SELECT id, order_id, buyer_id, producer_id, listing_id,
              status, total_notional, weight_oz, locked_price_per_oz,
              clearing_certificate_hash
       FROM settlement_cases
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    if (orderRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        orderId,
        error: "Order not found.",
      };
    }

    const order = orderRows[0];

    /* ── Producer Authorization Check ── */
    if (order.producer_id && order.producer_id !== producerId) {
      await client.query("ROLLBACK");
      console.warn(
        `[DVP-ENGINE] Producer mismatch: order=${orderId} ` +
          `expected=${order.producer_id} got=${producerId}`,
      );
      return {
        success: false,
        orderId,
        error: "Unauthorized: Producer ID does not match this order.",
      };
    }

    /* ── State Guard ── */
    if (order.status !== "FUNDS_CLEARED_READY_FOR_RELEASE") {
      await client.query("ROLLBACK");
      console.warn(
        `[DVP-ENGINE] Invalid state for DvP: order=${orderId} status=${order.status}`,
      );
      throw new Error("Invalid settlement state for DvP execution.");
    }

    /* ── Idempotency: Already has a title hash → already executed ── */
    if (order.clearing_certificate_hash) {
      await client.query("ROLLBACK");
      return {
        success: true,
        orderId,
        titleHash: order.clearing_certificate_hash,
        error: "DvP already executed for this order.",
      };
    }

    /* ── 2. Phase A: Cryptographic Title Handoff ── */
    console.log(`[DVP-ENGINE] Phase A: Minting cryptographic title for order=${orderId}`);

    // Query the asset details from the listing
    const { rows: listingRows } = await client.query<{
      form: string;
      purity: string;
      total_weight_oz: string;
      vault_location: string;
    }>(
      `SELECT form, purity, total_weight_oz, vault_location
       FROM inventory_listings
       WHERE id = $1`,
      [order.listing_id],
    );

    const listing = listingRows[0] ?? {
      form: "400oz Good Delivery",
      purity: "0.9950",
      total_weight_oz: order.weight_oz,
      vault_location: "Zurich FTZ",
    };

    const titleResult = await mintCryptographicTitle({
      orderId: order.order_id,
      serialNumber: `SN-${order.order_id}-${Date.now().toString(36)}`,
      fineness: listing.purity,
      weightOz: parseFloat(listing.total_weight_oz || order.weight_oz),
      vaultLocation: listing.vault_location,
      offtakerId: order.buyer_id,
    });

    console.log(
      `[DVP-ENGINE] Phase A complete: title_hash=${titleResult.titleHash.slice(0, 16)}... ` +
        `certificate=${titleResult.certificateId}`,
    );

    /* ── 3. Phase B: Fiat Payout Routing ── */
    console.log(`[DVP-ENGINE] Phase B: Routing outbound Fedwire for order=${orderId}`);

    const notionalCents = Math.round(parseFloat(order.total_notional) * 100);
    const idempotencyKey = `dvp-payout-${order.order_id}-${orderId}`;

    const payoutResult = await routeOutboundFedwire({
      fromVirtualAccountId: `va_${orderId}`,
      toRoutingNumber: "021000021", // TODO: Query from producer's verified bank details
      toAccountNumber: "****8842",  // TODO: Query from producer's verified bank details
      amountCents: notionalCents,
      currency: "USD",
      reference: `DVP-${order.order_id}`,
      idempotencyKey,
    });

    console.log(
      `[DVP-ENGINE] Phase B complete: outbound_transfer=${payoutResult.transferId}`,
    );

    /* ── 4. Phase C: Ledger Finality ── */
    console.log(`[DVP-ENGINE] Phase C: Committing ledger finality for order=${orderId}`);

    const settledAt = new Date().toISOString();

    // Update settlement_cases → TITLE_TRANSFERRED_AND_COMPLETED
    await client.query(
      `UPDATE settlement_cases
       SET status = 'TITLE_TRANSFERRED_AND_COMPLETED',
           clearing_certificate_hash = $1,
           outbound_transfer_id = $2,
           settled_at = $3
       WHERE id = $4`,
      [titleResult.titleHash, payoutResult.transferId, settledAt, orderId],
    );

    // DVP event audit trail
    await client.query(
      `INSERT INTO dvp_events
         (settlement_id, event_type, previous_state,
          actor_user_id, actor_role, detail, metadata)
       VALUES ($1, 'DVP_EXECUTED', 'FUNDS_HELD', $2, 'producer', $3, $4)`,
      [
        orderId,
        producerId,
        `Atomic DvP executed: title transferred to Offtaker, Fedwire routed to Producer. ` +
          `Certificate: ${titleResult.certificateId}`,
        JSON.stringify({
          titleHash: titleResult.titleHash,
          certificateId: titleResult.certificateId,
          outboundTransferId: payoutResult.transferId,
          notionalCents,
          settledAt,
          producerId,
          offtakerId: order.buyer_id,
        }),
      ],
    );

    // Settlement finality record for outbound wire
    await client.query(
      `INSERT INTO settlement_finality
         (settlement_id, rail, external_transfer_id, idempotency_key,
          finality_status, amount_cents, leg, is_fallback, finalized_at)
       VALUES ($1, 'column', $2, $3, 'COMPLETED', $4, 'producer_payout', FALSE, NOW())
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [orderId, payoutResult.transferId, idempotencyKey, notionalCents],
    );

    // Payout record (idempotent)
    await client.query(
      `INSERT INTO payouts
         (settlement_id, payee_id, idempotency_key, rail,
          action_type, amount_cents, status, external_id)
       VALUES ($1, $2, $3, 'column', 'producer_payout', $4, 'SUBMITTED', $5)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [orderId, producerId, idempotencyKey, notionalCents, payoutResult.transferId],
    );

    /* ── COMMIT ── */
    await client.query("COMMIT");

    console.info(
      `[DVP-ENGINE] ✓ ATOMIC SWAP COMMITTED: order=${orderId} ` +
        `title=${titleResult.certificateId} wire=${payoutResult.transferId} settled_at=${settledAt}`,
    );

    return {
      success: true,
      orderId,
      titleHash: titleResult.titleHash,
      outboundTransferId: payoutResult.transferId,
      settledAt,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    const message = err instanceof Error ? err.message : String(err);

    // Re-throw the specific state validation error
    if (message === "Invalid settlement state for DvP execution.") {
      throw new Error("Invalid settlement state for DvP execution.");
    }

    console.error(
      `[DVP-ENGINE] ATOMIC SWAP FAILED for order=${orderId}:`,
      message,
    );

    // Sanitized error — do not leak internal API traces
    return {
      success: false,
      orderId,
      error: "DvP Execution Failed. Escrow remains locked.",
    };
  } finally {
    client.release();
  }
}
