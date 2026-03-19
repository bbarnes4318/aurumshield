/* ================================================================
   IDENFY WEBHOOK RECEIVER — Compliance State Machine
   POST /api/webhooks/idenfy
   ================================================================
   Receives iDenfy verification callback webhooks, verifies the
   HMAC-SHA256 origin via the Idenfy-Signature header, and
   deterministically mutates the user's KYB/KYC state.

   Security:
     - HMAC-SHA256 signature verification via Idenfy-Signature header
     - Timing-safe comparison (constant-time) prevents timing attacks
     - Fail-closed: missing secret → 500, bad sig → 401
     - Zero data leaked on rejection

   Idempotency:
     - idenfy_webhook_log table keyed on scanRef
     - Duplicate scanRef + SAME status are acknowledged (200) but skipped
     - Status changes on the same scanRef (e.g. admin override) are processed via UPSERT

   State Machine:
     - APPROVED  → kyb_status = KYB_APPROVED, verified_by = 'IDENFY'
     - DENIED    → kyb_status = KYB_DECLINED, verified_by = 'IDENFY'
     - SUSPECTED → kyb_status = KYB_UNDER_REVIEW

   Response Protocol:
     - 200 on commit (fast — iDenfy won't retry)
     - 401 on signature failure
     - 500 on DB failure (iDenfy retries)

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

function verifyIdenfySignature(
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
   ZOD SCHEMA — iDenfy Callback Payload
   ================================================================
   iDenfy sends a JSON payload with the verification result.
   Ref: https://documentation.idenfy.com/callbacks/ResultCallback
   ================================================================ */

const IdenfyStatusSchema = z.object({
  overall: z.enum([
    "APPROVED",
    "DENIED",
    "SUSPECTED",
    "REVIEWING",
    "EXPIRED",
    "ACTIVE",
  ]),
  autoDocument: z.string().optional(),
  autoFace: z.string().optional(),
  manualDocument: z.string().optional(),
  manualFace: z.string().optional(),
});

const IdenfyWebhookSchema = z.object({
  /** Unique scan reference — primary idempotency key */
  scanRef: z.string().min(1, "scanRef is required"),
  /** Our clientId = userId */
  clientId: z.string().min(1, "clientId is required"),
  /** Verification status object */
  status: IdenfyStatusSchema,
  /** Final result object (may contain additional fields) */
  final: z.boolean().optional(),
});

type IdenfyWebhookPayload = z.infer<typeof IdenfyWebhookSchema>;

/* ================================================================
   DETERMINISTIC STATE MAP
   ================================================================ */

interface IdenfyStateTransition {
  kybStatus: string;
  marketplaceAccess: boolean;
  kycStatus: string;
  complianceTier: "BROWSE" | "EXECUTE";
  complianceStatus: "APPROVED" | "REJECTED" | "PENDING_USER";
}

const STATE_MAP: Record<string, IdenfyStateTransition> = {
  APPROVED: {
    kybStatus: "KYB_APPROVED",
    marketplaceAccess: true,
    kycStatus: "APPROVED",
    complianceTier: "EXECUTE",
    complianceStatus: "APPROVED",
  },
  DENIED: {
    kybStatus: "KYB_DECLINED",
    marketplaceAccess: false,
    kycStatus: "REJECTED",
    complianceTier: "BROWSE",
    complianceStatus: "REJECTED",
  },
  SUSPECTED: {
    kybStatus: "KYB_UNDER_REVIEW",
    marketplaceAccess: false,
    kycStatus: "PENDING",
    complianceTier: "BROWSE",
    complianceStatus: "PENDING_USER",
  },
  REVIEWING: {
    kybStatus: "KYB_UNDER_REVIEW",
    marketplaceAccess: false,
    kycStatus: "PENDING",
    complianceTier: "BROWSE",
    complianceStatus: "PENDING_USER",
  },
  EXPIRED: {
    kybStatus: "KYB_DECLINED",
    marketplaceAccess: false,
    kycStatus: "REJECTED",
    complianceTier: "BROWSE",
    complianceStatus: "REJECTED",
  },
  ACTIVE: {
    kybStatus: "KYB_PENDING",
    marketplaceAccess: false,
    kycStatus: "PENDING",
    complianceTier: "BROWSE",
    complianceStatus: "PENDING_USER",
  },
};

/* ================================================================
   POST HANDLER
   ================================================================ */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── 1. Extract Signature ── */
  const signatureHeader =
    request.headers.get("Idenfy-Signature") ??
    request.headers.get("idenfy-signature") ??
    "";

  const rawBody = await request.text();

  /* ── 2. Cryptographic Verification (fail-closed) ── */
  const webhookSecret = process.env.IDENFY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[IDENFY-WEBHOOK] CRITICAL: IDENFY_WEBHOOK_SECRET is not configured. " +
        "Cannot verify webhook origin. Rejecting all payloads.",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!verifyIdenfySignature(rawBody, signatureHeader, webhookSecret)) {
    console.warn(
      "[IDENFY-WEBHOOK] ⚠ SECURITY INTRUSION ALERT — " +
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
    console.warn("[IDENFY-WEBHOOK] Malformed JSON body — rejected.");
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const validation = IdenfyWebhookSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[IDENFY-WEBHOOK] Payload schema validation failed:",
      validation.error.issues,
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const payload: IdenfyWebhookPayload = validation.data;
  const scanRef = payload.scanRef;
  const overallStatus = payload.status.overall;
  const clerkId = payload.clientId; // iDenfy clientId = Clerk user ID

  /* ── 4. Resolve State Transition ── */
  const transition = STATE_MAP[overallStatus];
  if (!transition) {
    console.info(
      `[IDENFY-WEBHOOK] Unknown status "${overallStatus}" — acknowledged, no action.`,
    );
    return NextResponse.json({ success: true, skipped: overallStatus });
  }

  console.log(
    `[IDENFY-WEBHOOK] Processing: scanRef=${scanRef} ` +
      `clerk_id=${clerkId} idenfy_status=${overallStatus} → kyb_status=${transition.kybStatus}`,
  );

  /* ── 5. Database Transaction (idempotent) ── */
  const client = await getPoolClient();

  /* ── 5a. Resolve Clerk ID → internal UUID (before transaction) ── */
  const { rows: userRows } = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE clerk_id = $1",
    [clerkId],
  );

  if (userRows.length === 0) {
    client.release();
    console.warn(
      `[IDENFY-WEBHOOK] No user found for clerk_id=${clerkId} — acknowledging to prevent retry loop.`,
    );
    return NextResponse.json({
      success: true,
      action: "skipped",
      reason: "user_not_found",
      clerkId,
    });
  }

  const userId = userRows[0].id; // Internal UUID

  try {
    await client.query("BEGIN");

    /* ── 5b. State Progression & Idempotency Guard ── */
    const { rows: existing } = await client.query<{ idenfy_status: string }>(
      "SELECT idenfy_status FROM idenfy_webhook_log WHERE scan_ref = $1",
      [scanRef],
    );

    let isStateUpdate = false;

    if (existing.length > 0) {
      if (existing[0].idenfy_status === overallStatus) {
        await client.query("COMMIT");
        console.info(
          `[IDENFY-WEBHOOK] Duplicate scanRef=${scanRef} with status=${overallStatus} — idempotent skip.`,
        );
        return NextResponse.json({
          success: true,
          action: "skipped",
          reason: "already_processed",
          scanRef,
        });
      }
      // The status has changed (e.g., Admin manually approved a SUSPECTED scan in iDenfy portal)
      isStateUpdate = true;
    }

    /* ── 5c. Log the webhook (INSERT or UPDATE) ── */
    if (isStateUpdate) {
      await client.query(
        `UPDATE idenfy_webhook_log
         SET idenfy_status = $1, mapped_kyb_status = $2, raw_payload = $3
         WHERE scan_ref = $4`,
        [overallStatus, transition.kybStatus, JSON.stringify(parsed), scanRef]
      );
      console.info(`[IDENFY-WEBHOOK] Overriding existing scanRef=${scanRef} to status=${overallStatus}`);
    } else {
      await client.query(
        `INSERT INTO idenfy_webhook_log
           (scan_ref, user_id, idenfy_status, mapped_kyb_status, raw_payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [scanRef, userId, overallStatus, transition.kybStatus, JSON.stringify(parsed)]
      );
    }

    /* ── 5d. Update users table: kyb_status + marketplace_access + kyc_status + verified_by ── */
    const { rowCount } = await client.query(
      `UPDATE users
       SET kyb_status         = $1,
           marketplace_access = $2,
           kyc_status         = $3,
           verified_by        = $4
       WHERE clerk_id = $5`,
      [
        transition.kybStatus,
        transition.marketplaceAccess,
        transition.kycStatus,
        "IDENFY",
        clerkId,
      ],
    );

    if (rowCount === 0) {
      await client.query("ROLLBACK");
      console.warn(
        `[IDENFY-WEBHOOK] User update failed for clerk_id=${clerkId} — rolled back. ` +
          "Acknowledging to prevent iDenfy retry loop.",
      );
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "user_update_failed",
        clerkId,
      });
    }

    await client.query("COMMIT");

    console.info(
      `[IDENFY-WEBHOOK] COMMITTED: clerk_id=${clerkId} uuid=${userId} → ` +
        `kyb_status=${transition.kybStatus} marketplace_access=${transition.marketplaceAccess} verified_by=IDENFY`,
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[IDENFY-WEBHOOK] Database transaction FAILED for clerk_id=${clerkId}:`,
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
        userId: userId,
        status: "PENDING_PROVIDER",
        tier: "BROWSE",
      });
      console.info(
        `[IDENFY-WEBHOOK] Created ComplianceCase ${cc.id} for clerk_id=${clerkId}`,
      );
    }
    complianceCaseId = cc.id;

    // Store iDenfy scanRef as the provider inquiry reference
    if (scanRef) {
      await updateComplianceCaseInquiryId(cc.id, scanRef);
    }

    // Update case status & tier
    await updateComplianceCaseStatus(
      cc.id,
      transition.complianceStatus,
      cc.status,
      transition.complianceTier,
    );

    // Append audit event (idempotent via event_id unique constraint)
    const eventIdKey = `idenfy-${scanRef}-${overallStatus}`;
    const event = await appendComplianceEvent(
      cc.id,
      eventIdKey,
      "PROVIDER",
      overallStatus === "APPROVED" ? "INQUIRY_COMPLETED" : "INQUIRY_FAILED",
      {
        provider: "iDenfy",
        scanRef,
        idenfyStatus: overallStatus,
        kybStatus: transition.kybStatus,
        marketplaceAccess: transition.marketplaceAccess,
        autoDocument: payload.status.autoDocument,
        autoFace: payload.status.autoFace,
        manualDocument: payload.status.manualDocument,
        manualFace: payload.status.manualFace,
        verifiedBy: "IDENFY",
      },
    );

    // Publish to SSE for real-time UI updates
    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }

    console.info(
      `[IDENFY-WEBHOOK] ComplianceCase ${cc.id} (clerk_id=${clerkId}) → ` +
        `status=${transition.complianceStatus} tier=${transition.complianceTier} verified_by=IDENFY`,
    );
  } catch (ccErr) {
    // Non-fatal: the KYB state was already committed.
    console.error(
      `[IDENFY-WEBHOOK] ComplianceCase update failed (non-fatal) for clerk_id=${clerkId}:`,
      ccErr instanceof Error ? ccErr.message : String(ccErr),
    );
  }

  /* ── 7. Respond 200 ── */
  return NextResponse.json({
    success: true,
    action: "committed",
    clerkId,
    kybStatus: transition.kybStatus,
    marketplaceAccess: transition.marketplaceAccess,
    scanRef,
    verifiedBy: "IDENFY",
    complianceCaseId,
  });
}
