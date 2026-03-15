"use server";

/* ================================================================
   SOVEREIGN CARRIER WEBHOOK — Armored Logistics Event Receiver
   ================================================================
   Secure inbound webhook endpoint called by Malca-Amit and Brink's
   dispatch servers to report GPS position, chain-of-custody handoffs,
   and delivery confirmation for high-value gold shipments.

   Security:
     - HMAC-SHA256 signature validation (CARRIER_WEBHOOK_SECRET)
     - Constant-time comparison to prevent timing attacks
     - State guard: shipment must exist for the tracking number

   DVP AWARENESS GATE (Finality):
     When status === 'DELIVERED', the webhook checks whether
     funds_confirmed_final is true on the linked settlement:
       - If TRUE  → settlement transitions to SETTLED
       - If FALSE → settlement transitions to AWAITING_FUNDS_RELEASE
     This prevents premature settlement when delivery outpaces
     Fedwire clearing.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPoolClient } from "@/lib/db";
import { emitAuditEvent } from "@/lib/audit-logger";

/* ---------- Types ---------- */

interface CarrierWebhookPayload {
  /** Carrier-issued tracking number */
  trackingNumber: string;
  /** Event status (PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED) */
  status: string;
  /** GPS + location data */
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  /** Cryptographic proof of custodian handoff */
  signatureHash: string;
  /** ISO-8601 event timestamp from carrier */
  timestamp: string;
}

/* ---------- Signature Validation ---------- */

/**
 * Validate the webhook signature using HMAC-SHA256.
 * The carrier sends the signature in the X-Carrier-Signature header.
 *
 * Uses constant-time comparison to prevent timing attacks —
 * identical pattern to the Refinery webhook handler.
 *
 * @param rawBody - Raw request body as a string
 * @param signature - Value of the X-Carrier-Signature header
 * @param secret - CARRIER_WEBHOOK_SECRET from environment
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

/* ---------- Valid Status Values ---------- */

const VALID_STATUSES = [
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

/* ---------- POST Handler ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.CARRIER_WEBHOOK_SECRET;

  /* ── 1. Read raw body ── */
  const rawBody = await request.text();

  /* ── 2. Signature verification ── */
  if (webhookSecret) {
    const signature =
      request.headers.get("x-carrier-signature") ??
      request.headers.get("X-Carrier-Signature") ??
      "";

    if (!signature) {
      console.error("[LOGISTICS-WEBHOOK] Missing X-Carrier-Signature header");
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 },
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[LOGISTICS-WEBHOOK] Invalid webhook signature — rejecting");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "[LOGISTICS-WEBHOOK] CARRIER_WEBHOOK_SECRET not set — signature validation SKIPPED (development mode only)",
    );
  }

  /* ── 3. Parse payload ── */
  let payload: CarrierWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CarrierWebhookPayload;
  } catch {
    console.error("[LOGISTICS-WEBHOOK] Failed to parse webhook payload");
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  /* ── 4. Payload validation ── */
  if (
    !payload.trackingNumber?.trim() ||
    !payload.status?.trim() ||
    !payload.location ||
    typeof payload.location.lat !== "number" ||
    typeof payload.location.lng !== "number" ||
    !payload.location.name?.trim() ||
    !payload.signatureHash?.trim() ||
    !payload.timestamp?.trim()
  ) {
    console.error(
      `[LOGISTICS-WEBHOOK] Invalid payload: trackingNumber=${payload.trackingNumber} ` +
        `status=${payload.status} location=${JSON.stringify(payload.location)} ` +
        `signatureHash=${payload.signatureHash} timestamp=${payload.timestamp}`,
    );
    return NextResponse.json(
      { error: "Invalid payload: trackingNumber, status, location, signatureHash, and timestamp are required." },
      { status: 400 },
    );
  }

  /* ── 5. Status validation ── */
  if (!VALID_STATUSES.includes(payload.status as typeof VALID_STATUSES[number])) {
    console.error(
      `[LOGISTICS-WEBHOOK] Invalid status: ${payload.status}. ` +
        `Valid statuses: ${VALID_STATUSES.join(", ")}`,
    );
    return NextResponse.json(
      { error: `Invalid status: ${payload.status}` },
      { status: 400 },
    );
  }

  console.log(
    `[LOGISTICS-WEBHOOK] Received event: tracking=${payload.trackingNumber} ` +
      `status=${payload.status} location=${payload.location.name} ` +
      `lat=${payload.location.lat} lng=${payload.location.lng} ` +
      `signatureHash=${payload.signatureHash.slice(0, 16)}...`,
  );

  /* ── 6. Database operations ── */
  const client = await getPoolClient();

  try {
    /* ── 6a. Find shipment by tracking number ── */
    const { rows: shipmentRows } = await client.query<{
      id: string;
      settlement_id: string;
      status: string;
    }>(
      `SELECT id, settlement_id, status
       FROM shipments
       WHERE tracking_number = $1
       FOR UPDATE`,
      [payload.trackingNumber],
    );

    if (shipmentRows.length === 0) {
      console.warn(
        `[LOGISTICS-WEBHOOK] Shipment not found: tracking_number=${payload.trackingNumber}`,
      );
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 },
      );
    }

    const shipment = shipmentRows[0];

    /* ── 6b. Insert custody event (append-only) ── */
    await client.query(
      `INSERT INTO shipment_events
         (shipment_id, status, location_name, latitude, longitude,
          custodian_signature_hash, event_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        shipment.id,
        payload.status,
        payload.location.name,
        payload.location.lat,
        payload.location.lng,
        payload.signatureHash,
        payload.timestamp,
      ],
    );

    /* ── 6c. Update shipment status ── */
    await client.query(
      `UPDATE shipments
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [payload.status, shipment.id],
    );

    console.info(
      `[LOGISTICS-WEBHOOK] ✓ Event recorded: shipment=${shipment.id} ` +
        `status=${payload.status} custodian_hash=${payload.signatureHash.slice(0, 16)}...`,
    );

    /* ── 7. FINALITY GATE: DELIVERED → DVP Awareness Check ── */
    if (payload.status === "DELIVERED") {
      console.log(
        `[LOGISTICS-WEBHOOK] FINALITY GATE: Delivery confirmed for shipment=${shipment.id}. ` +
          `Checking DVP readiness for settlement=${shipment.settlement_id}...`,
      );

      /* ── Query settlement state for DVP awareness ── */
      const { rows: settlementRows } = await client.query<{
        id: string;
        status: string;
        funds_confirmed_final: boolean;
      }>(
        `SELECT id, status, COALESCE(funds_confirmed_final, FALSE) AS funds_confirmed_final
         FROM settlement_cases
         WHERE id = $1
         FOR UPDATE`,
        [shipment.settlement_id],
      );

      if (settlementRows.length > 0) {
        const settlement = settlementRows[0];

        if (settlement.funds_confirmed_final) {
          /* ── FUNDS CLEARED → Transition to SETTLED ── */
          await client.query(
            `UPDATE settlement_cases
             SET status = 'SETTLED', updated_at = NOW()
             WHERE id = $1`,
            [settlement.id],
          );

          console.info(
            `[LOGISTICS-WEBHOOK] ✓ DVP FINALIZED: settlement=${settlement.id} → SETTLED. ` +
              `Funds confirmed + delivery confirmed = escrow loop closed.`,
          );

          emitAuditEvent(
            "LOGISTICS_DELIVERY_FINALIZED",
            "INFO",
            {
              shipmentId: shipment.id,
              settlementId: settlement.id,
              trackingNumber: payload.trackingNumber,
              carrier: shipment.status,
              deliveryTimestamp: payload.timestamp,
              locationName: payload.location.name,
              custodianSignatureHash: payload.signatureHash,
              fundsConfirmedFinal: true,
              previousStatus: settlement.status,
              newStatus: "SETTLED",
            },
            {
              settlementId: settlement.id,
            },
          );
        } else {
          /* ── FUNDS NOT CLEARED → Park in AWAITING_FUNDS_RELEASE ── */
          await client.query(
            `UPDATE settlement_cases
             SET status = 'AWAITING_FUNDS_RELEASE', updated_at = NOW()
             WHERE id = $1`,
            [settlement.id],
          );

          console.warn(
            `[LOGISTICS-WEBHOOK] ⚠ DVP PARTIAL: settlement=${settlement.id} → AWAITING_FUNDS_RELEASE. ` +
              `Delivery confirmed but funds_confirmed_final=false. ` +
              `Settlement parked until wire clears.`,
          );

          emitAuditEvent(
            "LOGISTICS_DELIVERED_PENDING_FUNDS",
            "WARN",
            {
              shipmentId: shipment.id,
              settlementId: settlement.id,
              trackingNumber: payload.trackingNumber,
              deliveryTimestamp: payload.timestamp,
              locationName: payload.location.name,
              custodianSignatureHash: payload.signatureHash,
              fundsConfirmedFinal: false,
              previousStatus: settlement.status,
              newStatus: "AWAITING_FUNDS_RELEASE",
              actionRequired:
                "Physical delivery has outpaced Fedwire clearing. " +
                "Settlement will auto-finalize when funds_confirmed_final transitions to TRUE.",
            },
            {
              settlementId: settlement.id,
            },
          );
        }
      } else {
        console.warn(
          `[LOGISTICS-WEBHOOK] Settlement not found for finality gate: settlement_id=${shipment.settlement_id}`,
        );
      }
    }

    /* ── 8. Audit Event (non-blocking) ── */
    emitAuditEvent(
      "LOGISTICS_EVENT_RECEIVED",
      "INFO",
      {
        shipmentId: shipment.id,
        trackingNumber: payload.trackingNumber,
        status: payload.status,
        locationName: payload.location.name,
        latitude: payload.location.lat,
        longitude: payload.location.lng,
        custodianSignatureHash: payload.signatureHash,
        eventTimestamp: payload.timestamp,
        previousStatus: shipment.status,
      },
      {
        settlementId: shipment.settlement_id,
      },
    );

    return NextResponse.json({
      received: true,
      shipmentId: shipment.id,
      trackingNumber: payload.trackingNumber,
      status: payload.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LOGISTICS-WEBHOOK] Database error:", message);

    // Return 500 so the carrier retries the webhook
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
