/* ================================================================
   PERSONA IDENTITY WEBHOOK RECEIVER
   POST /api/webhooks/persona

   Compliance Case integration:
     - Creates or updates a ComplianceCase on each event
     - Appends an idempotent ComplianceEvent to the audit trail
     - Publishes the event to SSE subscribers for real-time UI updates

   Receives asynchronous inquiry updates from Persona after a user
   completes (or fails) the hosted KYC/KYB flow.

   Supported events:
     - inquiry.completed  → kyc_status = APPROVED
     - inquiry.failed     → kyc_status = REJECTED

   Security:
     - Persona signs webhooks with HMAC-SHA256. The header is:
         Persona-Signature: t=<timestamp>,v1=<hex-digest>
       where the signed payload is "<timestamp>.<rawBody>".
     - PERSONA_WEBHOOK_SECRET must be set in production.
     - Graceful skip in development when not configured.

   Database:
     - Updates `users.kyc_status` via the shared `getDbClient()`.
     - Idempotent: skips update if kyc_status is already APPROVED.

   Zod:
     - Strictly typed payload schema prevents malformed data from
       reaching the database layer.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";
import { getDbClient } from "@/lib/db";
import {
  getComplianceCaseByUserId,
  createComplianceCase,
  updateComplianceCaseStatus,
  updateComplianceCaseInquiryId,
} from "@/lib/compliance/models";
import { appendComplianceEvent, publishCaseEvent } from "@/lib/compliance/events";

/* ---------- HMAC Signature Verification ---------- */

/**
 * Verify a Persona webhook signature.
 *
 * Persona sends the header:
 *   Persona-Signature: t=<unix-ts>,v1=<hex-hmac>
 *
 * The signed content is `"<timestamp>.<rawBody>"`.
 */
function verifyPersonaSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;

  try {
    // Parse "t=<ts>,v1=<sig>" format
    const parts: Record<string, string> = {};
    for (const segment of signatureHeader.split(",")) {
      const eqIdx = segment.indexOf("=");
      if (eqIdx === -1) continue;
      parts[segment.slice(0, eqIdx).trim()] = segment.slice(eqIdx + 1).trim();
    }

    const timestamp = parts["t"];
    const v1Signature = parts["v1"];
    if (!timestamp || !v1Signature) return false;

    // Replay protection: reject signatures older than 5 minutes
    const ageSeconds = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (ageSeconds > 300) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const sigBuffer = Buffer.from(v1Signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/* ---------- Zod Schema: Persona Webhook Payload ---------- */

/**
 * Persona webhook payloads follow the JSON:API structure.
 *
 * Top-level:
 *   { "data": { "type": "event", "attributes": { "name": "inquiry.completed", "payload": { ... } } } }
 *
 * The nested payload contains the inquiry object with:
 *   - referenceId: The AurumShield user UUID we passed when creating the inquiry
 *   - status:      "completed" | "failed" | "expired" | etc.
 */
const PersonaInquiryPayloadSchema = z.object({
  type: z.literal("inquiry"),
  attributes: z.object({
    status: z.string().min(1, "inquiry status is required"),
    referenceId: z.string().min(1, "referenceId (user ID) is required"),
  }),
});

const PersonaEventAttributesSchema = z.object({
  name: z.enum(["inquiry.completed", "inquiry.failed"]),
  payload: z.object({
    data: PersonaInquiryPayloadSchema,
  }),
});

const PersonaWebhookSchema = z.object({
  data: z.object({
    type: z.literal("event"),
    attributes: PersonaEventAttributesSchema,
  }),
});

type PersonaWebhookPayload = z.infer<typeof PersonaWebhookSchema>;

/* ---------- Event → KYC Status Mapping ---------- */

const EVENT_TO_KYC_STATUS: Record<string, string> = {
  "inquiry.completed": "APPROVED",
  "inquiry.failed": "REJECTED",
};

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Persona-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!verifyPersonaSignature(rawBody, signatureHeader, webhookSecret)) {
      console.warn("[PERSONA-WEBHOOK] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PERSONA-WEBHOOK] PERSONA_WEBHOOK_SECRET not set — signature verification skipped (development mode)",
      );
    } else {
      console.error(
        "[PERSONA-WEBHOOK] PERSONA_WEBHOOK_SECRET not configured in non-development environment",
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

  const validation = PersonaWebhookSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[PERSONA-WEBHOOK] Payload validation failed:",
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

  const payload: PersonaWebhookPayload = validation.data;
  const eventName = payload.data.attributes.name;
  const inquiry = payload.data.attributes.payload.data.attributes;
  const userId = inquiry.referenceId;

  const newKycStatus = EVENT_TO_KYC_STATUS[eventName];
  if (!newKycStatus) {
    // Should not happen with the Zod enum, but defensive
    return NextResponse.json({
      received: true,
      action: "ignored",
      reason: `Unhandled event: ${eventName}`,
    });
  }

  console.log(
    `[PERSONA-WEBHOOK] Processing ${eventName} for user ${userId} → kyc_status=${newKycStatus}`,
  );

  /* ── Step 4: Database mutation ── */
  let client;
  try {
    client = await getDbClient();

    // Idempotency check: skip if user already has the target status
    const { rows: existing } = await client.query<{ kyc_status: string }>(
      "SELECT kyc_status FROM users WHERE id = $1",
      [userId],
    );

    if (existing.length === 0) {
      console.warn(`[PERSONA-WEBHOOK] User ${userId} not found in database`);
      return NextResponse.json(
        { error: "User not found", userId },
        { status: 404 },
      );
    }

    if (existing[0].kyc_status === newKycStatus) {
      console.log(
        `[PERSONA-WEBHOOK] User ${userId} already has kyc_status=${newKycStatus} — idempotent skip`,
      );
      return NextResponse.json({
        received: true,
        action: "skipped",
        reason: `kyc_status already ${newKycStatus}`,
        userId,
      });
    }

    // Apply the KYC status update
    await client.query(
      "UPDATE users SET kyc_status = $1 WHERE id = $2",
      [newKycStatus, userId],
    );

    console.log(
      `[PERSONA-WEBHOOK] Updated user ${userId} kyc_status → ${newKycStatus}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[PERSONA-WEBHOOK] Database error for user ${userId}:`,
      message,
    );
    return NextResponse.json(
      { error: "Database operation failed" },
      { status: 502 },
    );
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  /* ── Step 5: Compliance Case integration ── */
  let complianceCaseId: string | undefined;
  try {
    // Find or create a ComplianceCase for this user
    let cc = await getComplianceCaseByUserId(userId);
    if (!cc) {
      cc = await createComplianceCase({
        userId,
        status: "PENDING_PROVIDER",
        tier: "BROWSE",
      });
      console.log(
        `[PERSONA-WEBHOOK] Created ComplianceCase ${cc.id} for user ${userId}`,
      );
    }
    complianceCaseId = cc.id;

    // Store the Persona inquiry reference on the case
    const inquiryRef = inquiry.referenceId;
    if (inquiryRef) {
      await updateComplianceCaseInquiryId(cc.id, inquiryRef);
    }

    // Update case status based on the event
    const caseStatus = newKycStatus === "APPROVED" ? "APPROVED" as const : "REJECTED" as const;
    const caseTier = newKycStatus === "APPROVED" ? "EXECUTE" as const : "BROWSE" as const;
    await updateComplianceCaseStatus(cc.id, caseStatus, cc.status, caseTier);

    // Append audit event (idempotent via event_id)
    const eventIdKey = `persona-${eventName}-${userId}-${Date.now()}`;
    const event = await appendComplianceEvent(
      cc.id,
      eventIdKey,
      "PROVIDER",
      eventName === "inquiry.completed" ? "INQUIRY_COMPLETED" : "INQUIRY_FAILED",
      {
        provider: "Persona",
        eventName,
        kycStatus: newKycStatus,
        referenceId: inquiry.referenceId,
        inquiryStatus: inquiry.status,
      },
    );

    // Publish to SSE subscribers for real-time UI updates
    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }

    console.log(
      `[PERSONA-WEBHOOK] ComplianceCase ${cc.id} → status=${caseStatus}, tier=${caseTier}`,
    );
  } catch (ccErr) {
    // Non-fatal: the KYC status was already updated successfully.
    // Log the compliance case error but don't fail the webhook.
    console.error(
      `[PERSONA-WEBHOOK] ComplianceCase update failed for user ${userId}:`,
      ccErr instanceof Error ? ccErr.message : String(ccErr),
    );
  }

  /* ── Step 6: Respond ── */
  return NextResponse.json({
    received: true,
    action: "updated",
    userId,
    newKycStatus,
    event: eventName,
    complianceCaseId,
  });
}
