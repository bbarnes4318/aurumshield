/* ================================================================
   PROVIDER INTEGRATION FIXTURES
   ================================================================
   Realistic test fixtures for each compliance provider adapter.
   Based on actual adapter contracts and field usage in the repo.

   Covers:
     - Happy path (PASS/CLEAR)
     - Partial/missing field path
     - Review-required path
     - Explicit fail/block path
     - Stale/expired path
     - Malformed/unexpected field path
   ================================================================ */

import type { KycVerificationResult, KybVerificationResult, AmlScreeningResult } from "@/lib/kyc-adapters";
import type { EllipticRiskResponse } from "@/lib/compliance/elliptic-adapter";
import type { LEIValidationResult } from "@/lib/compliance/gleif-adapter";
import type { InscribeValidationResult } from "@/lib/compliance/inscribe-adapter";

// ─── NORMALIZED CHECK RECORD (co_checks shape) ────────────────────────────────

export interface NormalizedCheckFixture {
  checkType: string;
  normalizedVerdict: "PASS" | "FAIL" | "REVIEW" | null;
  resultCode: string | null;
  status: "COMPLETED" | "PENDING" | "ERROR";
  rawPayloadRef: string | null;
  providerName: string;
}

// ─── KYC FIXTURES ──────────────────────────────────────────────────────────────

export const KYC_FIXTURES: Record<string, KycVerificationResult> = {
  HAPPY_PATH_ID: {
    providerId: "veriff-kyc-001",
    providerName: "Veriff Identity",
    checkType: "ID_DOCUMENT",
    outcome: "PASS",
    confidence: 97,
    detail: "Government-issued passport verified. Expiry valid. MRZ data consistent.",
    timestamp: "2026-03-23T10:00:00Z",
  },
  HAPPY_PATH_LIVENESS: {
    providerId: "veriff-kyc-001",
    providerName: "Veriff Identity",
    checkType: "LIVENESS",
    outcome: "PASS",
    confidence: 96,
    detail: "Biometric liveness verified. Face match confidence: 96%.",
    timestamp: "2026-03-23T10:01:00Z",
  },
  FAIL_LIVENESS: {
    providerId: "veriff-kyc-001",
    providerName: "Veriff Identity",
    checkType: "LIVENESS",
    outcome: "FAIL",
    confidence: 18,
    detail: "Liveness check failed — selfie did not match government ID photo.",
    timestamp: "2026-03-23T10:01:00Z",
  },
  REVIEW_ADDRESS: {
    providerId: "veriff-kyc-001",
    providerName: "Veriff Identity",
    checkType: "ADDRESS",
    outcome: "REVIEW",
    confidence: 55,
    detail: "Address document submitted but utility bill date exceeds 90 days. Manual review required.",
    timestamp: "2026-03-23T10:02:00Z",
  },
};

// ─── KYB FIXTURES ──────────────────────────────────────────────────────────────

export const KYB_FIXTURES: Record<string, KybVerificationResult> = {
  HAPPY_PATH_REGISTRATION: {
    providerId: "veriff-kyb-001",
    providerName: "Veriff KYB",
    checkType: "CORP_REGISTRY",
    outcome: "PASS",
    confidence: 94,
    detail: "Corporate registry verified. Entity status: Active. Incorporation confirmed.",
    subChecks: [
      { name: "Entity Existence", status: "PASSED" },
      { name: "Active Status", status: "PASSED" },
      { name: "Registered Agent", status: "PASSED" },
    ],
    timestamp: "2026-03-23T10:03:00Z",
  },
  FAIL_REGISTRATION: {
    providerId: "veriff-kyb-001",
    providerName: "Veriff KYB",
    checkType: "CORP_REGISTRY",
    outcome: "FAIL",
    confidence: 15,
    detail: "Business registration could not be verified against official registry. Entity status: Dissolved.",
    subChecks: [
      { name: "Entity Existence", status: "FAILED" },
      { name: "Active Status", status: "FAILED" },
    ],
    timestamp: "2026-03-23T10:03:00Z",
  },
  REVIEW_ENTITY_AML: {
    providerId: "veriff-kyb-001",
    providerName: "Veriff KYB",
    checkType: "ENTITY_AML",
    outcome: "REVIEW",
    confidence: 65,
    detail: "Entity flagged for manual review — possible adverse media match.",
    subChecks: [
      { name: "Sanctions Screening", status: "PASSED" },
      { name: "PEP Screening", status: "PASSED" },
      { name: "Adverse Media", status: "PENDING" },
    ],
    timestamp: "2026-03-23T10:04:00Z",
  },
};

// ─── AML SANCTIONS FIXTURES ────────────────────────────────────────────────────

export const AML_FIXTURES: Record<string, AmlScreeningResult> = {
  CLEAR: {
    providerId: "opensanctions-aml-001",
    providerName: "OpenSanctions",
    screeningType: "SANCTIONS",
    outcome: "CLEAR",
    matchCount: 0,
    detail: "No matches found across 5 sanctions datasets.",
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council", "HMT UK", "DFAT Australia"],
    timestamp: "2026-03-23T10:05:00Z",
  },
  POSSIBLE_MATCH: {
    providerId: "opensanctions-aml-001",
    providerName: "OpenSanctions",
    screeningType: "SANCTIONS",
    outcome: "POSSIBLE_MATCH",
    matchCount: 1,
    detail: "Possible match against OFAC SDN list (score: 0.74) — manual review required.",
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council", "HMT UK", "DFAT Australia"],
    timestamp: "2026-03-23T10:05:00Z",
  },
  CONFIRMED_MATCH: {
    providerId: "opensanctions-aml-001",
    providerName: "OpenSanctions",
    screeningType: "SANCTIONS",
    outcome: "CONFIRMED_MATCH",
    matchCount: 2,
    detail: "Confirmed match against OFAC SDN and EU Financial Sanctions (score: 0.95).",
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council", "HMT UK", "DFAT Australia"],
    timestamp: "2026-03-23T10:05:00Z",
  },
  PEP_CLEAR: {
    providerId: "opensanctions-aml-001",
    providerName: "OpenSanctions",
    screeningType: "PEP",
    outcome: "CLEAR",
    matchCount: 0,
    detail: "No PEP matches found.",
    listsChecked: ["OpenSanctions PEP Dataset", "Every Politician"],
    timestamp: "2026-03-23T10:06:00Z",
  },
  PEP_MATCH: {
    providerId: "opensanctions-aml-001",
    providerName: "OpenSanctions",
    screeningType: "PEP",
    outcome: "POSSIBLE_MATCH",
    matchCount: 1,
    detail: "Possible PEP match — associated entity flagged (score: 0.68).",
    listsChecked: ["OpenSanctions PEP Dataset", "Every Politician"],
    timestamp: "2026-03-23T10:06:00Z",
  },
};

// ─── ELLIPTIC WALLET RISK FIXTURES ─────────────────────────────────────────────

export const ELLIPTIC_FIXTURES: Record<string, EllipticRiskResponse> = {
  LOW_RISK: {
    id: "ell-001",
    risk_score: 1.2,
    risk_tier: 1,
    status: "completed",
  },
  MEDIUM_RISK: {
    id: "ell-002",
    risk_score: 4.5,
    risk_tier: 2,
    status: "completed",
  },
  HIGH_RISK: {
    id: "ell-003",
    risk_score: 7.8,
    risk_tier: 4,
    status: "completed",
  },
  SEVERE_RISK: {
    id: "ell-004",
    risk_score: 9.5,
    risk_tier: 5,
    status: "completed",
  },
  /** Malformed response — missing risk_tier */
  MALFORMED: {
    id: "ell-005",
    risk_score: 3.0,
    risk_tier: 0, // 0 = unknown/invalid tier
    status: "",
  },
};

// ─── GLEIF LEI FIXTURES ────────────────────────────────────────────────────────

export const LEI_FIXTURES: Record<string, LEIValidationResult> = {
  VALID_ISSUED: {
    valid: true,
    lei: "529900T8BM49AURSDO55",
    entityName: "AurumShield Gold Corp",
    jurisdiction: "US-NY",
    status: "ISSUED",
    registrationDate: "2020-01-15T00:00:00Z",
    lastUpdateDate: "2026-03-01T00:00:00Z",
    managingLOU: "EVK05KS7XY1DEII3R011",
  },
  LAPSED: {
    valid: false,
    lei: "529900T8BM49AURSDO00",
    entityName: "Defunct Mining Co",
    jurisdiction: "US-DE",
    status: "LAPSED",
    registrationDate: "2018-06-01T00:00:00Z",
    lastUpdateDate: "2024-01-01T00:00:00Z",
    managingLOU: "EVK05KS7XY1DEII3R011",
    error: "LEI status is LAPSED — entity must renew registration",
  },
  INVALID_FORMAT: {
    valid: false,
    lei: "INVALID_LEI",
    entityName: null,
    jurisdiction: null,
    status: null,
    registrationDate: null,
    lastUpdateDate: null,
    managingLOU: null,
    error: "Invalid LEI format: must be exactly 20 alphanumeric characters.",
  },
  NOT_FOUND: {
    valid: false,
    lei: "AAAABBBBCCCCDDDDEEEE",
    entityName: null,
    jurisdiction: null,
    status: null,
    registrationDate: null,
    lastUpdateDate: null,
    managingLOU: null,
    error: "LEI not found in GLEIF database",
  },
};

// ─── INSCRIBE DOCUMENT FIXTURES ────────────────────────────────────────────────

export const INSCRIBE_FIXTURES: Record<string, InscribeValidationResult> = {
  AUTHENTIC_ASSAY: {
    documentId: "inscribe-assay-001",
    documentType: "ASSAY_REPORT",
    isAuthentic: true,
    fraudSignal: "NONE",
    confidenceScore: 0.96,
    extractedData: {
      refinerName: "Metalor Technologies SA",
      refinerAccreditation: "LBMA Good Delivery",
      goldPurity: 0.9999,
      weightTroyOz: 32.15,
      assayDate: "2025-11-20",
      serialNumber: "MT-2025-88431",
    },
    validationDetails: [
      { checkName: "Document Authenticity", passed: true, confidence: 0.97, detail: "Passes all authenticity checks" },
      { checkName: "Font Consistency", passed: true, confidence: 0.99, detail: "All fonts consistent" },
      { checkName: "Metadata Integrity", passed: true, confidence: 0.95, detail: "Metadata consistent" },
    ],
    processingTimeMs: 2847,
    timestamp: "2026-03-23T10:10:00Z",
  },
  FRAUDULENT_ASSAY: {
    documentId: "inscribe-assay-002",
    documentType: "ASSAY_REPORT",
    isAuthentic: false,
    fraudSignal: "HIGH",
    confidenceScore: 0.3,
    extractedData: {
      refinerName: "Unknown Refinery",
      goldPurity: 0.75,
      weightTroyOz: 50.0,
    },
    validationDetails: [
      { checkName: "Document Authenticity", passed: false, confidence: 0.25, detail: "Digital manipulation detected" },
      { checkName: "Font Consistency", passed: false, confidence: 0.4, detail: "Inconsistent font metrics" },
    ],
    processingTimeMs: 2100,
    timestamp: "2026-03-23T10:10:00Z",
  },
};

// ─── NORMALIZED CHECK FIXTURES (co_checks compatible) ──────────────────────────

export const NORMALIZED_CHECK_FIXTURES: Record<string, NormalizedCheckFixture> = {
  KYC_PASS: {
    checkType: "KYC_ID",
    normalizedVerdict: "PASS",
    resultCode: "VERIFIED",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/veriff/session-001.json",
    providerName: "Veriff Identity",
  },
  SANCTIONS_CLEAR: {
    checkType: "SANCTIONS",
    normalizedVerdict: "PASS",
    resultCode: "CLEAR",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/opensanctions/screen-001.json",
    providerName: "OpenSanctions",
  },
  SANCTIONS_REVIEW: {
    checkType: "SANCTIONS",
    normalizedVerdict: "REVIEW",
    resultCode: "POSSIBLE_MATCH",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/opensanctions/screen-002.json",
    providerName: "OpenSanctions",
  },
  SANCTIONS_FAIL: {
    checkType: "SANCTIONS",
    normalizedVerdict: "FAIL",
    resultCode: "CONFIRMED_MATCH",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/opensanctions/screen-003.json",
    providerName: "OpenSanctions",
  },
  WALLET_KYT_PASS: {
    checkType: "WALLET_KYT",
    normalizedVerdict: "PASS",
    resultCode: "LOW_RISK",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/elliptic/screen-001.json",
    providerName: "Elliptic",
  },
  WALLET_KYT_FAIL: {
    checkType: "WALLET_KYT",
    normalizedVerdict: "FAIL",
    resultCode: "SEVERE_RISK",
    status: "COMPLETED",
    rawPayloadRef: "s3://compliance/raw/elliptic/screen-002.json",
    providerName: "Elliptic",
  },
  PENDING_CHECK: {
    checkType: "KYC_ID",
    normalizedVerdict: null,
    resultCode: null,
    status: "PENDING",
    rawPayloadRef: null,
    providerName: "Veriff Identity",
  },
  ERROR_CHECK: {
    checkType: "SANCTIONS",
    normalizedVerdict: null,
    resultCode: "PROVIDER_ERROR",
    status: "ERROR",
    rawPayloadRef: "s3://compliance/raw/opensanctions/error-001.json",
    providerName: "OpenSanctions",
  },
};
