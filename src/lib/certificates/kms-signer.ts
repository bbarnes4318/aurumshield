/* ================================================================
   KMS CERTIFICATE SIGNER
   ================================================================

   Signs clearing-certificate digests using AWS KMS asymmetric keys.
   Algorithm: RSASSA_PKCS1_V1_5_SHA_256

   Environment:
     KMS_CERTIFICATE_KEY_ID — KMS key alias or ARN
                              (unset → mock mode, deterministic hex signature)

   Mock-safe: When no KMS key is configured, returns a deterministic
   signature derived from SHA-256 of the input. This lets the entire
   certificate pipeline compile, render, and test without AWS infra.
   ================================================================ */

import { toHex } from "./canonicalize";

/* ---------- Result type ---------- */

export interface KmsSignResult {
  /** Base-64–encoded asymmetric signature */
  signature: string;
  /** Algorithm used (e.g. RSASSA_PKCS1_V1_5_SHA_256) */
  signatureAlg: string;
  /** KMS key ID or alias used to sign */
  kmsKeyId: string;
  /** ISO-8601 timestamp of signing */
  signedAt: string;
}

/* ---------- KMS Key ID ---------- */

const KMS_KEY_ID = process.env.KMS_CERTIFICATE_KEY_ID ?? "";

/* ---------- Sign ---------- */

/**
 * Sign a SHA-256 digest using AWS KMS.
 *
 * @param digest — raw SHA-256 bytes of the canonical certificate string
 * @returns KmsSignResult with the signature and metadata
 */
export async function signCertificate(
  digest: Uint8Array,
): Promise<KmsSignResult> {
  const signedAt = new Date().toISOString();

  // ── Mock mode: no KMS key configured ──
  if (!KMS_KEY_ID) {
    const mockSig = `MOCK_KMS_SIG:${toHex(digest)}`;
    return {
      signature: Buffer.from(mockSig).toString("base64"),
      signatureAlg: "MOCK_SHA256_HEX",
      kmsKeyId: "mock-key-not-configured",
      signedAt,
    };
  }

  // ── Real KMS signing ──
  const { KMSClient, SignCommand } = await import("@aws-sdk/client-kms");

  const kms = new KMSClient({
    region: process.env.AWS_REGION ?? "us-east-1",
  });

  const command = new SignCommand({
    KeyId: KMS_KEY_ID,
    Message: digest,
    MessageType: "DIGEST",
    SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
  });

  const response = await kms.send(command);

  if (!response.Signature) {
    throw new Error("KMS_SIGN_FAILURE: SignCommand returned no Signature");
  }

  return {
    signature: Buffer.from(response.Signature).toString("base64"),
    signatureAlg: "RSASSA_PKCS1_V1_5_SHA_256",
    kmsKeyId: KMS_KEY_ID,
    signedAt,
  };
}

/* ---------- Verify ---------- */

export interface KmsVerifyResult {
  valid: boolean;
  verifiedAt: string;
}

/**
 * Verify a signature against a digest using AWS KMS.
 *
 * @param digest — raw SHA-256 bytes of the canonical certificate string
 * @param signatureBase64 — the base-64 signature returned by signCertificate
 * @returns KmsVerifyResult
 */
export async function verifyCertificateSignature(
  digest: Uint8Array,
  signatureBase64: string,
): Promise<KmsVerifyResult> {
  const verifiedAt = new Date().toISOString();

  // ── Mock mode ──
  if (!KMS_KEY_ID) {
    const expectedMockSig = `MOCK_KMS_SIG:${toHex(digest)}`;
    const expectedB64 = Buffer.from(expectedMockSig).toString("base64");
    return {
      valid: signatureBase64 === expectedB64,
      verifiedAt,
    };
  }

  // ── Real KMS verification ──
  const { KMSClient, VerifyCommand } = await import("@aws-sdk/client-kms");

  const kms = new KMSClient({
    region: process.env.AWS_REGION ?? "us-east-1",
  });

  const command = new VerifyCommand({
    KeyId: KMS_KEY_ID,
    Message: digest,
    MessageType: "DIGEST",
    Signature: Buffer.from(signatureBase64, "base64"),
    SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
  });

  try {
    const response = await kms.send(command);
    return {
      valid: response.SignatureValid === true,
      verifiedAt,
    };
  } catch (err) {
    console.error("[KMS] VerifyCommand failed:", err);
    return {
      valid: false,
      verifiedAt,
    };
  }
}
