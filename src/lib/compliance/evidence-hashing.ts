/* ================================================================
   EVIDENCE HASHING — Cryptographic Hash Utility
   ================================================================
   Deterministic SHA-256 hashing for compliance evidence payloads.
   Handles both structured JSON objects and raw binary buffers
   (Assay Certificates, Brink's manifests, chain-of-custody docs).

   Canonicalization:
     JSON payloads are sorted by key recursively before hashing
     to guarantee deterministic output regardless of property
     insertion order. This is critical for hash chain verification.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";

// ─── CANONICALIZATION ──────────────────────────────────────────────────────────

/**
 * Recursively sort object keys to produce a canonical JSON string.
 * Arrays preserve insertion order (positional semantics).
 * Null, undefined, and primitive values pass through unchanged.
 */
function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  // Sort keys lexicographically and recurse
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Generate a SHA-256 evidence hash.
 *
 * @param payload - A JSON-serializable object OR a raw Buffer
 *                  (for binary evidence like PDF certificates)
 * @returns Hex-encoded SHA-256 hash string (64 characters)
 *
 * @example
 *   // Structured payload
 *   generateEvidenceHash({ assayId: "LOT-001", fineness: 0.9995 })
 *
 *   // Binary evidence (Assay certificate PDF)
 *   const pdfBuffer = fs.readFileSync("/path/to/assay-cert.pdf");
 *   generateEvidenceHash(pdfBuffer)
 */
export function generateEvidenceHash(payload: unknown | Buffer): string {
  const hash = createHash("sha256");

  if (Buffer.isBuffer(payload)) {
    hash.update(payload);
  } else {
    const canonical = canonicalize(payload);
    const serialized = JSON.stringify(canonical);
    hash.update(serialized, "utf-8");
  }

  return hash.digest("hex");
}

/**
 * Generate a chained evidence hash.
 *
 * Combines the current payload hash with the previous event's hash
 * to form a tamper-evident chain. If previousHash is null (genesis
 * event), only the payload hash is used.
 *
 * @param payload     - The event payload to hash
 * @param previousHash - The hash of the preceding event (null for genesis)
 * @returns Hex-encoded SHA-256 hash string (64 characters)
 */
export function generateChainedHash(
  payload: unknown | Buffer,
  previousHash: string | null,
): string {
  const payloadHash = generateEvidenceHash(payload);

  if (!previousHash) {
    // Genesis event: hash the payload hash itself for consistency
    return createHash("sha256")
      .update(`GENESIS:${payloadHash}`, "utf-8")
      .digest("hex");
  }

  // Chain: H(previousHash + payloadHash)
  return createHash("sha256")
    .update(`${previousHash}:${payloadHash}`, "utf-8")
    .digest("hex");
}
