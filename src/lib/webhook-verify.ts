/* ================================================================
   COLUMN BANK WEBHOOK SIGNATURE VERIFICATION
   Uses HMAC-SHA256 with timing-safe comparison.
   Zero external dependencies — Node built-in crypto only.
   ================================================================ */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Column Bank webhook signature.
 *
 * Column Bank signs the raw request body with HMAC-SHA256 using
 * the webhook secret key, and sends the hex-encoded digest in the
 * request header.
 *
 * @param rawBody   - The raw request body string (must match exactly what was signed)
 * @param signature - The value of the signature header from the request
 * @param secret    - The `COLUMN_WEBHOOK_SECRET` from environment variables
 * @returns `true` if the signature is valid, `false` otherwise
 */
export function verifyBankingWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !signature || !secret) return false;

  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
