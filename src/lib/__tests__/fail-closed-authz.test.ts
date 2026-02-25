/* ================================================================
   RSK-012: Fail-Closed Authorization Enforcement — Security Tests
   ================================================================
   Validates:
     1. Protected capabilities (LOCK_PRICE, EXECUTE_PURCHASE, SETTLE)
        REQUIRE a DB-verified APPROVED compliance case
     2. DB errors bubble as uncaught exceptions (500), not fallback
     3. Missing/non-APPROVED compliance case → 403
     4. Low-privilege capabilities (BROWSE, QUOTE) still fall back
        to KYC_CAPABILITY_MAP when DB fails
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock Clerk ── */
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user-verified",
    orgRole: "org:buyer",
    orgId: "org-1",
  }),
  currentUser: vi.fn().mockResolvedValue({
    publicMetadata: { kycStatus: "APPROVED" },
    primaryEmailAddress: { emailAddress: "buyer@test.com" },
  }),
}));

/* ── Track compliance DB calls ── */
const mockGetComplianceCase = vi.fn();

vi.mock("@/lib/compliance/models", () => ({
  getComplianceCaseByUserId: (...args: unknown[]) => mockGetComplianceCase(...args),
}));

vi.mock("@/lib/compliance/tiering", () => ({
  TIER_TO_CAPABILITY_MAP: {
    BROWSE: "BROWSE",
    QUOTE: "QUOTE",
    LOCK: "LOCK_PRICE",
    EXECUTE: "SETTLE",
  },
}));

/* ── Import after mocks ── */
import { requireComplianceCapability, AuthError } from "../authz";

describe("RSK-012: Fail-Closed Authorization Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ────────────────────────────────────────────── */
  /*  Protected capabilities — DB-only path         */
  /* ────────────────────────────────────────────── */

  describe("protected capabilities (LOCK_PRICE, EXECUTE_PURCHASE, SETTLE)", () => {
    const protectedCaps = ["LOCK_PRICE", "EXECUTE_PURCHASE", "SETTLE"] as const;

    for (const cap of protectedCaps) {
      it(`${cap}: grants access with APPROVED EXECUTE-tier compliance case`, async () => {
        mockGetComplianceCase.mockResolvedValueOnce({
          id: "cc-1",
          userId: "user-verified",
          status: "APPROVED",
          tier: "EXECUTE",
        });

        const session = await requireComplianceCapability(cap);
        expect(session.userId).toBeDefined();
        expect(mockGetComplianceCase).toHaveBeenCalledOnce();
      });

      it(`${cap}: throws 403 when no compliance case exists (null)`, async () => {
        mockGetComplianceCase.mockResolvedValueOnce(null);

        await expect(requireComplianceCapability(cap)).rejects.toThrow(
          expect.objectContaining({
            statusCode: 403,
            message: expect.stringContaining("COMPLIANCE_DENIED"),
          }),
        );
      });

      it(`${cap}: throws 403 when compliance case is PENDING (not APPROVED)`, async () => {
        mockGetComplianceCase.mockResolvedValueOnce({
          id: "cc-2",
          userId: "user-verified",
          status: "PENDING",
          tier: "EXECUTE",
        });

        await expect(requireComplianceCapability(cap)).rejects.toThrow(
          expect.objectContaining({
            statusCode: 403,
            message: expect.stringContaining("COMPLIANCE_DENIED"),
          }),
        );
      });

      it(`${cap}: throws 403 when compliance case is REJECTED`, async () => {
        mockGetComplianceCase.mockResolvedValueOnce({
          id: "cc-3",
          userId: "user-verified",
          status: "REJECTED",
          tier: "EXECUTE",
        });

        await expect(requireComplianceCapability(cap)).rejects.toThrow(
          expect.objectContaining({
            statusCode: 403,
            message: expect.stringContaining("COMPLIANCE_DENIED"),
          }),
        );
      });

      it(`${cap}: DB error bubbles as unhandled exception (500), NOT silent fallback`, async () => {
        const dbError = new Error("ECONNREFUSED: Database unreachable");
        mockGetComplianceCase.mockRejectedValueOnce(dbError);

        // Must NOT catch this and fall back to JWT. The raw error must propagate.
        await expect(requireComplianceCapability(cap)).rejects.toThrow(
          "ECONNREFUSED: Database unreachable",
        );

        // Specifically: it must NOT throw an AuthError (which would indicate
        // the function caught the error and continued to check KYC_CAPABILITY_MAP)
        try {
          mockGetComplianceCase.mockRejectedValueOnce(dbError);
          await requireComplianceCapability(cap);
        } catch (err) {
          expect(err).not.toBeInstanceOf(AuthError);
          expect(err).toBeInstanceOf(Error);
          expect((err as Error).message).toBe("ECONNREFUSED: Database unreachable");
        }
      });
    }

    it("LOCK_PRICE: throws 403 when tier is BROWSE (insufficient)", async () => {
      mockGetComplianceCase.mockResolvedValueOnce({
        id: "cc-browse",
        userId: "user-verified",
        status: "APPROVED",
        tier: "BROWSE",
      });

      await expect(requireComplianceCapability("LOCK_PRICE")).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining("COMPLIANCE_TIER_INSUFFICIENT"),
        }),
      );
    });

    it("SETTLE: succeeds with APPROVED EXECUTE-tier case", async () => {
      mockGetComplianceCase.mockResolvedValueOnce({
        id: "cc-execute",
        userId: "user-verified",
        status: "APPROVED",
        tier: "EXECUTE",
      });

      const session = await requireComplianceCapability("SETTLE");
      expect(session.userId).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Low-privilege capabilities — KYC fallback OK  */
  /* ────────────────────────────────────────────── */

  describe("low-privilege capabilities (BROWSE, QUOTE)", () => {
    it("BROWSE: succeeds via KYC fallback even when DB fails", async () => {
      mockGetComplianceCase.mockRejectedValueOnce(new Error("DB timeout"));

      // Should NOT throw — KYC_CAPABILITY_MAP fallback grants BROWSE
      const session = await requireComplianceCapability("BROWSE");
      expect(session.userId).toBeDefined();
    });

    it("QUOTE: succeeds via KYC fallback when DB fails (user has APPROVED KYC)", async () => {
      mockGetComplianceCase.mockRejectedValueOnce(new Error("DB timeout"));

      // KYC_CAPABILITY_MAP["APPROVED"] = "SETTLE" which is >= "QUOTE"
      const session = await requireComplianceCapability("QUOTE");
      expect(session.userId).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Sanctions scenario                            */
  /* ────────────────────────────────────────────── */

  describe("sanctions ban scenario (the attack vector RSK-012 closes)", () => {
    it("banned user with stale JWT cannot execute LOCK_PRICE", async () => {
      // User was APPROVED hours ago → JWT says kycStatus: APPROVED
      // User was JUST banned → DB case is now REJECTED
      // Old behavior: DB fails → fallback to JWT → APPROVED → access granted
      // New behavior: DB says REJECTED → 403

      mockGetComplianceCase.mockResolvedValueOnce({
        id: "cc-banned",
        userId: "user-verified",
        status: "REJECTED",   // Banned for sanctions
        tier: "EXECUTE",      // Was formerly EXECUTE tier
      });

      await expect(requireComplianceCapability("LOCK_PRICE")).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining("COMPLIANCE_DENIED"),
        }),
      );
    });

    it("banned user with stale JWT + DB timeout → 500 (not silent pass)", async () => {
      // DB is unreachable AND user has stale APPROVED JWT
      // Old behavior: catch → fall back to JWT → APPROVED → access granted ← EXPLOIT
      // New behavior: error bubbles → 500 → execution halted

      mockGetComplianceCase.mockRejectedValueOnce(
        new Error("connection timeout"),
      );

      await expect(
        requireComplianceCapability("LOCK_PRICE"),
      ).rejects.toThrow("connection timeout");
    });
  });
});
