/* ================================================================
   INSTITUTIONAL JOURNEY — Unit Tests
   ================================================================
   Covers the core stage model, progression helpers, route mapping,
   backward-compatible stage resolution, and phase derivation.
   ================================================================ */

import { describe, it, expect } from "vitest";
import {
  JOURNEY_STAGES,
  getPhaseForStage,
  getRouteForStage,
  getNextStage,
  getStageIndex,
  isGuidedJourneyComplete,
  resolveJourneyStage,
  type InstitutionalJourneyStage,
} from "@/lib/schemas/institutional-journey-schema";
import type { OnboardingState } from "@/lib/compliance/onboarding-state";

/* ----------------------------------------------------------------
   Factory helper — builds a minimal OnboardingState for testing.
   ---------------------------------------------------------------- */

function makeState(
  overrides: Partial<OnboardingState> = {},
): OnboardingState {
  return {
    id: "test-id",
    userId: "test-user",
    orgId: null,
    startedAt: "2026-01-01T00:00:00Z",
    lastSeenAt: "2026-01-01T00:00:00Z",
    currentStep: 1,
    providerInquiryId: null,
    status: "IN_PROGRESS",
    statusReason: null,
    metadataJson: {},
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/* ================================================================
   getPhaseForStage
   ================================================================ */

describe("getPhaseForStage", () => {
  it("maps Getting Started stages to GETTING_STARTED", () => {
    expect(getPhaseForStage("WELCOME")).toBe("GETTING_STARTED");
    expect(getPhaseForStage("ORGANIZATION")).toBe("GETTING_STARTED");
    expect(getPhaseForStage("VERIFICATION")).toBe("GETTING_STARTED");
    expect(getPhaseForStage("FUNDING")).toBe("GETTING_STARTED");
  });

  it("maps First Trade stages to FIRST_TRADE", () => {
    expect(getPhaseForStage("FIRST_TRADE_ASSET")).toBe("FIRST_TRADE");
    expect(getPhaseForStage("FIRST_TRADE_DELIVERY")).toBe("FIRST_TRADE");
    expect(getPhaseForStage("FIRST_TRADE_REVIEW")).toBe("FIRST_TRADE");
    expect(getPhaseForStage("FIRST_TRADE_AUTHORIZE")).toBe("FIRST_TRADE");
    expect(getPhaseForStage("FIRST_TRADE_SUCCESS")).toBe("FIRST_TRADE");
  });
});

/* ================================================================
   getRouteForStage
   ================================================================ */

describe("getRouteForStage", () => {
  const expectedRoutes: Record<InstitutionalJourneyStage, string> = {
    WELCOME: "/institutional/get-started/welcome",
    ORGANIZATION: "/institutional/get-started/organization",
    VERIFICATION: "/institutional/get-started/verification",
    FUNDING: "/institutional/get-started/funding",
    FIRST_TRADE_ASSET: "/institutional/first-trade/asset",
    FIRST_TRADE_DELIVERY: "/institutional/first-trade/delivery",
    FIRST_TRADE_REVIEW: "/institutional/first-trade/review",
    FIRST_TRADE_AUTHORIZE: "/institutional/first-trade/authorize",
    FIRST_TRADE_SUCCESS: "/institutional/first-trade/success",
  };

  for (const [stage, route] of Object.entries(expectedRoutes)) {
    it(`${stage} → ${route}`, () => {
      expect(getRouteForStage(stage as InstitutionalJourneyStage)).toBe(route);
    });
  }
});

/* ================================================================
   getNextStage
   ================================================================ */

describe("getNextStage", () => {
  it("progresses through all stages in order", () => {
    let stage: InstitutionalJourneyStage | null = JOURNEY_STAGES[0];
    const visited: InstitutionalJourneyStage[] = [stage];

    while (stage) {
      stage = getNextStage(stage);
      if (stage) visited.push(stage);
    }

    expect(visited).toEqual([...JOURNEY_STAGES]);
  });

  it("returns null for the terminal stage", () => {
    expect(getNextStage("FIRST_TRADE_SUCCESS")).toBeNull();
  });
});

/* ================================================================
   getStageIndex
   ================================================================ */

describe("getStageIndex", () => {
  it("returns 0 for WELCOME", () => {
    expect(getStageIndex("WELCOME")).toBe(0);
  });

  it("returns 8 for FIRST_TRADE_SUCCESS (last stage)", () => {
    expect(getStageIndex("FIRST_TRADE_SUCCESS")).toBe(8);
  });
});

/* ================================================================
   isGuidedJourneyComplete
   ================================================================ */

describe("isGuidedJourneyComplete", () => {
  it("returns true only for FIRST_TRADE_SUCCESS", () => {
    expect(isGuidedJourneyComplete("FIRST_TRADE_SUCCESS")).toBe(true);
  });

  it("returns false for all other stages", () => {
    for (const stage of JOURNEY_STAGES) {
      if (stage !== "FIRST_TRADE_SUCCESS") {
        expect(isGuidedJourneyComplete(stage)).toBe(false);
      }
    }
  });
});

/* ================================================================
   resolveJourneyStage — backward compatibility
   ================================================================ */

describe("resolveJourneyStage", () => {
  it("returns WELCOME for null state (brand-new user)", () => {
    expect(resolveJourneyStage(null)).toBe("WELCOME");
  });

  describe("authoritative __journey data", () => {
    it("trusts __journey.stage when present and valid", () => {
      const state = makeState({
        metadataJson: {
          __journey: { stage: "FUNDING", firstTradeCompleted: false },
        },
      });
      expect(resolveJourneyStage(state)).toBe("FUNDING");
    });

    it("trusts __journey.stage for first-trade stages", () => {
      const state = makeState({
        status: "COMPLETED",
        metadataJson: {
          __journey: { stage: "FIRST_TRADE_REVIEW", firstTradeCompleted: false },
        },
      });
      expect(resolveJourneyStage(state)).toBe("FIRST_TRADE_REVIEW");
    });

    it("falls through to legacy mapping if __journey is malformed", () => {
      const state = makeState({
        status: "COMPLETED",
        metadataJson: {
          __journey: { stage: "INVALID_STAGE" },
        },
      });
      // Legacy COMPLETED with no valid __journey → null (advanced workspace)
      expect(resolveJourneyStage(state)).toBeNull();
    });
  });

  describe("legacy COMPLETED records (no __journey)", () => {
    it("returns null — user should bypass guided flow", () => {
      const state = makeState({
        status: "COMPLETED",
        currentStep: 4,
        metadataJson: {},
      });
      expect(resolveJourneyStage(state)).toBeNull();
    });

    it("returns null even with currentStep 7", () => {
      const state = makeState({
        status: "COMPLETED",
        currentStep: 7,
        metadataJson: {},
      });
      expect(resolveJourneyStage(state)).toBeNull();
    });
  });

  describe("legacy IN_PROGRESS records (no __journey)", () => {
    it("step < 1 → WELCOME", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 0 });
      expect(resolveJourneyStage(state)).toBe("WELCOME");
    });

    it("step 1 → ORGANIZATION", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 1 });
      expect(resolveJourneyStage(state)).toBe("ORGANIZATION");
    });

    it("step 2 → VERIFICATION", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 2 });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("step 3 → VERIFICATION", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 3 });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("step 4 → VERIFICATION", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 4 });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("step 5 → FUNDING", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 5 });
      expect(resolveJourneyStage(state)).toBe("FUNDING");
    });

    it("step 6 → FUNDING", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 6 });
      expect(resolveJourneyStage(state)).toBe("FUNDING");
    });

    it("step 7 → FUNDING", () => {
      const state = makeState({ status: "IN_PROGRESS", currentStep: 7 });
      expect(resolveJourneyStage(state)).toBe("FUNDING");
    });
  });

  describe("other statuses (PROVIDER_PENDING, MCA_PENDING, etc.)", () => {
    it("PROVIDER_PENDING → VERIFICATION (safest resume)", () => {
      const state = makeState({ status: "PROVIDER_PENDING" });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("MCA_PENDING → VERIFICATION", () => {
      const state = makeState({ status: "MCA_PENDING" });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("MCA_SIGNED → VERIFICATION", () => {
      const state = makeState({ status: "MCA_SIGNED" });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("REVIEW → VERIFICATION", () => {
      const state = makeState({ status: "REVIEW" });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });

    it("ABANDONED → VERIFICATION", () => {
      const state = makeState({ status: "ABANDONED" });
      expect(resolveJourneyStage(state)).toBe("VERIFICATION");
    });
  });

  describe("guided journey with firstTradeCompleted", () => {
    it("FIRST_TRADE_SUCCESS with firstTradeCompleted=true returns FIRST_TRADE_SUCCESS", () => {
      const state = makeState({
        status: "COMPLETED",
        metadataJson: {
          __journey: { stage: "FIRST_TRADE_SUCCESS", firstTradeCompleted: true },
        },
      });
      expect(resolveJourneyStage(state)).toBe("FIRST_TRADE_SUCCESS");
    });

    it("firstTradeCompleted=false with mid-journey stage returns the mid-journey stage", () => {
      const state = makeState({
        status: "IN_PROGRESS",
        metadataJson: {
          __journey: { stage: "FIRST_TRADE_DELIVERY", firstTradeCompleted: false },
        },
      });
      expect(resolveJourneyStage(state)).toBe("FIRST_TRADE_DELIVERY");
    });
  });
});

/* ================================================================
   isAssetStageReady — first-trade draft readiness guards
   ================================================================ */

import {
  isAssetStageReady,
  isDeliveryStageReady,
  FIRST_TRADE_DRAFT_DEFAULTS,
  type FirstTradeDraft,
} from "@/lib/schemas/first-trade-draft-schema";

function makeDraft(overrides: Partial<FirstTradeDraft> = {}): FirstTradeDraft {
  return { ...FIRST_TRADE_DRAFT_DEFAULTS, ...overrides };
}

describe("isAssetStageReady", () => {
  it("returns false for empty defaults", () => {
    expect(isAssetStageReady(FIRST_TRADE_DRAFT_DEFAULTS)).toBe(false);
  });

  it("returns false when asset selected but no transaction intent", () => {
    const draft = makeDraft({ selectedAssetId: "lbma-400oz", quantity: 1 });
    expect(isAssetStageReady(draft)).toBe(false);
  });

  it("returns false when asset selected but invalid ID", () => {
    const draft = makeDraft({
      selectedAssetId: "nonexistent",
      quantity: 1,
      transactionIntent: "ALLOCATION",
    });
    expect(isAssetStageReady(draft)).toBe(false);
  });

  it("returns false when quantity is 0", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 0,
      transactionIntent: "ALLOCATION",
    });
    expect(isAssetStageReady(draft)).toBe(false);
  });

  it("returns true when all requirements met (ALLOCATION)", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 2,
      transactionIntent: "ALLOCATION",
    });
    expect(isAssetStageReady(draft)).toBe(true);
  });

  it("returns true when all requirements met (PHYSICAL_DELIVERY)", () => {
    const draft = makeDraft({
      selectedAssetId: "kilo-bar",
      quantity: 1,
      transactionIntent: "PHYSICAL_DELIVERY",
    });
    expect(isAssetStageReady(draft)).toBe(true);
  });
});

/* ================================================================
   isDeliveryStageReady — full draft readiness gate
   ================================================================ */

describe("isDeliveryStageReady", () => {
  it("returns false for empty defaults", () => {
    expect(isDeliveryStageReady(FIRST_TRADE_DRAFT_DEFAULTS)).toBe(false);
  });

  it("returns false when asset ready but no delivery method chosen", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 1,
      transactionIntent: "ALLOCATION",
    });
    expect(isDeliveryStageReady(draft)).toBe(false);
  });

  it("returns false when vault_custody but no jurisdiction", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 1,
      transactionIntent: "ALLOCATION",
      deliveryMethod: "vault_custody",
      vaultJurisdiction: "",
    });
    expect(isDeliveryStageReady(draft)).toBe(false);
  });

  it("returns false when vault_custody with invalid jurisdiction", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 1,
      transactionIntent: "ALLOCATION",
      deliveryMethod: "vault_custody",
      vaultJurisdiction: "INVALID",
    });
    expect(isDeliveryStageReady(draft)).toBe(false);
  });

  it("returns true when vault_custody with valid jurisdiction", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 1,
      transactionIntent: "ALLOCATION",
      deliveryMethod: "vault_custody",
      vaultJurisdiction: "ZRH",
    });
    expect(isDeliveryStageReady(draft)).toBe(true);
  });

  it("returns false when secure_delivery but no delivery region", () => {
    const draft = makeDraft({
      selectedAssetId: "lbma-400oz",
      quantity: 1,
      transactionIntent: "PHYSICAL_DELIVERY",
      deliveryMethod: "secure_delivery",
      deliveryRegion: "",
    });
    expect(isDeliveryStageReady(draft)).toBe(false);
  });

  it("returns true when secure_delivery with valid region", () => {
    const draft = makeDraft({
      selectedAssetId: "kilo-bar",
      quantity: 1,
      transactionIntent: "PHYSICAL_DELIVERY",
      deliveryMethod: "secure_delivery",
      deliveryRegion: "US",
    });
    expect(isDeliveryStageReady(draft)).toBe(true);
  });
});

/* ================================================================
   isFundingReady — funding stage readiness guard
   ================================================================ */

import {
  isFundingReady,
  FUNDING_STAGE_DEFAULTS,
  type FundingStageData,
} from "@/lib/schemas/funding-stage-schema";

function makeFunding(overrides: Partial<FundingStageData> = {}): FundingStageData {
  return { ...FUNDING_STAGE_DEFAULTS, ...overrides };
}

describe("isFundingReady", () => {
  it("returns false for empty defaults", () => {
    expect(isFundingReady(FUNDING_STAGE_DEFAULTS)).toBe(false);
  });

  it("returns false when fields filled but isFundingConfigured is false", () => {
    const data = makeFunding({
      fundingMethod: "digital_stablecoin",
      walletAddress: "0x123",
      walletNetwork: "ERC-20",
      stablecoinAsset: "USDC",
      isFundingConfigured: false,
    });
    expect(isFundingReady(data)).toBe(false);
  });

  it("returns true for complete stablecoin configuration", () => {
    const data = makeFunding({
      fundingMethod: "digital_stablecoin",
      walletAddress: "0x123abc",
      walletNetwork: "ERC-20 (Ethereum)",
      stablecoinAsset: "USDC",
      isFundingConfigured: true,
    });
    expect(isFundingReady(data)).toBe(true);
  });

  it("returns false for stablecoin with missing wallet address", () => {
    const data = makeFunding({
      fundingMethod: "digital_stablecoin",
      walletAddress: "",
      walletNetwork: "ERC-20 (Ethereum)",
      stablecoinAsset: "USDC",
      isFundingConfigured: true,
    });
    expect(isFundingReady(data)).toBe(false);
  });

  it("returns true for complete wire configuration", () => {
    const data = makeFunding({
      fundingMethod: "legacy_wire",
      bankName: "JPMorgan Chase",
      bankRoutingNumber: "021000021",
      bankAccountNumber: "1234567890",
      bankSwiftCode: "CHASUS33",
      isFundingConfigured: true,
    });
    expect(isFundingReady(data)).toBe(true);
  });

  it("returns false for wire with missing SWIFT code", () => {
    const data = makeFunding({
      fundingMethod: "legacy_wire",
      bankName: "JPMorgan Chase",
      bankRoutingNumber: "021000021",
      bankAccountNumber: "1234567890",
      bankSwiftCode: "",
      isFundingConfigured: true,
    });
    expect(isFundingReady(data)).toBe(false);
  });
});

/* ================================================================
   isVerificationComplete — verification milestone guard
   ================================================================ */

import {
  isVerificationComplete,
  VERIFICATION_STAGE_DEFAULTS,
  deriveVerificationFromCase,
  getVerificationStatusLabel,
  type ComplianceCaseStatusLite,
} from "@/lib/schemas/verification-stage-schema";

describe("isVerificationComplete", () => {
  it("returns false when all milestones are false", () => {
    expect(isVerificationComplete(VERIFICATION_STAGE_DEFAULTS)).toBe(false);
  });

  it("returns false when only some milestones are complete", () => {
    expect(
      isVerificationComplete({
        entityVerificationPassed: true,
        uboReviewPassed: true,
        screeningPassed: false,
        complianceReviewPassed: false,
      }),
    ).toBe(false);
  });

  it("returns true when all milestones are complete", () => {
    expect(
      isVerificationComplete({
        entityVerificationPassed: true,
        uboReviewPassed: true,
        screeningPassed: true,
        complianceReviewPassed: true,
      }),
    ).toBe(true);
  });
});

/* ================================================================
   deriveVerificationFromCase — authoritative compliance case mapping
   ================================================================ */

describe("deriveVerificationFromCase", () => {
  it("returns all false for null (no case)", () => {
    const result = deriveVerificationFromCase(null);
    expect(result).toEqual(VERIFICATION_STAGE_DEFAULTS);
    expect(isVerificationComplete(result)).toBe(false);
  });

  it("returns all false for OPEN status", () => {
    const result = deriveVerificationFromCase("OPEN");
    expect(result).toEqual(VERIFICATION_STAGE_DEFAULTS);
  });

  it("returns all false for PENDING_USER status", () => {
    const result = deriveVerificationFromCase("PENDING_USER");
    expect(result.entityVerificationPassed).toBe(false);
    expect(result.uboReviewPassed).toBe(false);
    expect(result.screeningPassed).toBe(false);
    expect(result.complianceReviewPassed).toBe(false);
  });

  it("returns entity=true for PENDING_PROVIDER", () => {
    const result = deriveVerificationFromCase("PENDING_PROVIDER");
    expect(result.entityVerificationPassed).toBe(true);
    expect(result.uboReviewPassed).toBe(false);
    expect(result.screeningPassed).toBe(false);
    expect(result.complianceReviewPassed).toBe(false);
  });

  it("returns entity+ubo+screening=true for UNDER_REVIEW", () => {
    const result = deriveVerificationFromCase("UNDER_REVIEW");
    expect(result.entityVerificationPassed).toBe(true);
    expect(result.uboReviewPassed).toBe(true);
    expect(result.screeningPassed).toBe(true);
    expect(result.complianceReviewPassed).toBe(false);
  });

  it("returns all true for APPROVED", () => {
    const result = deriveVerificationFromCase("APPROVED");
    expect(result.entityVerificationPassed).toBe(true);
    expect(result.uboReviewPassed).toBe(true);
    expect(result.screeningPassed).toBe(true);
    expect(result.complianceReviewPassed).toBe(true);
    expect(isVerificationComplete(result)).toBe(true);
  });

  it("returns all false for REJECTED (fail-closed)", () => {
    const result = deriveVerificationFromCase("REJECTED");
    expect(result).toEqual(VERIFICATION_STAGE_DEFAULTS);
  });

  it("returns all false for CLOSED (fail-closed)", () => {
    const result = deriveVerificationFromCase("CLOSED");
    expect(result).toEqual(VERIFICATION_STAGE_DEFAULTS);
  });

  it("APPROVED is the only status that passes isVerificationComplete", () => {
    const statuses: ComplianceCaseStatusLite[] = [
      "OPEN", "PENDING_USER", "PENDING_PROVIDER",
      "UNDER_REVIEW", "APPROVED", "REJECTED", "CLOSED",
    ];
    for (const status of statuses) {
      const result = deriveVerificationFromCase(status);
      if (status === "APPROVED") {
        expect(isVerificationComplete(result)).toBe(true);
      } else {
        expect(isVerificationComplete(result)).toBe(false);
      }
    }
  });
});

/* ================================================================
   getVerificationStatusLabel — human-readable status labels
   ================================================================ */

describe("getVerificationStatusLabel", () => {
  it("returns informative label for null (no case)", () => {
    const label = getVerificationStatusLabel(null);
    expect(label).toContain("not started");
  });

  it("returns success label for APPROVED", () => {
    const label = getVerificationStatusLabel("APPROVED");
    expect(label).toContain("verified");
  });

  it("returns review label for UNDER_REVIEW", () => {
    const label = getVerificationStatusLabel("UNDER_REVIEW");
    expect(label).toContain("review");
  });

  it("returns processing label for PENDING_PROVIDER", () => {
    const label = getVerificationStatusLabel("PENDING_PROVIDER");
    expect(label).toContain("processing");
  });

  it("returns action required for PENDING_USER", () => {
    const label = getVerificationStatusLabel("PENDING_USER");
    expect(label).toContain("Action required");
  });

  it("returns rejection label for REJECTED", () => {
    const label = getVerificationStatusLabel("REJECTED");
    expect(label).toContain("not approved");
  });
});


/* ================================================================
   Organization Stage — schema defaults validation
   ================================================================ */

import {
  organizationStageSchema,
  ORGANIZATION_STAGE_DEFAULTS,
} from "@/lib/schemas/organization-stage-schema";

describe("organizationStageSchema", () => {
  it("rejects empty-string required fields in defaults", () => {
    const result = organizationStageSchema.safeParse(ORGANIZATION_STAGE_DEFAULTS);
    // Defaults have empty strings for required fields like companyName,
    // jurisdiction, representativeName — these should fail min-length validation
    expect(result.success).toBe(false);
  });

  it("accepts valid complete data", () => {
    const result = organizationStageSchema.safeParse({
      companyName: "Meridian Capital Holdings Ltd.",
      jurisdiction: "US",
      legalEntityIdentifier: "5493001KJTIIGC8Y1R12",
      leiVerified: true,
      registrationNumber: "12345678",
      representativeName: "James Fletcher",
      representativeTitle: "CFO",
      contactEmail: "treasury@meridian.com",
      contactPhone: "+14155551234",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty LEI (optional)", () => {
    const result = organizationStageSchema.safeParse({
      companyName: "Meridian Capital Holdings Ltd.",
      jurisdiction: "US",
      legalEntityIdentifier: "",
      leiVerified: false,
      registrationNumber: "",
      representativeName: "James Fletcher",
      representativeTitle: "CFO",
      contactEmail: "treasury@meridian.com",
      contactPhone: "+14155551234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid LEI format (not 20 chars)", () => {
    const result = organizationStageSchema.safeParse({
      companyName: "Test Corp",
      jurisdiction: "US",
      legalEntityIdentifier: "SHORT",
      leiVerified: false,
      registrationNumber: "",
      representativeName: "Jane Doe",
      representativeTitle: "CEO",
      contactEmail: "jane@test.com",
      contactPhone: "+14155551234",
    });
    expect(result.success).toBe(false);
  });
});

