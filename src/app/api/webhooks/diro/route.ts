/* ================================================================
   DIRO.IO WEBHOOK INGESTION ROUTE
   POST /api/webhooks/diro

   Receives verified bank account payloads from Diro's Open Banking
   API after a seller completes institutional bank verification.

   Flow:
   1. Verify HMAC signature (DIRO_WEBHOOK_SECRET)
   2. Zod-validate the payload
   3. Extract accountName, routingNumber, accountNumber
   4. Pass directly to registerSellerBank (Modern Treasury)
   5. Return the counterparty_id — raw bank data is NEVER stored

   Architectural rules:
   - Raw routing/account numbers exist only in-flight during this
     request and are discarded after the MT API call completes
   - Actor attribution: source "diro-webhook"
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { registerSellerBank } from "@/actions/onboarding";

/* ---------- HMAC Signature Verification ---------- */

/**
 * Verify a Diro webhook signature using HMAC-SHA256.
 * Diro signs the raw body and sends the hex digest in `X-Diro-Signature`.
 */
function verifyDiroSignature(
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

/* ---------- Zod Schema: Diro Verified Bank Payload ---------- */

/**
 * Diro returns a verified JSON payload after the seller completes
 * their Open Banking login. We extract only what we need:
 *
 * - accountName:    legal name on the bank account
 * - routingNumber:  ABA routing number (9 digits)
 * - accountNumber:  bank account number (4–17 digits)
 * - sellerUserId:   AurumShield user ID (passed through as metadata)
 */
const DiroVerifiedAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, "ABA routing number must be exactly 9 digits"),
  accountNumber: z
    .string()
    .regex(/^\d{4,17}$/, "Account number must be 4–17 digits"),
});

const DiroWebhookPayloadSchema = z.object({
  event: z.literal("bank_account.verified"),
  verificationId: z.string().min(1),
  sellerUserId: z.string().min(1, "sellerUserId is required"),
  verifiedAccount: DiroVerifiedAccountSchema,
});

type DiroWebhookPayload = z.infer<typeof DiroWebhookPayloadSchema>;

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  /* ── Step 1: Read raw body + signature header ── */
  const rawBody = await request.text();
  const signature = request.headers.get("X-Diro-Signature") ?? "";

  /* ── Step 2: Signature verification ── */
  const webhookSecret = process.env.DIRO_WEBHOOK_SECRET;

  if (webhookSecret) {
    // In production: enforce signature verification
    if (!verifyDiroSignature(rawBody, signature, webhookSecret)) {
      console.warn("[DIRO-WEBHOOK] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    // In demo mode: log warning but allow through
    console.warn(
      "[DIRO-WEBHOOK] DIRO_WEBHOOK_SECRET not set — signature verification skipped (demo mode)",
    );
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

  const validation = DiroWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[DIRO-WEBHOOK] Payload validation failed:",
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

  const payload: DiroWebhookPayload = validation.data;
  const { verifiedAccount, sellerUserId, verificationId } = payload;

  console.log(
    `[DIRO-WEBHOOK] Processing verified bank account for seller ${sellerUserId} (verificationId=${verificationId})`,
  );

  /* ── Step 4: Hand off to Modern Treasury via registerSellerBank ── */
  // The raw routingNumber and accountNumber are passed directly to MT
  // and are NEVER stored in our database or logs.
  const result = await registerSellerBank(
    verifiedAccount.accountName,
    verifiedAccount.routingNumber,
    verifiedAccount.accountNumber,
  );

  if (!result.success) {
    console.error(
      `[DIRO-WEBHOOK] Modern Treasury counterparty creation failed for seller ${sellerUserId}:`,
      result.error,
    );
    return NextResponse.json(
      {
        received: true,
        action: "failed",
        error: result.error,
        sellerUserId,
      },
      { status: 502 },
    );
  }

  // TODO: Persist the counterpartyId to the seller's user profile in RDS
  // once the database is provisioned. For now, we log it for audit.
  console.log(
    `[DIRO-WEBHOOK] Counterparty ${result.counterpartyId} created for seller ${sellerUserId} via Diro verification ${verificationId}`,
  );

  /* ── Step 5: Respond — raw bank data is now discarded from memory ── */
  return NextResponse.json({
    received: true,
    action: "counterparty_created",
    counterpartyId: result.counterpartyId,
    sellerUserId,
    verificationId,
  });
}
