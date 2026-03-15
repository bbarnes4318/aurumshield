"use server";

/* ================================================================
   REFINERY YIELD WEBHOOK — LBMA Refinery Oracle
   ================================================================
   Secure inbound webhook endpoint called by LBMA-certified
   refineries (Asahi, Valcambi, Metalor, PAMP) when fire-assay
   and recasting are complete.

   This is THE ORACLE — the single source of truth for the actual
   refined weight of a RAW_DORE asset. Until this webhook fires
   successfully, the Atomic Swap engine will refuse to mint a
   cryptographic title.

   Security:
     - HMAC-SHA256 signature validation (REFINERY_WEBHOOK_SECRET)
     - Constant-time comparison to prevent timing attacks
     - State guard: only PENDING_DELIVERY / PROCESSING can advance

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPoolClient } from "@/lib/db";
import { emitAuditEvent } from "@/lib/audit-logger";

/* ---------- Types ---------- */

interface RefineryWebhookPayload {
  /** The inventory listing ID this yield report applies to */
  listingId: string;
  /** True refined weight in troy ounces (99.99% pure) */
  finalWeightOz: number;
  /** Final purity string (e.g., "0.9999") */
  finalPurity: string;
  /** New serial numbers assigned to the recast bars */
  newSerialNumbers: string[];
}

/* ---------- Signature Validation ---------- */

/**
 * Validate the webhook signature using HMAC-SHA256.
 * The refinery sends the signature in the X-Refinery-Signature header.
 *
 * Uses constant-time comparison to prevent timing attacks —
 * identical pattern to the Turnkey webhook handler.
 *
 * @param rawBody - Raw request body as a string
 * @param signature - Value of the X-Refinery-Signature header
 * @param secret - REFINERY_WEBHOOK_SECRET from environment
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
  const webhookSecret = process.env.REFINERY_WEBHOOK_SECRET;

  /* ── 1. Read raw body ── */
  const rawBody = await request.text();

  /* ── 2. Signature verification ── */
  if (webhookSecret) {
    const signature =
      request.headers.get("x-refinery-signature") ??
      request.headers.get("X-Refinery-Signature") ??
      "";

    if (!signature) {
      console.error("[REFINERY-WEBHOOK] Missing X-Refinery-Signature header");
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 },
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[REFINERY-WEBHOOK] Invalid webhook signature — rejecting");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "[REFINERY-WEBHOOK] REFINERY_WEBHOOK_SECRET not set — signature validation SKIPPED (development mode only)",
    );
  }

  /* ── 3. Parse payload ── */
  let payload: RefineryWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RefineryWebhookPayload;
  } catch {
    console.error("[REFINERY-WEBHOOK] Failed to parse webhook payload");
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  /* ── 4. Payload validation ── */
  if (
    !payload.listingId?.trim() ||
    typeof payload.finalWeightOz !== "number" ||
    payload.finalWeightOz <= 0 ||
    !payload.finalPurity?.trim() ||
    !Array.isArray(payload.newSerialNumbers) ||
    payload.newSerialNumbers.length === 0
  ) {
    console.error(
      `[REFINERY-WEBHOOK] Invalid payload: listingId=${payload.listingId} ` +
        `finalWeightOz=${payload.finalWeightOz} finalPurity=${payload.finalPurity} ` +
        `newSerialNumbers=${JSON.stringify(payload.newSerialNumbers)}`,
    );
    return NextResponse.json(
      { error: "Invalid payload: listingId, finalWeightOz, finalPurity, and newSerialNumbers are required." },
      { status: 400 },
    );
  }

  console.log(
    `[REFINERY-WEBHOOK] Received yield report: listing=${payload.listingId} ` +
      `finalWeightOz=${payload.finalWeightOz} finalPurity=${payload.finalPurity} ` +
      `newSerialNumbers=${payload.newSerialNumbers.join(",")}`,
  );

  /* ── 5. Find listing and validate state ── */
  const client = await getPoolClient();

  try {
    const { rows: listingRows } = await client.query<{
      id: string;
      refinery_status: string;
      estimated_weight_oz: string | null;
    }>(
      `SELECT id, refinery_status, estimated_weight_oz
       FROM inventory_listings
       WHERE id = $1
       FOR UPDATE`,
      [payload.listingId],
    );

    if (listingRows.length === 0) {
      console.warn(
        `[REFINERY-WEBHOOK] Listing not found: ${payload.listingId}`,
      );
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 },
      );
    }

    const listing = listingRows[0];

    /* ── State guard: only PENDING_DELIVERY or PROCESSING can advance ── */
    if (
      listing.refinery_status !== "PENDING_DELIVERY" &&
      listing.refinery_status !== "PROCESSING"
    ) {
      console.warn(
        `[REFINERY-WEBHOOK] Invalid state transition: listing=${payload.listingId} ` +
          `current_status=${listing.refinery_status} — cannot advance to COMPLETED`,
      );
      return NextResponse.json(
        {
          error: "Invalid state: listing is not in PENDING_DELIVERY or PROCESSING status.",
          currentStatus: listing.refinery_status,
        },
        { status: 409 },
      );
    }

    /* ── 6. Update listing with confirmed yield data ── */

    // Build the signoff hash from the yield payload for tamper detection
    const { createHash } = await import("crypto");
    const yieldCanonical = JSON.stringify({
      listingId: payload.listingId,
      finalWeightOz: payload.finalWeightOz,
      finalPurity: payload.finalPurity,
      newSerialNumbers: payload.newSerialNumbers,
      confirmedAt: new Date().toISOString(),
    });
    const refinerySignoffHash = createHash("sha256")
      .update(yieldCanonical)
      .digest("hex");

    const yieldData = {
      finalWeightOz: payload.finalWeightOz,
      finalPurity: payload.finalPurity,
      newSerialNumbers: payload.newSerialNumbers,
      refinerySignoffHash,
      estimatedWeightOz: listing.estimated_weight_oz
        ? parseFloat(listing.estimated_weight_oz)
        : null,
      yieldVarianceOz: listing.estimated_weight_oz
        ? payload.finalWeightOz - parseFloat(listing.estimated_weight_oz)
        : null,
      confirmedAt: new Date().toISOString(),
    };

    await client.query(
      `UPDATE inventory_listings
       SET actual_refined_weight_oz = $1,
           refinery_status = 'COMPLETED',
           refinery_yield_data = $2
       WHERE id = $3`,
      [
        payload.finalWeightOz,
        JSON.stringify(yieldData),
        payload.listingId,
      ],
    );

    console.info(
      `[REFINERY-WEBHOOK] ✓ YIELD CONFIRMED: listing=${payload.listingId} ` +
        `actual_refined_weight_oz=${payload.finalWeightOz} ` +
        `estimated_weight_oz=${listing.estimated_weight_oz ?? "N/A"} ` +
        `variance=${yieldData.yieldVarianceOz?.toFixed(4) ?? "N/A"} oz ` +
        `status=COMPLETED signoff_hash=${refinerySignoffHash.slice(0, 16)}...`,
    );

    /* ── 7. Audit Event (non-blocking) ── */
    emitAuditEvent(
      "REFINERY_YIELD_CONFIRMED",
      "INFO",
      {
        listingId: payload.listingId,
        finalWeightOz: payload.finalWeightOz,
        finalPurity: payload.finalPurity,
        newSerialNumbers: payload.newSerialNumbers,
        estimatedWeightOz: listing.estimated_weight_oz
          ? parseFloat(listing.estimated_weight_oz)
          : null,
        yieldVarianceOz: yieldData.yieldVarianceOz,
        refinerySignoffHash,
        previousStatus: listing.refinery_status,
      },
    );

    return NextResponse.json({
      received: true,
      listingId: payload.listingId,
      refineryStatus: "COMPLETED",
      actualRefinedWeightOz: payload.finalWeightOz,
      refinerySignoffHash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[REFINERY-WEBHOOK] Database error:", message);

    // Return 500 so the refinery retries the webhook
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
