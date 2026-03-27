/* ================================================================
   KYCAID PROVIDER — Unit Tests
   ================================================================
   Validates:
     1. Provider registry — env-based vendor selection
     2. KYCaid callback verifier — HMAC-SHA512 signature validation
     3. KYCaid adapter — status normalization (KYCaid → internal enums)
     4. KYCaid client-side adapters — class instantiation and interface compliance
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ================================================================
   PROVIDER REGISTRY TESTS
   ================================================================ */

describe("Provider Registry", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 'kycaid' when no env var is set", async () => {
    vi.stubEnv("COMPLIANCE_ACTIVE_PROVIDER", "");
    vi.stubEnv("ACTIVE_COMPLIANCE_PROVIDER", "");

    // Dynamic import to pick up env stubs
    const { getActiveComplianceProvider } = await import(
      "@/lib/compliance/provider-registry"
    );
    // When both vars are empty strings, the fallback to "kycaid" should apply
    const result = getActiveComplianceProvider();
    // Empty string is falsy, so ?? chain falls to default "kycaid"
    expect(["kycaid"]).toContain(result);
  });

  it("recognizes 'veriff' env value (case-insensitive)", async () => {
    vi.stubEnv("COMPLIANCE_ACTIVE_PROVIDER", "VERIFF");

    const mod = await import("@/lib/compliance/provider-registry");
    expect(mod.getActiveComplianceProvider()).toBe("veriff");
  });

  it("recognizes 'idenfy' env value", async () => {
    vi.stubEnv("COMPLIANCE_ACTIVE_PROVIDER", "idenfy");

    const mod = await import("@/lib/compliance/provider-registry");
    expect(mod.getActiveComplianceProvider()).toBe("idenfy");
  });

  it("COMPLIANCE_ACTIVE_PROVIDER takes precedence over ACTIVE_COMPLIANCE_PROVIDER", async () => {
    vi.stubEnv("COMPLIANCE_ACTIVE_PROVIDER", "kycaid");
    vi.stubEnv("ACTIVE_COMPLIANCE_PROVIDER", "VERIFF");

    const mod = await import("@/lib/compliance/provider-registry");
    expect(mod.getActiveComplianceProvider()).toBe("kycaid");
  });

  it("falls back to ACTIVE_COMPLIANCE_PROVIDER when canonical is absent", async () => {
    vi.stubEnv("ACTIVE_COMPLIANCE_PROVIDER", "veriff");
    delete process.env.COMPLIANCE_ACTIVE_PROVIDER;

    const mod = await import("@/lib/compliance/provider-registry");
    expect(mod.getActiveComplianceProvider()).toBe("veriff");
  });

  it("PROVIDER_CATALOG has entries for all three providers", async () => {
    const { PROVIDER_CATALOG } = await import(
      "@/lib/compliance/provider-registry"
    );
    expect(PROVIDER_CATALOG.kycaid.status).toBe("active");
    expect(PROVIDER_CATALOG.veriff.status).toBe("preserved");
    expect(PROVIDER_CATALOG.idenfy.status).toBe("preserved");
  });
});

/* ================================================================
   KYCAID CALLBACK VERIFIER TESTS
   ================================================================ */

describe("KYCaid Callback Verifier", () => {
  it("returns true for a valid HMAC-SHA512 signature", async () => {
    const { createHmac } = await import("crypto");
    const { verifyKycaidCallbackSignature } = await import(
      "@/lib/compliance/kycaid-callback-verifier"
    );

    const rawBody =
      '{"request_id":"abc123","type":"VERIFICATION_COMPLETED","verification_id":"v001","applicant_id":"a001","status":"completed","verified":true}';
    const apiToken = "test-api-token-secret";

    // Compute expected signature per KYCaid spec
    const base64Body = Buffer.from(rawBody, "utf-8").toString("base64");
    const expectedSig = createHmac("sha512", apiToken)
      .update(base64Body)
      .digest("hex");

    expect(verifyKycaidCallbackSignature(rawBody, expectedSig, apiToken)).toBe(
      true,
    );
  });

  it("returns false for an invalid signature", async () => {
    const { verifyKycaidCallbackSignature } = await import(
      "@/lib/compliance/kycaid-callback-verifier"
    );

    expect(
      verifyKycaidCallbackSignature(
        '{"valid":"json"}',
        "deadbeef0000",
        "test-secret",
      ),
    ).toBe(false);
  });

  it("returns false for empty inputs", async () => {
    const { verifyKycaidCallbackSignature } = await import(
      "@/lib/compliance/kycaid-callback-verifier"
    );

    expect(verifyKycaidCallbackSignature("", "sig", "token")).toBe(false);
    expect(verifyKycaidCallbackSignature("body", "", "token")).toBe(false);
    expect(verifyKycaidCallbackSignature("body", "sig", "")).toBe(false);
  });

  it("returns false for mismatched signature lengths (timing-safe guard)", async () => {
    const { verifyKycaidCallbackSignature } = await import(
      "@/lib/compliance/kycaid-callback-verifier"
    );

    // Short signature — should fail length check before timingSafeEqual
    expect(verifyKycaidCallbackSignature('{"a":1}', "short", "key")).toBe(
      false,
    );
  });
});

/* ================================================================
   KYCAID STATUS NORMALIZATION TESTS
   ================================================================ */

vi.mock("server-only", () => ({}));

describe("KYCaid Status Normalization", () => {
  it("completed + verified=true → APPROVED", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );
    expect(normalizeVerificationStatus("completed", true)).toBe("APPROVED");
  });

  it("completed + verified=false → REJECTED", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );
    expect(normalizeVerificationStatus("completed", false)).toBe("REJECTED");
  });

  it("completed + verified=null → REJECTED (fail-closed)", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );
    expect(normalizeVerificationStatus("completed", null)).toBe("REJECTED");
  });

  it("pending → PENDING_PROVIDER", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );
    expect(normalizeVerificationStatus("pending", null)).toBe(
      "PENDING_PROVIDER",
    );
  });

  it("unused → PENDING_USER", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );
    expect(normalizeVerificationStatus("unused", null)).toBe("PENDING_USER");
  });
});

/* ================================================================
   KYCAID CLIENT-SIDE ADAPTER TESTS
   ================================================================ */

describe("KYCaid Client-Side Adapters", () => {
  it("KycaidKycProvider implements all KycProviderAdapter methods", async () => {
    const { KycaidKycProvider } = await import("@/lib/kyc-adapters");
    const provider = new KycaidKycProvider();

    expect(provider.providerId).toBe("kycaid-kyc-001");
    expect(provider.providerName).toBe("KYCaid Identity Verification");

    const idResult = provider.verifyIdentityDocument("user-001", "org-001");
    expect(idResult.providerId).toBe("kycaid-kyc-001");
    expect(idResult.providerName).toBe("KYCaid Identity Verification");
    expect(idResult.checkType).toBe("ID_DOCUMENT");
    expect(["PASS", "FAIL", "REVIEW"]).toContain(idResult.outcome);

    const livenessResult = provider.verifyLiveness("user-001");
    expect(livenessResult.providerId).toBe("kycaid-kyc-001");
    expect(livenessResult.checkType).toBe("LIVENESS");

    const addressResult = provider.verifyAddress("org-001");
    expect(addressResult.providerId).toBe("kycaid-kyc-001");
    expect(addressResult.checkType).toBe("ADDRESS");

    const uboResult = provider.verifyUBO("org-001", "company");
    expect(uboResult.providerId).toBe("kycaid-kyc-001");
    expect(uboResult.checkType).toBe("UBO");
  });

  it("KycaidKybProvider implements all KybProviderAdapter methods", async () => {
    const { KycaidKybProvider } = await import("@/lib/kyc-adapters");
    const provider = new KycaidKybProvider();

    expect(provider.providerId).toBe("kycaid-kyb-001");
    expect(provider.providerName).toBe("KYCaid Business Verification");

    const regResult = provider.verifyBusinessRegistration("org-001", "US");
    expect(regResult.providerId).toBe("kycaid-kyb-001");
    expect(regResult.checkType).toBe("CORP_REGISTRY");

    const uboResult = provider.verifyUBOOfficers("org-001", ["officer-001"]);
    expect(uboResult.providerId).toBe("kycaid-kyb-001");
    expect(uboResult.checkType).toBe("UBO_OFFICERS");

    const screenResult = provider.screenEntity("org-001", "Test Corp");
    expect(screenResult.providerId).toBe("kycaid-kyb-001");
    expect(screenResult.checkType).toBe("ENTITY_AML");
  });

  it("KycaidAmlProvider implements all AmlScreeningAdapter methods", async () => {
    const { KycaidAmlProvider } = await import("@/lib/kyc-adapters");
    const provider = new KycaidAmlProvider();

    expect(provider.providerId).toBe("kycaid-aml-001");
    expect(provider.providerName).toBe("KYCaid AML/Sanctions Screening");

    const sanctionsResult = provider.screenSanctions("Test Corp", "org-001");
    expect(sanctionsResult.providerId).toBe("kycaid-aml-001");
    expect(sanctionsResult.screeningType).toBe("SANCTIONS");
    expect(["CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).toContain(
      sanctionsResult.outcome,
    );

    const pepResult = provider.screenPEP("Test Person", "org-001");
    expect(pepResult.providerId).toBe("kycaid-aml-001");
    expect(pepResult.screeningType).toBe("PEP");
  });

  it("singleton exports are properly instantiated", async () => {
    const {
      kycaidKycProvider,
      kycaidKybProvider,
      kycaidAmlProvider,
    } = await import("@/lib/kyc-adapters");

    expect(kycaidKycProvider.providerId).toBe("kycaid-kyc-001");
    expect(kycaidKybProvider.providerId).toBe("kycaid-kyb-001");
    expect(kycaidAmlProvider.providerId).toBe("kycaid-aml-001");
  });
});

/* ================================================================
   FAIL-CLOSED POSTURE TESTS
   ================================================================ */

describe("Fail-Closed Posture", () => {
  it("normalizeVerificationStatus never returns APPROVED for non-completed status", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );

    // Test every non-completed status with every verified value
    const nonCompletedStatuses = ["unused", "pending"] as const;
    const verifiedValues = [true, false, null];

    for (const status of nonCompletedStatuses) {
      for (const verified of verifiedValues) {
        const result = normalizeVerificationStatus(status, verified);
        expect(result).not.toBe("APPROVED");
      }
    }
  });

  it("APPROVED only when status=completed AND verified=true", async () => {
    const { normalizeVerificationStatus } = await import(
      "@/lib/compliance/kycaid-adapter"
    );

    // The ONLY path to APPROVED
    expect(normalizeVerificationStatus("completed", true)).toBe("APPROVED");

    // All other completed variants are REJECTED
    expect(normalizeVerificationStatus("completed", false)).toBe("REJECTED");
    expect(normalizeVerificationStatus("completed", null)).toBe("REJECTED");
  });
});
