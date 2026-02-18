/* ================================================================
   KYC/AML ADAPTER INTERFACES + MOCK IMPLEMENTATIONS
   ================================================================
   Adapter pattern: plug in Onfido/Sumsub/Jumio/ComplyAdvantage later.
   Mock implementations return deterministic outcomes based on IDs.
   ================================================================ */

/* ---------- KYC Provider Adapter ---------- */

export interface KycVerificationResult {
  providerId: string;
  providerName: string;
  checkType: "ID_DOCUMENT" | "LIVENESS" | "ADDRESS" | "UBO";
  outcome: "PASS" | "FAIL" | "REVIEW";
  confidence: number;    // 0–100
  detail: string;
  timestamp: string;
}

export interface KycProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;
  verifyIdentityDocument(userId: string, orgId: string): KycVerificationResult;
  verifyLiveness(userId: string): KycVerificationResult;
  verifyAddress(orgId: string): KycVerificationResult;
  verifyUBO(orgId: string, orgType: "individual" | "company"): KycVerificationResult;
}

/* ---------- AML Screening Adapter ---------- */

export interface AmlScreeningResult {
  providerId: string;
  providerName: string;
  screeningType: "SANCTIONS" | "PEP" | "ADVERSE_MEDIA";
  outcome: "CLEAR" | "POSSIBLE_MATCH" | "CONFIRMED_MATCH";
  matchCount: number;
  detail: string;
  listsChecked: string[];
  timestamp: string;
}

export interface AmlScreeningAdapter {
  readonly providerId: string;
  readonly providerName: string;
  screenSanctions(entityName: string, orgId: string): AmlScreeningResult;
  screenPEP(entityName: string, orgId: string): AmlScreeningResult;
}

/* ---------- Deterministic helpers ---------- */

function lastDigit(s: string): number {
  const match = s.match(/(\d)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/* ================================================================
   MOCK KYC PROVIDER
   ================================================================ */

export class MockKycProvider implements KycProviderAdapter {
  readonly providerId = "mock-kyc-001";
  readonly providerName = "AurumShield Internal KYC Engine";

  verifyIdentityDocument(userId: string, _orgId: string): KycVerificationResult {
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      checkType: "ID_DOCUMENT",
      outcome: "PASS",
      confidence: 98,
      detail: `Government-issued ID verified for user ${userId}. Document type: passport. Expiry valid.`,
      timestamp: new Date().toISOString(),
    };
  }

  verifyLiveness(userId: string): KycVerificationResult {
    const d = lastDigit(userId);
    if (d === 9) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        checkType: "LIVENESS",
        outcome: "FAIL",
        confidence: 22,
        detail: "Liveness check failed — no motion detected in submitted video frames. Manual review required.",
        timestamp: new Date().toISOString(),
      };
    }
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      checkType: "LIVENESS",
      outcome: "PASS",
      confidence: 95,
      detail: `Liveness verified for user ${userId}. Face match confidence: 95%.`,
      timestamp: new Date().toISOString(),
    };
  }

  verifyAddress(orgId: string): KycVerificationResult {
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      checkType: "ADDRESS",
      outcome: "PASS",
      confidence: 92,
      detail: `Registered address verified for org ${orgId}. Source: utility bill cross-reference.`,
      timestamp: new Date().toISOString(),
    };
  }

  verifyUBO(orgId: string, orgType: "individual" | "company"): KycVerificationResult {
    if (orgType === "individual") {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        checkType: "UBO",
        outcome: "PASS",
        confidence: 100,
        detail: "Individual track — UBO declaration not applicable.",
        timestamp: new Date().toISOString(),
      };
    }
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      checkType: "UBO",
      outcome: "PASS",
      confidence: 88,
      detail: `UBO declaration validated for org ${orgId}. 2 beneficial owners identified above 25% threshold.`,
      timestamp: new Date().toISOString(),
    };
  }
}

/* ================================================================
   MOCK AML SCREENING PROVIDER
   ================================================================ */

const STANDARD_LISTS = ["OFAC SDN", "EU Consolidated", "UN Security Council", "HMT UK", "DFAT Australia"];

export class MockAmlScreeningProvider implements AmlScreeningAdapter {
  readonly providerId = "mock-aml-001";
  readonly providerName = "AurumShield AML Screening Engine";

  screenSanctions(entityName: string, orgId: string): AmlScreeningResult {
    const d = lastDigit(orgId);
    if (d === 3) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        screeningType: "SANCTIONS",
        outcome: "POSSIBLE_MATCH",
        matchCount: 1,
        detail: `Possible match for "${entityName}" against OFAC SDN list — manual review required.`,
        listsChecked: STANDARD_LISTS,
        timestamp: new Date().toISOString(),
      };
    }
    if (d === 7) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        screeningType: "SANCTIONS",
        outcome: "CONFIRMED_MATCH",
        matchCount: 2,
        detail: `Confirmed match for "${entityName}" against OFAC SDN and EU Consolidated lists.`,
        listsChecked: STANDARD_LISTS,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      screeningType: "SANCTIONS",
      outcome: "CLEAR",
      matchCount: 0,
      detail: `No matches found for "${entityName}" across ${STANDARD_LISTS.length} sanctions lists.`,
      listsChecked: STANDARD_LISTS,
      timestamp: new Date().toISOString(),
    };
  }

  screenPEP(entityName: string, orgId: string): AmlScreeningResult {
    const d = lastDigit(orgId);
    if (d === 3) {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        screeningType: "PEP",
        outcome: "POSSIBLE_MATCH",
        matchCount: 1,
        detail: `Possible PEP match for "${entityName}" — associated entity flagged.`,
        listsChecked: ["Global PEP Database", "Domestic PEP Lists"],
        timestamp: new Date().toISOString(),
      };
    }
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      screeningType: "PEP",
      outcome: "CLEAR",
      matchCount: 0,
      detail: `No PEP matches for "${entityName}".`,
      listsChecked: ["Global PEP Database", "Domestic PEP Lists"],
      timestamp: new Date().toISOString(),
    };
  }
}

/* ---------- Singleton instances ---------- */
export const mockKycProvider = new MockKycProvider();
export const mockAmlProvider = new MockAmlScreeningProvider();
