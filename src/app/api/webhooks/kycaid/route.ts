/* ================================================================
   KYCAID DECISION WEBHOOK — Compliance State Machine
   POST /api/webhooks/kycaid
   ================================================================
   Receives KYCaid callback webhooks, verifies HMAC-SHA512 origin,
   and deterministically mutates the user's compliance state.

   Callback Types Handled:
     - VERIFICATION_COMPLETED     — Final decision with per-type results
     - VERIFICATION_STATUS_CHANGED — Status transition notification

   Security:
     - HMAC-SHA512 signature verification via x-data-integrity
     - Timing-safe comparison (constant-time) prevents timing attacks
     - Fail-closed: missing token → 500, bad sig → 401
     - Zero data leaked on rejection

   Idempotency:
     - kycaid_webhook_log table keyed on request_id
     - Duplicate request IDs are acknowledged (200) but skipped

   State Machine:
     - completed + verified=true  → KYB_APPROVED, marketplace_access=true
     - completed + verified=false → KYB_DECLINED, marketplace_access=false
     - pending                    → KYB_UNDER_REVIEW, marketplace_access=false

   Response Protocol:
     - 200 on commit (fast — KYCaid won't retry)
     - 401 on signature failure
     - 500 on DB failure (KYCaid retries)

   Uses pooled pg via getPoolClient(). Server-side only.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getPoolClient } from "@/lib/db";
import { verifyKycaidCallbackSignature } from "@/lib/compliance/kycaid-callback-verifier";
import {
  getComplianceCaseByUserId,
  createComplianceCase,
  updateComplianceCaseStatus,
  updateComplianceCaseInquiryId,
} from "@/lib/compliance/models";
import { appendComplianceEvent, publishCaseEvent } from "@/lib/compliance/events";

/* ================================================================
   ZOD SCHEMAS — KYCaid Callback Payloads
   ================================================================ */

/** Per-type verification result nested in callback. */
const VerificationTypeResultSchema = z.object({
  verified: z.boolean(),
  comment: z.string().optional().default(""),
  decline_reasons: z.array(z.string()).optional().default([]),
});

/** VERIFICATION_COMPLETED callback payload. */
const VerificationCompletedSchema = z.object({
  request_id: z.string().min(1, "request_id is required"),
  type: z.literal("VERIFICATION_COMPLETED"),
  verification_id: z.string().min(1),
  applicant_id: z.string().min(1),
  external_applicant_id: z.string().optional(),
  status: z.enum(["unused", "pending", "completed"]),
  verified: z.boolean(),
  verifications: z.record(z.string(), VerificationTypeResultSchema).optional(),
  form_id: z.string().optional(),
  verification_attempts_left: z.number().nullable().optional(),
});

/** VERIFICATION_STATUS_CHANGED callback payload. */
const VerificationStatusChangedSchema = z.object({
  request_id: z.string().min(1, "request_id is required"),
  type: z.literal("VERIFICATION_STATUS_CHANGED"),
  verification_id: z.string().min(1),
  applicant_id: z.string().min(1),
  external_applicant_id: z.string().optional(),
  form_id: z.string().optional(),
  verification_status: z.enum(["unused", "pending", "completed"]),
  verification_attempts_left: z.number().nullable().optional(),
});

/** Union discriminated on `type`. */
const KycaidCallbackSchema = z.discriminatedUnion("type", [
  VerificationCompletedSchema,
  VerificationStatusChangedSchema,
]);

type KycaidCallbackPayload = z.infer<typeof KycaidCallbackSchema>;

/* ================================================================
   DETERMINISTIC STATE MAP
   ================================================================ */

interface KybStateTransition {
  kybStatus: string;
  marketplaceAccess: boolean;
  kycStatus: string;
  complianceTier: "BROWSE" | "EXECUTE";
  complianceStatus: "APPROVED" | "REJECTED" | "PENDING_USER";
}

function resolveStateTransition(
  payload: KycaidCallbackPayload,
): KybStateTransition | null {
  if (payload.type === "VERIFICATION_COMPLETED") {
    if (payload.verified === true) {
      return {
        kybStatus: "KYB_APPROVED",
        marketplaceAccess: true,
        kycStatus: "APPROVED",
        complianceTier: "EXECUTE",
        complianceStatus: "APPROVED",
      };
    }
    // completed + verified=false → REJECTED
    return {
      kybStatus: "KYB_DECLINED",
      marketplaceAccess: false,
      kycStatus: "REJECTED",
      complianceTier: "BROWSE",
      complianceStatus: "REJECTED",
    };
  }

  // VERIFICATION_STATUS_CHANGED
  if (payload.verification_status === "completed") {
    // Status changed to completed but no verified flag — treat as under review
    // The VERIFICATION_COMPLETED callback will follow with the final decision
    return {
      kybStatus: "KYB_UNDER_REVIEW",
      marketplaceAccess: false,
      kycStatus: "PENDING",
      complianceTier: "BROWSE",
      complianceStatus: "PENDING_USER",
    };
  }

  if (payload.verification_status === "pending") {
    return {
      kybStatus: "KYB_UNDER_REVIEW",
      marketplaceAccess: false,
      kycStatus: "PENDING",
      complianceTier: "BROWSE",
      complianceStatus: "PENDING_USER",
    };
  }

  // "unused" — user hasn't started the form yet, no action needed
  return null;
}

/* ================================================================
   POST HANDLER
   ================================================================ */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── 1. Extract Integrity Header ── */
  const integrityHeader =
    request.headers.get("x-data-integrity") ??
    request.headers.get("X-Data-Integrity") ??
    "";

  const rawBody = await request.text();

  /* ── 2. Cryptographic Verification (fail-closed) ── */
  const env = (process.env.KYCAID_ENV ?? "test").toLowerCase();
  const apiToken =
    env === "production"
      ? process.env.KYCAID_PRODUCTION_API_KEY
      : process.env.KYCAID_TEST_API_KEY;

  if (!apiToken) {
    console.error(
      "[KYCAID-WEBHOOK] CRITICAL: KYCAID API KEY is not configured. " +
        "Cannot verify callback origin. Rejecting all payloads.",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!verifyKycaidCallbackSignature(rawBody, integrityHeader, apiToken)) {
    console.warn(
      "[KYCAID-WEBHOOK] ⚠ SECURITY INTRUSION ALERT — " +
        "HMAC-SHA512 signature verification FAILED. " +
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
    console.warn("[KYCAID-WEBHOOK] Malformed JSON body — rejected.");
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const validation = KycaidCallbackSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[KYCAID-WEBHOOK] Payload schema validation failed:",
      validation.error.issues,
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  const payload: KycaidCallbackPayload = validation.data;
  const requestId = payload.request_id;
  const verificationId = payload.verification_id;
  const applicantId = payload.applicant_id;
  const externalApplicantId =
    "external_applicant_id" in payload
      ? payload.external_applicant_id
      : undefined;

  // Use external_applicant_id as userId (we set it during createApplicant)
  const userId = externalApplicantId ?? applicantId;

  /* ── 4. Resolve State Transition ── */
  const transition = resolveStateTransition(payload);
  if (!transition) {
    console.info(
      `[KYCAID-WEBHOOK] Callback type=${payload.type} requires no state transition — acknowledged.`,
    );
    return NextResponse.json({
      success: true,
      action: "skipped",
      reason: "no_transition_required",
      requestId,
    });
  }

  console.log(
    `[KYCAID-WEBHOOK] Processing: request_id=${requestId} ` +
      `verification=${verificationId} user=${userId} ` +
      `type=${payload.type} → kyb_status=${transition.kybStatus}`,
  );

  /* ── 5. Database Transaction (idempotent) ── */
  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    /* ── 5a. Idempotency Guard ── */
    const { rows: existing } = await client.query<{ id: string }>(
      "SELECT id FROM kycaid_webhook_log WHERE request_id = $1",
      [requestId],
    );

    if (existing.length > 0) {
      await client.query("COMMIT");
      console.info(
        `[KYCAID-WEBHOOK] Duplicate request_id=${requestId} — idempotent skip.`,
      );
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "already_processed",
        requestId,
      });
    }

    /* ── 5b. Log the webhook (locks the request_id) ── */
    const isCompleted = payload.type === "VERIFICATION_COMPLETED";
    await client.query(
      `INSERT INTO kycaid_webhook_log
         (request_id, verification_id, applicant_id, user_id,
          callback_type, verification_status, verified, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        requestId,
        verificationId,
        applicantId,
        userId,
        payload.type,
        isCompleted
          ? (payload as z.infer<typeof VerificationCompletedSchema>).status
          : (payload as z.infer<typeof VerificationStatusChangedSchema>).verification_status,
        isCompleted
          ? (payload as z.infer<typeof VerificationCompletedSchema>).verified
          : null,
        JSON.stringify(parsed),
      ],
    );

    /* ── 5c. Update users table ── */
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
      await client.query("ROLLBACK");
      console.warn(
        `[KYCAID-WEBHOOK] User ${userId} not found — rolled back. ` +
          "Acknowledging to prevent KYCaid retry loop.",
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
      `[KYCAID-WEBHOOK] COMMITTED: user=${userId} → ` +
        `kyb_status=${transition.kybStatus} marketplace_access=${transition.marketplaceAccess}`,
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[KYCAID-WEBHOOK] Database transaction FAILED for user=${userId}:`,
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
        verifiedBy: "KYCAID",
      });
      console.info(
        `[KYCAID-WEBHOOK] Created ComplianceCase ${cc.id} for user ${userId}`,
      );
    }
    complianceCaseId = cc.id;

    // Store KYCaid verification reference
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
    const eventIdKey = `kycaid-${requestId}`;
    const isApproved = transition.complianceStatus === "APPROVED";
    const event = await appendComplianceEvent(
      cc.id,
      eventIdKey,
      "PROVIDER",
      isApproved ? "INQUIRY_COMPLETED" : "INQUIRY_FAILED",
      {
        provider: "KYCaid",
        requestId,
        verificationId,
        applicantId,
        callbackType: payload.type,
        kybStatus: transition.kybStatus,
        marketplaceAccess: transition.marketplaceAccess,
        verifications:
          payload.type === "VERIFICATION_COMPLETED"
            ? (payload as z.infer<typeof VerificationCompletedSchema>).verifications
            : undefined,
      },
    );

    // Publish to SSE for real-time UI updates
    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }

    console.info(
      `[KYCAID-WEBHOOK] ComplianceCase ${cc.id} → ` +
        `status=${transition.complianceStatus} tier=${transition.complianceTier}`,
    );
  } catch (ccErr) {
    // Non-fatal: the KYB state was already committed.
    console.error(
      `[KYCAID-WEBHOOK] ComplianceCase update failed (non-fatal) for user=${userId}:`,
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
