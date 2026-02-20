/* ================================================================
   MODERN TREASURY WEBHOOK SIGNATURE VERIFICATION
   Uses HMAC-SHA256 with timing-safe comparison.
   Zero external dependencies — Node built-in crypto only.
   ================================================================ */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Modern Treasury webhook signature.
 *
 * Modern Treasury signs the raw request body with HMAC-SHA256 using
 * the webhook secret key, and sends the hex-encoded digest in the
 * `X-Signature` header.
 *
 * @param rawBody   - The raw request body string (must match exactly what MT signed)
 * @param signature - The value of the `X-Signature` header from the request
 * @param secret    - The `MODERN_TREASURY_WEBHOOK_KEY` from environment variables
 * @returns `true` if the signature is valid, `false` otherwise
 */
export function verifyModernTreasurySignature(
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
