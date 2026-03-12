/* ================================================================
   VERIFF KYB DECISION WEBHOOK — Compliance State Machine
   POST /api/webhooks/veriff
   ================================================================
   Receives Veriff decision webhooks, verifies HMAC-SHA256 origin,
   and deterministically mutates the Offtaker's KYB state to gate
   or unlock marketplace access.

   Security:
     - HMAC-SHA256 signature verification via X-HMAC-SIGNATURE
     - Timing-safe comparison (constant-time) prevents timing attacks
     - Fail-closed: missing secret → 500, bad sig → 401
     - Zero data leaked on rejection

   Idempotency:
     - veriff_webhook_log table keyed on verification_id
     - Duplicate verification IDs are acknowledged (200) but skipped

   State Machine:
     - approved               → KYB_APPROVED, marketplace_access = true
     - declined               → KYB_DECLINED, marketplace_access = false
     - resubmission_requested → KYB_RESUBMISSION_REQUIRED

   Response Protocol:
     - 200 on commit (fast — Veriff won't retry)
     - 401 on signature failure
     - 500 on DB failure (Veriff retries)

   Uses pooled pg via getPoolClient(). Server-side only.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createHmac, timingSafeEqual } from "crypto";
import { getPoolClient } from "@/lib/db";
import {
  getComplianceCaseByUserId,
  createComplianceCase,
  updateComplianceCaseStatus,
  updateComplianceCaseInquiryId,
} from "@/lib/compliance/models";
import { appendComplianceEvent, publishCaseEvent } from "@/lib/compliance/events";

/* ================================================================
   HMAC-SHA256 SIGNATURE VERIFICATION
   ================================================================ */

function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;

  try {
    const computed = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signatureHeader, "utf-8");
    const computedBuffer = Buffer.from(computed, "utf-8");

    if (sigBuffer.length !== computedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/* ================================================================
   ZOD SCHEMA — Veriff Decision Payload
   ================================================================ */

const VeriffVerificationSchema = z.object({
  id: z.string().min(1, "verification ID is required"),
  status: z.enum([
    "approved",
    "resubmission_requested",
    "declined",
    "review",
    "expired",
    "abandoned",
  ]),
  vendorData: z.string().min(1, "vendorData (userId) is required"),
  reason: z.string().optional(),
  reasonCode: z.number().optional(),
});

const VeriffWebhookSchema = z.object({
  status: z.enum([
    "success",
    "fail",
    "resubmission_requested",
    "review",
    "expired",
    "abandoned",
  ]),
  verification: VeriffVerificationSchema,
});

type VeriffWebhookPayload = z.infer<typeof VeriffWebhookSchema>;

/* ================================================================
   DETERMINISTIC STATE MAP
   ================================================================ */

interface KybStateTransition {
  kybStatus: string;
  marketplaceAccess: boolean;
  kycStatus: string;          // users.kyc_status enum value
  complianceTier: "BROWSE" | "EXECUTE";
  complianceStatus: "APPROVED" | "REJECTED" | "PENDING_USER";
}

const STATE_MAP: Record<string, KybStateTransition> = {
  approved: {
    kybStatus: "KYB_APPROVED",
    marketplaceAccess: true,
    kycStatus: "APPROVED",
    complianceTier: "EXECUTE",
    complianceStatus: "APPROVED",
  },
  declined: {
    kybStatus: "KYB_DECLINED",
    marketplaceAccess: false,
    kycStatus: "REJECTED",
    complianceTier: "BROWSE",
    complianceStatus: "REJECTED",
  },
  resubmission_requested: {
    kybStatus: "KYB_RESUBMISSION_REQUIRED",
    marketplaceAccess: false,
    kycStatus: "PENDING",
    complianceTier: "BROWSE",
    complianceStatus: "PENDING_USER",
  },
  review: {
    kybStatus: "KYB_UNDER_REVIEW",
    marketplaceAccess: false,
    kycStatus: "PENDING",
    complianceTier: "BROWSE",
    complianceStatus: "PENDING_USER",
  },
  expired: {
    kybStatus: "KYB_DECLINED",
    marketplaceAccess: false,
    kycStatus: "REJECTED",
    complianceTier: "BROWSE",
    complianceStatus: "REJECTED",
  },
  abandoned: {
    kybStatus: "KYB_DECLINED",
    marketplaceAccess: false,
    kycStatus: "REJECTED",
    complianceTier: "BROWSE",
    complianceStatus: "REJECTED",
  },
};

/* ================================================================
   POST HANDLER
   ================================================================ */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── 1. Extract HMAC Signature ── */
  const signatureHeader =
    request.headers.get("X-HMAC-SIGNATURE") ??
    request.headers.get("x-hmac-signature") ??
    "";

  const rawBody = await request.text();

  /* ── 2. Cryptographic Verification (fail-closed) ── */
  const sharedSecret = process.env.VERIFF_API_SECRET;

  if (!sharedSecret) {
    console.error(
      "[VERIFF-WEBHOOK] CRITICAL: VERIFF_API_SECRET is not configured. " +
        "Cannot verify webhook origin. Rejecting all payloads.",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!verifyHmacSignature(rawBody, signatureHeader, sharedSecret)) {
    console.warn(
      "[VERIFF-WEBHOOK] ⚠ SECURITY INTRUSION ALERT — " +
        "HMAC signature verification FAILED. " +
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
    console.warn("[VERIFF-WEBHOOK] Malformed JSON body — rejected.");
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const validation = VeriffWebhookSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[VERIFF-WEBHOOK] Payload schema validation failed:",
      validation.error.issues,
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const payload: VeriffWebhookPayload = validation.data;
  const verification = payload.verification;
  const verificationId = verification.id;
  const veriffStatus = verification.status;
  const userId = verification.vendorData;

  /* ── 4. Resolve State Transition ── */
  const transition = STATE_MAP[veriffStatus];
  if (!transition) {
    // Unknown status — acknowledge to prevent retries, skip processing
    console.info(
      `[VERIFF-WEBHOOK] Unknown verification status "${veriffStatus}" — acknowledged, no action.`,
    );
    return NextResponse.json({ success: true, skipped: veriffStatus });
  }

  console.log(
    `[VERIFF-WEBHOOK] Processing: verification=${verificationId} ` +
      `user=${userId} veriff_status=${veriffStatus} → kyb_status=${transition.kybStatus}`,
  );

  /* ── 5. Database Transaction (idempotent) ── */
  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    /* ── 5a. Idempotency Guard ── */
    const { rows: existing } = await client.query<{ id: string }>(
      "SELECT id FROM veriff_webhook_log WHERE verification_id = $1",
      [verificationId],
    );

    if (existing.length > 0) {
      await client.query("COMMIT");
      console.info(
        `[VERIFF-WEBHOOK] Duplicate verification_id=${verificationId} — idempotent skip.`,
      );
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "already_processed",
        verificationId,
      });
    }

    /* ── 5b. Log the webhook (locks the verification_id) ── */
    await client.query(
      `INSERT INTO veriff_webhook_log
         (verification_id, user_id, veriff_status, mapped_kyb_status, raw_payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        verificationId,
        userId,
        veriffStatus,
        transition.kybStatus,
        JSON.stringify(parsed),
      ],
    );

    /* ── 5c. Update users table: kyb_status + marketplace_access + kyc_status ── */
    const { rowCount } = await client.query(
      `UPDATE users
       SET kyb_status         = $1,
           marketplace_access = $2,
           kyc_status         = $3
       WHERE id = $4`,
      [
        transition.kybStatus,
        transition.marketplaceAccess,
        transition.kycStatus,
        userId,
      ],
    );

    if (rowCount === 0) {
      // User not found — roll back the log entry, return 200 to prevent
      // infinite retries (user may have been deleted).
      await client.query("ROLLBACK");
      console.warn(
        `[VERIFF-WEBHOOK] User ${userId} not found — rolled back. ` +
          "Acknowledging to prevent Veriff retry loop.",
      );
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "user_not_found",
        userId,
      });
    }

    await client.query("COMMIT");

    console.info(
      `[VERIFF-WEBHOOK] COMMITTED: user=${userId} → ` +
        `kyb_status=${transition.kybStatus} marketplace_access=${transition.marketplaceAccess}`,
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[VERIFF-WEBHOOK] Database transaction FAILED for user=${userId}:`,
      message,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }

  /* ── 6. Compliance Case Integration (non-fatal) ── */
  let complianceCaseId: string | undefined;
  try {
    let cc = await getComplianceCaseByUserId(userId);
    if (!cc) {
      cc = await createComplianceCase({
        userId,
        status: "PENDING_PROVIDER",
        tier: "BROWSE",
      });
      console.info(
        `[VERIFF-WEBHOOK] Created ComplianceCase ${cc.id} for user ${userId}`,
      );
    }
    complianceCaseId = cc.id;

    // Store Veriff session reference
    if (verificationId) {
      await updateComplianceCaseInquiryId(cc.id, verificationId);
    }

    // Update case status & tier
    await updateComplianceCaseStatus(
      cc.id,
      transition.complianceStatus,
      cc.status,
      transition.complianceTier,
    );

    // Append audit event (idempotent via event_id unique constraint)
    const eventIdKey = `veriff-${verificationId}-${veriffStatus}`;
    const event = await appendComplianceEvent(
      cc.id,
      eventIdKey,
      "PROVIDER",
      veriffStatus === "approved" ? "INQUIRY_COMPLETED" : "INQUIRY_FAILED",
      {
        provider: "Veriff",
        verificationId,
        veriffStatus,
        kybStatus: transition.kybStatus,
        marketplaceAccess: transition.marketplaceAccess,
        reason: verification.reason,
        reasonCode: verification.reasonCode,
      },
    );

    // Publish to SSE for real-time UI updates
    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }

    console.info(
      `[VERIFF-WEBHOOK] ComplianceCase ${cc.id} → ` +
        `status=${transition.complianceStatus} tier=${transition.complianceTier}`,
    );
  } catch (ccErr) {
    // Non-fatal: the KYB state was already committed.
    console.error(
      `[VERIFF-WEBHOOK] ComplianceCase update failed (non-fatal) for user=${userId}:`,
      ccErr instanceof Error ? ccErr.message : String(ccErr),
    );
  }

  /* ── 7. Respond 200 ── */
  return NextResponse.json({
    success: true,
    action: "committed",
    userId,
    kybStatus: transition.kybStatus,
    marketplaceAccess: transition.marketplaceAccess,
    verificationId,
    complianceCaseId,
  });
}
