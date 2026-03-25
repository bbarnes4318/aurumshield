/* ================================================================
   IDENFY WEBHOOK HANDLER — Result Retrieval & Normalization
   ================================================================
   Phase WS5.4: Processes incoming iDenfy verification results
   via webhook callback, normalizes them into internal compliance
   check records.

   IDENFY WEBHOOK PAYLOAD (per iDenfy docs):
     POST to configured callback URL with JSON body containing:
       - clientId: string (our userId)
       - scanRef: string (session reference)
       - status: { overall: "APPROVED" | "DENIED" | "SUSPECTED" | "REVIEWING" }
       - data: { docFirstName, docLastName, docNumber, ... }
       - fileUrls: { ... }
       - AML: { ... }

   NORMALIZATION MAPPING:
     APPROVED  → normalizedVerdict: PASS, resultCode: VERIFIED
     DENIED    → normalizedVerdict: FAIL, resultCode: DENIED
     SUSPECTED → normalizedVerdict: REVIEW, resultCode: SUSPECTED
     REVIEWING → no action (still in progress)
     EXPIRED   → normalizedVerdict: EXPIRED, resultCode: SESSION_EXPIRED

   SECURITY:
     - HMAC signature validated BEFORE payload processing
     - Raw payload stored as reference, never consumed by business logic
     - Fail-closed: any parsing/validation error → reject

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import "server-only";

import { eq, and } from "drizzle-orm";
import { coChecks } from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { validateIdenfyWebhook } from "./webhook-validation";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type IdenfyOverallStatus =
  | "APPROVED"
  | "DENIED"
  | "SUSPECTED"
  | "REVIEWING"
  | "EXPIRED"
  | "ACTIVE";

export interface IdenfyWebhookPayload {
  clientId: string;
  scanRef: string;
  status: {
    overall: IdenfyOverallStatus;
    suspicionReasons?: string[];
    denialReasons?: string[];
    autoDocument?: string;
    autoFace?: string;
    manualDocument?: string;
    manualFace?: string;
  };
  data?: {
    docFirstName?: string;
    docLastName?: string;
    docNumber?: string;
    docExpiry?: string;
    docIssuingCountry?: string;
    docType?: string;
    nationality?: string;
    birthDate?: string;
    address?: string;
    selectedCountry?: string;
  };
  AML?: {
    status?: {
      serviceSuspected?: boolean;
      checkSuccessful?: boolean;
      serviceFound?: boolean;
      serviceUsed?: boolean;
      overallStatus?: string;
    };
    data?: unknown[];
    serviceName?: string;
    serviceGroupType?: string;
    uid?: string;
    errorMessage?: string | null;
  }[];
  fileUrls?: Record<string, string>;
}

export interface IdenfyProcessResult {
  accepted: boolean;
  scanRef: string;
  clientId: string;
  overallStatus: IdenfyOverallStatus;
  normalizedVerdict: "PASS" | "FAIL" | "REVIEW" | "EXPIRED" | null;
  resultCode: string;
  checkUpdated: boolean;
  reason: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class IdenfyWebhookAuthError extends Error {
  constructor(reason: string) {
    super(`IDENFY_WEBHOOK_AUTH_FAILED: ${reason}`);
    this.name = "IdenfyWebhookAuthError";
  }
}

export class IdenfyWebhookParseError extends Error {
  constructor(detail: string) {
    super(`IDENFY_WEBHOOK_PARSE_ERROR: ${detail}`);
    this.name = "IdenfyWebhookParseError";
  }
}

// ─── NORMALIZATION MAP ─────────────────────────────────────────────────────────

function normalizeIdenfyStatus(
  overall: IdenfyOverallStatus,
): { verdict: "PASS" | "FAIL" | "REVIEW" | "EXPIRED" | null; resultCode: string } {
  switch (overall) {
    case "APPROVED":
      return { verdict: "PASS", resultCode: "VERIFIED" };
    case "DENIED":
      return { verdict: "FAIL", resultCode: "DENIED" };
    case "SUSPECTED":
      return { verdict: "REVIEW", resultCode: "SUSPECTED" };
    case "EXPIRED":
      return { verdict: "EXPIRED", resultCode: "SESSION_EXPIRED" };
    case "REVIEWING":
    case "ACTIVE":
      // Still in progress — no verdict yet
      return { verdict: null, resultCode: "IN_PROGRESS" };
    default:
      return { verdict: null, resultCode: "UNKNOWN_STATUS" };
  }
}

// ─── WEBHOOK HANDLER ───────────────────────────────────────────────────────────

/**
 * Process an incoming iDenfy webhook callback.
 *
 * PIPELINE:
 *   1. Validate HMAC signature (if IDENFY_WEBHOOK_SECRET configured)
 *   2. Parse and validate payload structure
 *   3. Map iDenfy status to normalized verdict
 *   4. Update matching co_checks record
 *   5. Log audit event
 *
 * @param rawBody         - Raw request body (unparsed)
 * @param signatureHeader - Value of the `idenfy-signature` header
 * @param payload         - Parsed webhook JSON payload
 * @param userId          - System actor (e.g., "webhook-idenfy")
 * @returns IdenfyProcessResult with normalized outcome
 *
 * @throws IdenfyWebhookAuthError if signature validation fails
 * @throws IdenfyWebhookParseError if payload is malformed
 */
export async function processIdenfyWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  payload: IdenfyWebhookPayload,
  userId: string = "webhook-idenfy",
): Promise<IdenfyProcessResult> {
  // ── Step 1: HMAC Signature Validation ──

  const validation = validateIdenfyWebhook(rawBody, signatureHeader);
  if (!validation.valid) {
    // If secret is configured and validation fails → reject
    if (process.env.IDENFY_WEBHOOK_SECRET) {
      console.error(
        `[IDENFY_WEBHOOK] ⛔ AUTH FAILED: ${validation.reason}`,
      );
      throw new IdenfyWebhookAuthError(validation.reason);
    }
    // If secret is NOT configured, warn but continue (dev mode)
    console.warn(
      `[IDENFY_WEBHOOK] ⚠️ IDENFY_WEBHOOK_SECRET not configured — ` +
        `accepting webhook without signature validation`,
    );
  }

  // ── Step 2: Validate Payload ──

  if (!payload.scanRef || !payload.clientId || !payload.status?.overall) {
    throw new IdenfyWebhookParseError(
      `Missing required fields: scanRef=${payload.scanRef}, ` +
        `clientId=${payload.clientId}, status=${payload.status?.overall}`,
    );
  }

  const { scanRef, clientId } = payload;
  const overallStatus = payload.status.overall;

  // ── Step 3: Normalize ──

  const { verdict, resultCode } = normalizeIdenfyStatus(overallStatus);

  // If still in progress, acknowledge but don't update
  if (verdict === null) {
    console.log(
      `[IDENFY_WEBHOOK] ℹ️ Session ${scanRef} still ${overallStatus} — no verdict yet`,
    );
    return {
      accepted: true,
      scanRef,
      clientId,
      overallStatus,
      normalizedVerdict: null,
      resultCode,
      checkUpdated: false,
      reason: `Status ${overallStatus} is not a terminal state — awaiting final result.`,
    };
  }

  // ── Step 4: Update co_checks Record ──

  const db = await getDb();

  // Find the matching check by provider reference (scanRef)
  const [existingCheck] = await db
    .select()
    .from(coChecks)
    .where(
      and(
        eq(coChecks.provider, "iDenfy"),
        eq(coChecks.rawPayloadRef, scanRef),
      ),
    )
    .limit(1);

  let checkUpdated = false;

  if (existingCheck) {
    // CONCURRENCY: Idempotent webhook processing — only update if check
    // is NOT already COMPLETED. Prevents duplicate webhook deliveries from
    // overwriting a finalized check or generating duplicate audit events.
    if (existingCheck.status === "COMPLETED" && existingCheck.normalizedVerdict !== null) {
      console.log(
        `[IDENFY_WEBHOOK] ♻️ IDEMPOTENT: Check ${existingCheck.id} already COMPLETED ` +
          `(verdict=${existingCheck.normalizedVerdict}). Skipping duplicate webhook.`,
      );

      return {
        accepted: true,
        scanRef,
        clientId,
        overallStatus,
        normalizedVerdict: verdict,
        resultCode,
        checkUpdated: false,
        reason: `Check already COMPLETED with verdict=${existingCheck.normalizedVerdict}. Duplicate webhook ignored.`,
      };
    }

    await db
      .update(coChecks)
      .set({
        status: "COMPLETED",
        normalizedVerdict: verdict,
        resultCode,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(coChecks.id, existingCheck.id));

    checkUpdated = true;

    console.log(
      `[IDENFY_WEBHOOK] ✅ Check updated: check=${existingCheck.id}, ` +
        `scanRef=${scanRef}, verdict=${verdict}, resultCode=${resultCode}`,
    );
  } else {
    console.warn(
      `[IDENFY_WEBHOOK] ⚠️ No matching co_checks record for scanRef=${scanRef} — ` +
        `result received but no check to update. clientId=${clientId}`,
    );
  }

  // ── Step 5: Audit Event ──

  await appendEvent(
    "COMPLIANCE_CHECK",
    existingCheck?.id ?? scanRef,
    "IDENFY_RESULT_RECEIVED",
    {
      scanRef,
      clientId,
      overallStatus,
      normalizedVerdict: verdict,
      resultCode,
      checkUpdated,
      checkId: existingCheck?.id ?? null,
      suspicionReasons: payload.status.suspicionReasons ?? [],
      denialReasons: payload.status.denialReasons ?? [],
      amlServiceUsed: payload.AML?.[0]?.status?.serviceUsed ?? false,
      amlServiceSuspected: payload.AML?.[0]?.status?.serviceSuspected ?? false,
    },
    userId,
  );

  return {
    accepted: true,
    scanRef,
    clientId,
    overallStatus,
    normalizedVerdict: verdict,
    resultCode,
    checkUpdated,
    reason: `iDenfy result processed: ${overallStatus} → ${verdict}/${resultCode}`,
  };
}
