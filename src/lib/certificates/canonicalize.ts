/* ================================================================
   CERTIFICATE CANONICALIZATION — Shared digest helpers
   ================================================================

   Re-exports the canonical serializer from certificate-engine and adds
   a composable `canonicalDigest()` that returns a raw SHA-256 Buffer.
   This digest is what AWS KMS signs / verifies.
   ================================================================ */

export { canonicalSerializeCertificatePayload } from "@/lib/certificate-engine";

/**
 * Compute the SHA-256 digest of a canonical certificate string.
 * Returns a raw `Uint8Array` suitable for passing to AWS KMS
 * `SignCommand` / `VerifyCommand`.
 *
 * Uses the Web Crypto API — works in both Node (≥18) and edge runtimes.
 */
export async function canonicalDigest(canonical: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Hex-encode a Uint8Array for display / logging.
 */
export function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
