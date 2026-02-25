/* ================================================================
   CERTIFICATE VERIFICATION API
   POST /api/certificates/:id/verify

   Verifies the digital signature of a clearing certificate.
   
   - With KMS: Uses AWS KMS VerifyCommand against the stored signature
   - Without KMS (mock): Re-hashes the canonical payload and compares
   
   Returns:
     { valid: boolean, certificateNumber: string, verifiedAt: string }
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import {
  getCertificateByNumber,
  canonicalSerializeCertificatePayload,
} from "@/lib/certificate-engine";
import type { ClearingCertificate } from "@/lib/certificate-engine";
import { canonicalDigest } from "@/lib/certificates/canonicalize";
import { verifyCertificateSignature } from "@/lib/certificates/kms-signer";

/* ---------- GET — Verify by certificate ID in URL ---------- */

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Load certificate ──
  const cert = getCertificateByNumber(id);
  if (!cert) {
    return NextResponse.json(
      { error: "Certificate not found", certificateNumber: id },
      { status: 404 },
    );
  }

  // ── Build canonical payload (exclude signatureHash and KMS fields) ──
  const payloadForSigning: Omit<ClearingCertificate, "signatureHash" | "kmsSignature" | "signatureAlg" | "kmsKeyId" | "signedAt"> = {
    certificateNumber: cert.certificateNumber,
    issuedAt: cert.issuedAt,
    settlementId: cert.settlementId,
    orderId: cert.orderId,
    listingId: cert.listingId,
    buyerUserId: cert.buyerUserId,
    sellerUserId: cert.sellerUserId,
    buyerOrgId: cert.buyerOrgId,
    sellerOrgId: cert.sellerOrgId,
    asset: cert.asset,
    economics: cert.economics,
    rail: cert.rail,
    corridorId: cert.corridorId,
    settlementHubId: cert.settlementHubId,
    vaultHubId: cert.vaultHubId,
    dvpLedgerEntryId: cert.dvpLedgerEntryId,
  };

  const canonical = canonicalSerializeCertificatePayload(payloadForSigning);

  // ── KMS signature verification path ──
  if (cert.kmsSignature) {
    try {
      const digest = await canonicalDigest(canonical);
      const result = await verifyCertificateSignature(digest, cert.kmsSignature);
      return NextResponse.json({
        valid: result.valid,
        certificateNumber: cert.certificateNumber,
        verifiedAt: result.verifiedAt,
        signatureAlg: cert.signatureAlg,
        kmsKeyId: cert.kmsKeyId,
        signedAt: cert.signedAt,
      });
    } catch (err) {
      console.error("[CERT-VERIFY] KMS verification error:", err);
      return NextResponse.json(
        {
          valid: false,
          certificateNumber: cert.certificateNumber,
          verifiedAt: new Date().toISOString(),
          error: "Signature verification failed",
        },
        { status: 500 },
      );
    }
  }

  // ── Fallback: SHA-256 hash comparison (pre-KMS certificates) ──
  const { sha256Hex } = await import("@/lib/certificate-engine");
  const recomputedHash = await sha256Hex(canonical);
  const valid = recomputedHash === cert.signatureHash;

  return NextResponse.json({
    valid,
    certificateNumber: cert.certificateNumber,
    verifiedAt: new Date().toISOString(),
    signatureAlg: "SHA-256 (legacy hash comparison)",
    note: "This certificate was issued before KMS signing was enabled. Verification uses SHA-256 hash comparison.",
  });
}
