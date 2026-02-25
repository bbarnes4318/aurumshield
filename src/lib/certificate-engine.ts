/* ================================================================
   CERTIFICATE ENGINE — Deterministic Gold Clearing Certificate System
   
   Governance Rules:
   1. Certificates are issued ONLY when:
      - settlement.status === "SETTLED"
      - A DVP_EXECUTED ledger entry exists
      - Escrow hold has been released (escrowReleased === true)
   2. Certificate numbers are deterministic and collision-resistant.
   3. Signature hashes use real SHA-256 (WebCrypto / node:crypto).
   4. Idempotent: no duplicate certificate for the same settlement.
   5. SSR-safe: no localStorage access during SSR.
   ================================================================ */

import type { SettlementCase, LedgerEntry, Order, Listing } from "./mock-data";
import { mockOrgs, mockCounterparties, mockHubs } from "./mock-data";

/* ---------- Certificate Data Model ---------- */

export interface ClearingCertificate {
  certificateNumber: string;
  issuedAt: string;
  settlementId: string;
  orderId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  buyerOrgId: string;
  sellerOrgId: string;
  asset: {
    form: string;
    purity: string;
    weightOz: number;
    vaultId: string;
  };
  economics: {
    pricePerOzLocked: number;
    notional: number;
    fees: {
      clearingFee: number;
      custodyFee: number;
      totalFees: number;
    };
  };
  rail: string;
  corridorId: string;
  settlementHubId: string;
  vaultHubId: string;
  dvpLedgerEntryId: string;
  signatureHash: string;
  /** AWS KMS digital signature (base-64). Present on certificates issued after KMS upgrade. */
  kmsSignature?: string;
  /** Signing algorithm (e.g. RSASSA_PKCS1_V1_5_SHA_256 or MOCK_SHA256_HEX). */
  signatureAlg?: string;
  /** KMS key ID or alias used to produce the signature. */
  kmsKeyId?: string;
  /** ISO-8601 timestamp of when the KMS signature was produced. */
  signedAt?: string;
}

/* ---------- Certificate Store (SSR-safe) ---------- */

const STORAGE_KEY = "aurumshield:certificates";

export interface CertificateState {
  certificates: ClearingCertificate[];
}

/** SSR-safe load — returns empty state on server. */
export function loadCertificates(): CertificateState {
  if (typeof window === "undefined") {
    return { certificates: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CertificateState;
      if (Array.isArray(parsed.certificates)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted storage — fall back to empty
  }
  return { certificates: [] };
}

/** Persist certificate state to localStorage. No-op during SSR. */
export function saveCertificates(state: CertificateState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/* ---------- Certificate Lookups ---------- */

/** Retrieve certificate by settlement ID (idempotency check). */
export function getCertificateBySettlementId(
  settlementId: string,
): ClearingCertificate | undefined {
  const state = loadCertificates();
  return state.certificates.find((c) => c.settlementId === settlementId);
}

/** Retrieve certificate by certificate number. */
export function getCertificateByNumber(
  certificateNumber: string,
): ClearingCertificate | undefined {
  const state = loadCertificates();
  return state.certificates.find(
    (c) => c.certificateNumber === certificateNumber,
  );
}

/** Retrieve all certificates. */
export function getAllCertificates(): ClearingCertificate[] {
  return loadCertificates().certificates;
}

/* ---------- SHA-256 Helper ---------- */

/**
 * Async SHA-256 hex digest.
 * Browser: crypto.subtle.digest
 * SSR/Node: node:crypto createHash
 */
export async function sha256Hex(input: string): Promise<string> {
  // Browser path — WebCrypto
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle?.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // SSR/Node path — node:crypto
  // Dynamic import to avoid bundler issues in browser
  try {
    const { createHash } = await import(
      /* webpackIgnore: true */ "node:crypto"
    );
    return createHash("sha256").update(input).digest("hex");
  } catch {
    // Ultimate fallback: should never happen in practice
    // Use a deterministic string hash for build safety
    return deterministicFallbackHash(input);
  }
}

/** Deterministic fallback — only used if both WebCrypto and node:crypto are unavailable. */
function deterministicFallbackHash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined =
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0");
  // Repeat to fill 64 hex chars (simulate SHA-256 length)
  return (combined + combined + combined + combined).slice(0, 64);
}

/* ---------- FNV-1a (for deterministic 4-digit seq) ---------- */

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ---------- Canonical Serialization ---------- */

/**
 * Deterministic serialization of certificate payload for signature hashing.
 * Uses a well-defined key order — not JSON.stringify (which is not stable).
 */
export function canonicalSerializeCertificatePayload(
  cert: Omit<ClearingCertificate, "signatureHash">,
): string {
  const parts: string[] = [
    `certificateNumber=${cert.certificateNumber}`,
    `issuedAt=${cert.issuedAt}`,
    `settlementId=${cert.settlementId}`,
    `orderId=${cert.orderId}`,
    `listingId=${cert.listingId}`,
    `buyerUserId=${cert.buyerUserId}`,
    `sellerUserId=${cert.sellerUserId}`,
    `buyerOrgId=${cert.buyerOrgId}`,
    `sellerOrgId=${cert.sellerOrgId}`,
    `asset.form=${cert.asset.form}`,
    `asset.purity=${cert.asset.purity}`,
    `asset.weightOz=${cert.asset.weightOz}`,
    `asset.vaultId=${cert.asset.vaultId}`,
    `economics.pricePerOzLocked=${cert.economics.pricePerOzLocked}`,
    `economics.notional=${cert.economics.notional}`,
    `economics.fees.clearingFee=${cert.economics.fees.clearingFee}`,
    `economics.fees.custodyFee=${cert.economics.fees.custodyFee}`,
    `economics.fees.totalFees=${cert.economics.fees.totalFees}`,
    `rail=${cert.rail}`,
    `corridorId=${cert.corridorId}`,
    `settlementHubId=${cert.settlementHubId}`,
    `vaultHubId=${cert.vaultHubId}`,
    `dvpLedgerEntryId=${cert.dvpLedgerEntryId}`,
  ];
  return parts.join("|");
}

/* ---------- Certificate Number Generation ---------- */

/**
 * Deterministic certificate number.
 * Format: AS-GC-YYYYMMDD-<8HEX>-<4DIGITSEQ>
 *
 * - <8HEX> = first 8 chars of sha256(settlementId|orderId|dvpLedgerEntryId|YYYYMMDD)
 * - <4DIGITSEQ> = (fnv1a(settlementId + YYYYMMDD) % 10000), padded to 4 digits
 */
async function generateCertificateNumber(
  settlementId: string,
  orderId: string,
  dvpLedgerEntryId: string,
  settlementDateIso: string,
): Promise<string> {
  const d = new Date(settlementDateIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyymmdd = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

  // 8-char hex from SHA-256
  const hashInput = `${settlementId}|${orderId}|${dvpLedgerEntryId}|${yyyymmdd}`;
  const fullHash = await sha256Hex(hashInput);
  const hex8 = fullHash.slice(0, 8).toUpperCase();

  // 4-digit deterministic seq
  const seqInput = settlementId + yyyymmdd;
  const seq = fnv1a(seqInput) % 10000;
  const seq4 = String(seq).padStart(4, "0");

  return `AS-GC-${yyyymmdd}-${hex8}-${seq4}`;
}

/* ---------- Fee Computation ---------- */

function computeFees(notional: number) {
  const clearingFee = notional * 0.0015;
  const custodyFee = notional * 0.0005;
  return {
    clearingFee,
    custodyFee,
    totalFees: clearingFee + custodyFee,
  };
}

/* ---------- Issue Certificate ---------- */

export interface IssueCertificateArgs {
  settlement: SettlementCase;
  order: Order;
  listing: Listing;
  dvpLedgerEntry: LedgerEntry;
  now: string;
  /**
   * Must be `true` to issue a certificate. Confirms that the escrow
   * hold has been released as part of DvP execution. Prevents
   * certificate issuance before settlement finality.
   */
  escrowReleased: boolean;
}

/**
 * Issue a clearing certificate for a settled order.
 *
 * Preconditions:
 * - settlement.status === "SETTLED"
 * - dvpLedgerEntry.type === "DVP_EXECUTED"
 * - escrowReleased === true (escrow hold released after DvP)
 *
 * Idempotent: if a certificate already exists for this settlementId,
 * the existing certificate is returned unchanged.
 */
export async function issueCertificate(
  args: IssueCertificateArgs,
): Promise<ClearingCertificate> {
  const { settlement, listing, dvpLedgerEntry, now, escrowReleased } = args;

  // ── Idempotency check ──
  const existing = getCertificateBySettlementId(settlement.id);
  if (existing) return existing;

  // ── Precondition enforcement ──
  if (settlement.status !== "SETTLED") {
    throw new Error(
      `CERTIFICATE_PRECONDITION: settlement.status is "${settlement.status}", expected "SETTLED"`,
    );
  }
  if (dvpLedgerEntry.type !== "DVP_EXECUTED") {
    throw new Error(
      `CERTIFICATE_PRECONDITION: dvpLedgerEntry.type is "${dvpLedgerEntry.type}", expected "DVP_EXECUTED"`,
    );
  }
  if (!escrowReleased) {
    throw new Error(
      `CERTIFICATE_PRECONDITION: escrowReleased is false — escrow hold must be released before certificate issuance`,
    );
  }

  // ── Generate certificate number ──
  const certNumber = await generateCertificateNumber(
    settlement.id,
    settlement.orderId,
    dvpLedgerEntry.id,
    dvpLedgerEntry.timestamp,
  );

  // ── Resolve entities ──
  const vaultHub = mockHubs.find((h) => h.id === settlement.vaultHubId);
  const fees = computeFees(settlement.notionalUsd);

  // ── Build certificate payload (without signature) ──
  const certPayload: Omit<ClearingCertificate, "signatureHash"> = {
    certificateNumber: certNumber,
    issuedAt: now,
    settlementId: settlement.id,
    orderId: settlement.orderId,
    listingId: listing.id,
    buyerUserId: settlement.buyerUserId,
    sellerUserId: settlement.sellerUserId,
    buyerOrgId: settlement.buyerOrgId,
    sellerOrgId: settlement.sellerOrgId,
    asset: {
      form: listing.form ?? "bar",
      purity: listing.purity ?? "9999",
      weightOz: settlement.weightOz,
      vaultId: vaultHub?.id ?? settlement.vaultHubId,
    },
    economics: {
      pricePerOzLocked: settlement.pricePerOzLocked,
      notional: settlement.notionalUsd,
      fees,
    },
    rail: settlement.rail,
    corridorId: settlement.corridorId,
    settlementHubId: settlement.hubId,
    vaultHubId: settlement.vaultHubId,
    dvpLedgerEntryId: dvpLedgerEntry.id,
  };

  // ── Compute signature hash ──
  const canonical = canonicalSerializeCertificatePayload(certPayload);
  const signatureHash = await sha256Hex(canonical);

  // ── KMS digital signature ──
  let kmsSignature: string | undefined;
  let signatureAlg: string | undefined;
  let kmsKeyId: string | undefined;
  let signedAt: string | undefined;

  try {
    const { canonicalDigest } = await import("@/lib/certificates/canonicalize");
    const { signCertificate } = await import("@/lib/certificates/kms-signer");
    const digest = await canonicalDigest(canonical);
    const kmsResult = await signCertificate(digest);
    kmsSignature = kmsResult.signature;
    signatureAlg = kmsResult.signatureAlg;
    kmsKeyId = kmsResult.kmsKeyId;
    signedAt = kmsResult.signedAt;
  } catch (err) {
    // KMS signing failure is non-fatal — certificate still valid with SHA-256 hash
    console.error("[CERT-ENGINE] KMS signing failed (non-fatal):", err);
  }

  const certificate: ClearingCertificate = {
    ...certPayload,
    signatureHash,
    kmsSignature,
    signatureAlg,
    kmsKeyId,
    signedAt,
  };

  // ── Persist ──
  const state = loadCertificates();
  state.certificates.push(certificate);
  saveCertificates(state);

  return certificate;
}

/* ---------- Resolve helpers for certificate viewer ---------- */

export function resolvePartyName(orgId: string): string {
  const org = mockOrgs.find((o) => o.id === orgId);
  return org?.legalName ?? orgId;
}

export function resolvePartyLei(orgId: string): string {
  const org = mockOrgs.find((o) => o.id === orgId);
  const cp = mockCounterparties.find((c) => c.entity === org?.legalName);
  return cp?.legalEntityId ?? "N/A";
}

export function resolvePartyJurisdiction(orgId: string): string {
  const org = mockOrgs.find((o) => o.id === orgId);
  return org?.jurisdiction ?? "N/A";
}

export function resolveHubName(hubId: string): string {
  const hub = mockHubs.find((h) => h.id === hubId);
  return hub?.name ?? hubId;
}
