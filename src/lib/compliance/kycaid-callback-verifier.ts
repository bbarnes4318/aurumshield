/* ================================================================
   KYCAID CALLBACK SIGNATURE VERIFIER
   ================================================================
   Verifies the HMAC-SHA512 signature on KYCaid webhook callbacks
   per https://docs-v1.kycaid.com/#verify-callback

   Algorithm:
     1. Base64-encode the raw request body
     2. Compute HMAC-SHA512 of the Base64 string using the API token
     3. Compare result with `x-data-integrity` header (timing-safe)

   Fail-closed: returns false on any error, missing input, or
   length mismatch. Never silently accepts.
   ================================================================ */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a KYCaid callback signature.
 *
 * @param rawBody - The raw request body as a string (NOT parsed JSON)
 * @param integrityHeader - The value of the `x-data-integrity` header
 * @param apiToken - The KYCaid API token used as HMAC secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyKycaidCallbackSignature(
  rawBody: string,
  integrityHeader: string,
  apiToken: string,
): boolean {
  if (!rawBody || !integrityHeader || !apiToken) return false;

  try {
    // Step 1: Base64-encode the raw body
    const base64Body = Buffer.from(rawBody, "utf-8").toString("base64");

    // Step 2: HMAC-SHA512 of the Base64 string using API token as key
    const computed = createHmac("sha512", apiToken)
      .update(base64Body)
      .digest("hex");

    // Step 3: Timing-safe comparison
    const expectedBuffer = Buffer.from(integrityHeader, "utf-8");
    const computedBuffer = Buffer.from(computed, "utf-8");

    if (expectedBuffer.length !== computedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, computedBuffer);
  } catch {
    return false;
  }
}
