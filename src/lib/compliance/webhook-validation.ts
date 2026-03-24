/* ================================================================
   WEBHOOK SIGNATURE VALIDATION — HMAC-SHA256 Verification
   ================================================================
   Phase WS5.3: Shared cryptographic webhook validation utility.

   Provides fail-closed HMAC-SHA256 signature verification for
   incoming compliance provider webhooks (Veriff, iDenfy, etc.).

   SECURITY MODEL:
     - Signature validation MUST occur BEFORE payload parsing
     - Invalid or missing signatures → immediate reject
     - Timing-safe comparison to prevent timing attacks
     - All rejections are logged via audit trail

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface WebhookValidationResult {
  valid: boolean;
  provider: string;
  reason: string;
  receivedAt: string;
}

// ─── HMAC-SHA256 VALIDATION ────────────────────────────────────────────────────

/**
 * Validate an HMAC-SHA256 webhook signature.
 *
 * SECURITY INVARIANTS:
 *   1. Fail-closed: returns { valid: false } on any error
 *   2. Uses timing-safe comparison to prevent timing attacks
 *   3. Validates both header presence and cryptographic correctness
 *
 * @param rawBody         - The raw request body as a string or Buffer
 * @param signatureHeader - The signature from the request header
 * @param secret          - The shared webhook secret
 * @param provider        - The provider name (for logging)
 * @param algorithm       - Hash algorithm (default: sha256)
 * @returns WebhookValidationResult
 */
export function validateWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
  provider: string,
  algorithm: string = "sha256",
): WebhookValidationResult {
  const receivedAt = new Date().toISOString();

  // Guard: missing signature header
  if (!signatureHeader) {
    console.error(
      `[WEBHOOK_VALIDATION] ⛔ REJECTED: ${provider} webhook — missing signature header`,
    );
    return {
      valid: false,
      provider,
      reason: "MISSING_SIGNATURE_HEADER",
      receivedAt,
    };
  }

  // Guard: missing secret
  if (!secret) {
    console.error(
      `[WEBHOOK_VALIDATION] ⛔ REJECTED: ${provider} webhook — secret not configured`,
    );
    return {
      valid: false,
      provider,
      reason: "SECRET_NOT_CONFIGURED",
      receivedAt,
    };
  }

  try {
    // Compute expected HMAC
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    const expectedSignature = createHmac(algorithm, secret)
      .update(body)
      .digest("hex");

    // Normalize: strip any "sha256=" prefix (Veriff uses this format)
    const normalizedReceived = signatureHeader.replace(/^sha256=/, "").toLowerCase();
    const normalizedExpected = expectedSignature.toLowerCase();

    // Timing-safe comparison
    const receivedBuf = Buffer.from(normalizedReceived, "utf-8");
    const expectedBuf = Buffer.from(normalizedExpected, "utf-8");

    if (receivedBuf.length !== expectedBuf.length) {
      console.error(
        `[WEBHOOK_VALIDATION] ⛔ REJECTED: ${provider} webhook — ` +
          `signature length mismatch (received=${receivedBuf.length}, expected=${expectedBuf.length})`,
      );
      return {
        valid: false,
        provider,
        reason: "SIGNATURE_LENGTH_MISMATCH",
        receivedAt,
      };
    }

    const isValid = timingSafeEqual(receivedBuf, expectedBuf);

    if (!isValid) {
      console.error(
        `[WEBHOOK_VALIDATION] ⛔ REJECTED: ${provider} webhook — signature mismatch`,
      );
      return {
        valid: false,
        provider,
        reason: "SIGNATURE_MISMATCH",
        receivedAt,
      };
    }

    console.log(
      `[WEBHOOK_VALIDATION] ✅ ACCEPTED: ${provider} webhook — signature valid`,
    );
    return {
      valid: true,
      provider,
      reason: "SIGNATURE_VALID",
      receivedAt,
    };
  } catch (err) {
    // Fail-closed: any crypto error → reject
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[WEBHOOK_VALIDATION] ⛔ REJECTED: ${provider} webhook — crypto error: ${message}`,
    );
    return {
      valid: false,
      provider,
      reason: `CRYPTO_ERROR: ${message}`,
      receivedAt,
    };
  }
}

// ─── PROVIDER-SPECIFIC HELPERS ─────────────────────────────────────────────────

/**
 * Validate a Veriff webhook signature.
 *
 * Veriff sends the HMAC-SHA256 signature in the `x-hmac-signature` header.
 * The secret is the VERIFF_WEBHOOK_SECRET env variable.
 */
export function validateVeriffWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
): WebhookValidationResult {
  const secret = process.env.VERIFF_WEBHOOK_SECRET;
  if (!secret) {
    return {
      valid: false,
      provider: "VERIFF",
      reason: "VERIFF_WEBHOOK_SECRET not configured",
      receivedAt: new Date().toISOString(),
    };
  }
  return validateWebhookSignature(rawBody, signatureHeader, secret, "VERIFF");
}

/**
 * Validate an iDenfy webhook signature.
 *
 * iDenfy sends the HMAC-SHA256 signature in the `idenfy-signature` header.
 * The secret is the IDENFY_WEBHOOK_SECRET env variable.
 */
export function validateIdenfyWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
): WebhookValidationResult {
  const secret = process.env.IDENFY_WEBHOOK_SECRET;
  if (!secret) {
    return {
      valid: false,
      provider: "IDENFY",
      reason: "IDENFY_WEBHOOK_SECRET not configured",
      receivedAt: new Date().toISOString(),
    };
  }
  return validateWebhookSignature(rawBody, signatureHeader, secret, "IDENFY");
}
