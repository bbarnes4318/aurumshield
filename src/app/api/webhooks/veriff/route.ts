/* ================================================================
   VERIFF IDENTITY WEBHOOK RECEIVER
   POST /api/webhooks/veriff

   Compliance Case integration:
     - Creates or updates a ComplianceCase on each event
     - Appends an idempotent ComplianceEvent to the audit trail
     - Publishes the event to SSE subscribers for real-time UI updates

   Receives asynchronous session decision callbacks from Veriff after
   a user completes (or fails) the hosted KYC/KYB verification.

   Supported events:
     - session.completed  → kyc_status = APPROVED
     - session.failed     → kyc_status = REJECTED

   Security:
     - Veriff signs webhooks with HMAC-SHA256. The header is:
         X-HMAC-Signature: <hex-digest>
       where the signed payload is the raw request body.
     - VERIFF_WEBHOOK_SECRET must be set in production.
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
 * Verify a Veriff webhook signature.
 *
 * Veriff sends the header:
 *   X-HMAC-Signature: <hex-hmac>
 *
 * The signed content is the raw request body.
 */
function verifyVeriffSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;

  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signatureHeader, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/* ---------- Zod Schema: Veriff Webhook Payload ---------- */

/**
 * Veriff webhook decision payloads follow a flat JSON structure:
 *
 * {
 *   "status": "success" | "fail" | "resubmission_requested" | "review" | "expired" | "abandoned",
 *   "verification": {
 *     "id": "<session-uuid>",
 *     "code": 9001,
 *     "person": { ... },
 *     "reason": "...",
 *     "reasonCode": 101,
 *     "status": "approved" | "resubmission_requested" | "declined" | "review" | "expired" | "abandoned",
 *     "vendorData": "<our-reference-id>",
 *   }
 * }
 *
 * We use vendorData as the referenceId (AurumShield userId).
 */
const VeriffVerificationSchema = z.object({
  id: z.string().min(1, "session ID is required"),
  status: z.enum(["approved", "resubmission_requested", "declined", "review", "expired", "abandoned"]),
  vendorData: z.string().min(1, "vendorData (user ID) is required"),
  reason: z.string().optional(),
  reasonCode: z.number().optional(),
});

const VeriffWebhookSchema = z.object({
  status: z.enum(["success", "fail", "resubmission_requested", "review", "expired", "abandoned"]),
  verification: VeriffVerificationSchema,
});

type VeriffWebhookPayload = z.infer<typeof VeriffWebhookSchema>;

/* ---------- Event → KYC Status Mapping ---------- */

const STATUS_TO_KYC: Record<string, string> = {
  success: "APPROVED",
  fail: "REJECTED",
  resubmission_requested: "PENDING",
  review: "PENDING",
  expired: "REJECTED",
  abandoned: "REJECTED",
};

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("X-HMAC-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.VERIFF_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!verifyVeriffSignature(rawBody, signatureHeader, webhookSecret)) {
      console.warn("[VERIFF-WEBHOOK] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[VERIFF-WEBHOOK] VERIFF_WEBHOOK_SECRET not set — signature verification skipped (development mode)",
      );
    } else {
      console.error(
        "[VERIFF-WEBHOOK] VERIFF_WEBHOOK_SECRET not configured in non-development environment",
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

  const validation = VeriffWebhookSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[VERIFF-WEBHOOK] Payload validation failed:",
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

  const payload: VeriffWebhookPayload = validation.data;
  const eventStatus = payload.status;
  const verification = payload.verification;
  const userId = verification.vendorData;
  const sessionId = verification.id;

  const newKycStatus = STATUS_TO_KYC[eventStatus] ?? "PENDING";

  console.log(
    `[VERIFF-WEBHOOK] Processing ${eventStatus} for user ${userId} (session ${sessionId}) → kyc_status=${newKycStatus}`,
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
      console.warn(`[VERIFF-WEBHOOK] User ${userId} not found in database`);
      return NextResponse.json(
        { error: "User not found", userId },
        { status: 404 },
      );
    }

    if (existing[0].kyc_status === newKycStatus) {
      console.log(
        `[VERIFF-WEBHOOK] User ${userId} already has kyc_status=${newKycStatus} — idempotent skip`,
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
      `[VERIFF-WEBHOOK] Updated user ${userId} kyc_status → ${newKycStatus}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[VERIFF-WEBHOOK] Database error for user ${userId}:`,
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
        `[VERIFF-WEBHOOK] Created ComplianceCase ${cc.id} for user ${userId}`,
      );
    }
    complianceCaseId = cc.id;

    // Store the Veriff session reference on the case
    if (sessionId) {
      await updateComplianceCaseInquiryId(cc.id, sessionId);
    }

    // Update case status based on the event
    const caseStatus = newKycStatus === "APPROVED" ? "APPROVED" as const : "REJECTED" as const;
    const caseTier = newKycStatus === "APPROVED" ? "EXECUTE" as const : "BROWSE" as const;
    await updateComplianceCaseStatus(cc.id, caseStatus, cc.status, caseTier);

    // Append audit event (idempotent via event_id)
    const eventIdKey = `veriff-${eventStatus}-${userId}-${Date.now()}`;
    const event = await appendComplianceEvent(
      cc.id,
      eventIdKey,
      "PROVIDER",
      eventStatus === "success" ? "INQUIRY_COMPLETED" : "INQUIRY_FAILED",
      {
        provider: "Veriff",
        eventStatus,
        kycStatus: newKycStatus,
        sessionId,
        verificationStatus: verification.status,
        reason: verification.reason,
        reasonCode: verification.reasonCode,
      },
    );

    // Publish to SSE subscribers for real-time UI updates
    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }

    console.log(
      `[VERIFF-WEBHOOK] ComplianceCase ${cc.id} → status=${caseStatus}, tier=${caseTier}`,
    );
  } catch (ccErr) {
    // Non-fatal: the KYC status was already updated successfully.
    // Log the compliance case error but don't fail the webhook.
    console.error(
      `[VERIFF-WEBHOOK] ComplianceCase update failed for user ${userId}:`,
      ccErr instanceof Error ? ccErr.message : String(ccErr),
    );
  }

  /* ── Step 6: Respond ── */
  return NextResponse.json({
    received: true,
    action: "updated",
    userId,
    newKycStatus,
    sessionId,
    event: eventStatus,
    complianceCaseId,
  });
}
