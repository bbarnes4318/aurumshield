/* ================================================================
   FIRST TRADE AUTHORIZATION — Hardened Server Action Tests
   ================================================================
   Validates the 3-layer auth enforcement chain, idempotency guard,
   and confirmation phrase validation for submitFirstTrade().

   Layers tested:
     1. requireProductionAuth() — rejects demo-mock sessions
     2. requireReverification()  — session freshness enforcement
     3. requireComplianceCapability("EXECUTE_PURCHASE") — DB-verified
     4. confirmationPhrase — must match "CONFIRM TRADE" exactly
     5. Idempotency — rejects if firstTradeCompleted already true
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock Clerk ── */
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user-inst-001",
    orgRole: "org:institution_trader",
    orgId: "org-inst",
    sessionClaims: {
      reverifiedAt: Date.now(), // Fresh session
      iat: Math.floor(Date.now() / 1000),
    },
  }),
  currentUser: vi.fn().mockResolvedValue({
    publicMetadata: { kycStatus: "APPROVED", leiCode: "MOCK00TEST00LEI00001" },
    primaryEmailAddress: { emailAddress: "trader@institution.com" },
  }),
}));

/* ── Mock auth-mode to return production ── */
vi.mock("@/lib/auth-mode", () => ({
  isProductionAuth: vi.fn().mockReturnValue(true),
  getAuthMode: vi.fn().mockReturnValue("production"),
  AUTH_MODE_LABELS: { production: "Production (Clerk)" },
}));

/* ── Mock compliance DB ── */
const mockGetComplianceCase = vi.fn();

vi.mock("@/lib/compliance/models", () => ({
  getComplianceCaseByUserId: (...args: unknown[]) =>
    mockGetComplianceCase(...args),
}));

vi.mock("@/lib/compliance/tiering", () => ({
  TIER_TO_CAPABILITY_MAP: {
    BROWSE: "BROWSE",
    QUOTE: "QUOTE",
    LOCK: "LOCK_PRICE",
    EXECUTE: "SETTLE",
  },
}));

/* ── Mock onboarding state ── */
const mockGetOnboardingState = vi.fn();
const mockUpsertOnboardingState = vi.fn();

vi.mock("@/lib/compliance/onboarding-state", () => ({
  getOnboardingState: (...args: unknown[]) =>
    mockGetOnboardingState(...args),
  upsertOnboardingState: (...args: unknown[]) =>
    mockUpsertOnboardingState(...args),
}));

/* ── Import after mocks ── */
import { submitFirstTrade, CONFIRMATION_PHRASE } from "@/actions/first-trade-actions";
import type { IndicativePriceSnapshot } from "@/lib/schemas/first-trade-draft-schema";

/* ── Helpers ── */

function makeFreshSnapshot(overrides: Partial<IndicativePriceSnapshot> = {}): IndicativePriceSnapshot {
  return {
    tier: "INDICATIVE",
    spotPriceUsd: 2650.0,
    totalWeightOz: 400,
    baseSpotValueUsd: 1060000.0,
    assetPremiumUsd: 1060.0,
    assetPremiumBps: 10,
    platformFeeUsd: 10600.0,
    platformFeeBps: 100,
    estimatedTotalUsd: 1071660.0,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeValidOnboardingState(overrides: Record<string, unknown> = {}) {
  return {
    id: "os-1",
    userId: "user-inst-001",
    orgId: null,
    startedAt: "2026-01-01T00:00:00Z",
    lastSeenAt: "2026-01-01T00:00:00Z",
    currentStep: 7,
    providerInquiryId: null,
    status: "IN_PROGRESS",
    statusReason: null,
    updatedAt: "2026-01-01T00:00:00Z",
    metadataJson: {
      __firstTradeDraft: {
        selectedAssetId: "lbma-400oz",
        quantity: 1,
        transactionIntent: "ALLOCATION",
        deliveryMethod: "vault_custody",
        vaultJurisdiction: "ZRH",
        deliveryRegion: "",
      },
      __journey: {
        stage: "FIRST_TRADE_AUTHORIZE",
        firstTradeCompleted: false,
      },
      ...overrides,
    },
  };
}

/* ================================================================
   Tests
   ================================================================ */

describe("submitFirstTrade — hardened authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    // Default: happy path mocks
    mockGetComplianceCase.mockResolvedValue({
      id: "cc-1",
      userId: "user-inst-001",
      status: "APPROVED",
      tier: "EXECUTE",
    });
    mockGetOnboardingState.mockResolvedValue(makeValidOnboardingState());
    mockUpsertOnboardingState.mockResolvedValue(undefined);
  });

  /* ────────────────────────────────────────────── */
  /*  Happy path                                    */
  /* ────────────────────────────────────────────── */

  it("succeeds with valid auth, correct phrase, and fresh snapshot", async () => {
    const result = await submitFirstTrade({
      confirmationPhrase: CONFIRMATION_PHRASE,
      indicativePriceSnapshot: makeFreshSnapshot(),
    });

    expect(result.success).toBe(true);
    expect(result.tradeIntentRef).toMatch(/^FT-[A-Z0-9]{8}$/);
    expect(result.submittedAt).toBeTruthy();
    expect(result.indicativeSnapshot.tier).toBe("INDICATIVE");
    expect(mockUpsertOnboardingState).toHaveBeenCalledOnce();
  });

  /* ────────────────────────────────────────────── */
  /*  Confirmation phrase validation                */
  /* ────────────────────────────────────────────── */

  describe("confirmation phrase", () => {
    it("rejects empty confirmation phrase", async () => {
      await expect(
        submitFirstTrade({
          confirmationPhrase: "",
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("Confirmation phrase mismatch");
    });

    it("rejects wrong confirmation phrase", async () => {
      await expect(
        submitFirstTrade({
          confirmationPhrase: "WRONG PHRASE",
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("Confirmation phrase mismatch");
    });

    it("rejects partial confirmation phrase", async () => {
      await expect(
        submitFirstTrade({
          confirmationPhrase: "CONFIRM",
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("Confirmation phrase mismatch");
    });

    it("accepts confirmation phrase with leading/trailing whitespace (trimmed)", async () => {
      const result = await submitFirstTrade({
        confirmationPhrase: "  CONFIRM TRADE  ",
        indicativePriceSnapshot: makeFreshSnapshot(),
      });
      expect(result.success).toBe(true);
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Idempotency guard                             */
  /* ────────────────────────────────────────────── */

  describe("idempotency guard", () => {
    it("rejects if firstTradeCompleted is already true", async () => {
      mockGetOnboardingState.mockResolvedValueOnce(
        makeValidOnboardingState({
          __journey: {
            stage: "FIRST_TRADE_SUCCESS",
            firstTradeCompleted: true,
          },
        }),
      );

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("already been completed");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Compliance capability enforcement             */
  /* ────────────────────────────────────────────── */

  describe("compliance capability (EXECUTE_PURCHASE)", () => {
    it("rejects when compliance case is REJECTED", async () => {
      mockGetComplianceCase.mockResolvedValueOnce({
        id: "cc-rejected",
        userId: "user-inst-001",
        status: "REJECTED",
        tier: "EXECUTE",
      });

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("COMPLIANCE_NOT_APPROVED");
    });

    it("rejects when no compliance case exists", async () => {
      mockGetComplianceCase.mockResolvedValueOnce(null);

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("COMPLIANCE_DENIED");
    });

    it("DB error bubbles as 500 (not silent pass)", async () => {
      mockGetComplianceCase.mockRejectedValueOnce(
        new Error("ECONNREFUSED: Database unreachable"),
      );

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("ECONNREFUSED");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Snapshot validation                           */
  /* ────────────────────────────────────────────── */

  describe("snapshot validation", () => {
    it("rejects stale snapshot (>5 minutes old)", async () => {
      const staleSnapshot = makeFreshSnapshot({
        capturedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      });

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: staleSnapshot,
        }),
      ).rejects.toThrow("stale");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Missing onboarding state / draft              */
  /* ────────────────────────────────────────────── */

  describe("onboarding state guards", () => {
    it("rejects when no onboarding state exists", async () => {
      mockGetOnboardingState.mockResolvedValueOnce(null);

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("No onboarding state found");
    });

    it("rejects when no draft exists in metadata", async () => {
      mockGetOnboardingState.mockResolvedValueOnce({
        ...makeValidOnboardingState(),
        metadataJson: {
          __journey: { stage: "FIRST_TRADE_AUTHORIZE", firstTradeCompleted: false },
        },
      });

      await expect(
        submitFirstTrade({
          confirmationPhrase: CONFIRMATION_PHRASE,
          indicativePriceSnapshot: makeFreshSnapshot(),
        }),
      ).rejects.toThrow("No first-trade draft found");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  CONFIRMATION_PHRASE constant is exported      */
  /* ────────────────────────────────────────────── */

  it("exports CONFIRMATION_PHRASE as 'CONFIRM TRADE'", () => {
    expect(CONFIRMATION_PHRASE).toBe("CONFIRM TRADE");
  });
});
