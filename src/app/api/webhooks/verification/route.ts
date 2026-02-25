/* ================================================================
   IDENTITY VERIFICATION WEBHOOK RECEIVER
   POST /api/webhooks/verification

   Receives provider callbacks after identity verification steps
   complete asynchronously. Validates HMAC signature and Zod schema,
   then delegates to the verification engine.

   Security:
   - HMAC-SHA256 signature verification via VERIFICATION_WEBHOOK_SECRET
   - Graceful skip in development if secret is not configured
   - Zod-validated payload — rejects malformed data with 400
   - Idempotent — duplicate webhookIds return 200 with action: "skipped"
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { processProviderWebhook } from "@/lib/verification-engine";
import {
  getComplianceCaseByUserId,
  createComplianceCase,
} from "@/lib/compliance/models";
import { appendComplianceEvent, publishCaseEvent } from "@/lib/compliance/events";

/* ---------- HMAC Signature Verification ---------- */

function verifyVerificationSignature(
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

/* ---------- Zod Schema ---------- */

const VerificationWebhookSchema = z.object({
  event: z.literal("verification_step.completed"),
  webhookId: z.string().min(1),
  userId: z.string().min(1),
  stepId: z.string().min(1),
  orgId: z.string().min(1),
  orgType: z.enum(["individual", "company"]),
  outcome: z.enum(["PASSED", "FAILED"]),
  providerNotes: z.string().optional(),
  providerRef: z.string().optional(),
});

type VerificationWebhookPayload = z.infer<typeof VerificationWebhookSchema>;

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signature = request.headers.get("X-Verification-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.VERIFICATION_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!verifyVerificationSignature(rawBody, signature, webhookSecret)) {
      console.warn("[VERIFICATION-WEBHOOK] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    // Graceful skip in development — only allow when NODE_ENV is development
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[VERIFICATION-WEBHOOK] VERIFICATION_WEBHOOK_SECRET not set — signature verification skipped (development mode)",
      );
    } else {
      console.error(
        "[VERIFICATION-WEBHOOK] VERIFICATION_WEBHOOK_SECRET not configured in non-development environment",
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

  const validation = VerificationWebhookSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[VERIFICATION-WEBHOOK] Payload validation failed:",
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

  const payload: VerificationWebhookPayload = validation.data;
  const { webhookId, userId, stepId, orgId, orgType, outcome, providerNotes } = payload;

  console.log(
    `[VERIFICATION-WEBHOOK] Processing ${stepId} for user ${userId} (webhookId=${webhookId}, outcome=${outcome})`,
  );

  /* ── Step 4: Delegate to verification engine ── */
  const result = processProviderWebhook(
    userId,
    webhookId,
    stepId,
    orgId,
    orgType,
    outcome,
    providerNotes,
  );

  if (!result) {
    console.warn(
      `[VERIFICATION-WEBHOOK] Step "${stepId}" for user "${userId}" is not in PROCESSING state or case not found`,
    );
    return NextResponse.json(
      {
        received: true,
        action: "rejected",
        reason: "Step is not in PROCESSING state or case not found",
        webhookId,
      },
      { status: 409 },
    );
  }

  if (result.alreadyProcessed) {
    console.log(
      `[VERIFICATION-WEBHOOK] Webhook ${webhookId} already processed — idempotent skip`,
    );
    return NextResponse.json({
      received: true,
      action: "skipped",
      reason: "Webhook already processed",
      webhookId,
    });
  }

  console.log(
    `[VERIFICATION-WEBHOOK] Step "${stepId}" resolved to ${outcome} for user ${userId}`,
  );

  /* ── Step 5: Compliance Case event logging ── */
  try {
    let cc = await getComplianceCaseByUserId(userId);
    if (!cc) {
      cc = await createComplianceCase({
        userId,
        orgType: orgType,
        status: "PENDING_PROVIDER",
        tier: "BROWSE",
      });
    }

    const event = await appendComplianceEvent(
      cc.id,
      webhookId,
      "PROVIDER",
      "STEP_COMPLETED",
      {
        stepId,
        outcome,
        orgId,
        orgType,
        providerNotes: providerNotes ?? null,
        caseStatus: result.case.status,
      },
    );

    if (event) {
      await publishCaseEvent(userId, cc.id, event);
    }
  } catch (ccErr) {
    // Non-fatal: the verification step was already processed.
    console.error(
      `[VERIFICATION-WEBHOOK] ComplianceCase event failed for user ${userId}:`,
      ccErr instanceof Error ? ccErr.message : String(ccErr),
    );
  }

  return NextResponse.json({
    received: true,
    action: "processed",
    webhookId,
    userId,
    stepId,
    outcome,
    caseStatus: result.case.status,
  });
}
