/* ================================================================
   RSK-009: Cryptographic State Machine Confinement Tests
   ================================================================
   Tests:
     1. Valid transitions succeed
     2. Invalid transitions throw StateTransitionConflictError
     3. Concurrent mutations: one succeeds, one fails cleanly
     4. Terminal states reject all transitions
     5. ALLOWED_TRANSITIONS matrix is exhaustive
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COMPLIANCE_CASE_STATUSES,
  ALLOWED_TRANSITIONS,
  StateTransitionConflictError,
  updateComplianceCaseStatus,
} from "../compliance/models";
import type { ComplianceCaseStatus } from "../compliance/models";

/* ── Mock DB ── */

const mockQueryFn = vi.fn();
const mockEndFn = vi.fn().mockResolvedValue(undefined);

vi.mock("../db", () => ({
  getDbClient: vi.fn().mockImplementation(async () => ({
    query: mockQueryFn,
    end: mockEndFn,
  })),
}));

// Also mock the @/ alias path — updateComplianceCaseStatus uses
// `await import("@/lib/db")` which vitest resolves differently
vi.mock("@/lib/db", () => ({
  getDbClient: vi.fn().mockImplementation(async () => ({
    query: mockQueryFn,
    end: mockEndFn,
  })),
}));

/* ── Helpers ── */

function mockDbRow(status: ComplianceCaseStatus) {
  return {
    id: "case-001",
    user_id: "user-001",
    org_id: null,
    status,
    tier: "BROWSE",
    org_type: null,
    jurisdiction: null,
    provider_inquiry_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("RSK-009: Cryptographic State Machine Confinement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ────────────────────────────────────────────── */
  /*  TRANSITION MATRIX COMPLETENESS               */
  /* ────────────────────────────────────────────── */

  describe("ALLOWED_TRANSITIONS matrix", () => {
    it("covers every status in COMPLIANCE_CASE_STATUSES", () => {
      for (const status of COMPLIANCE_CASE_STATUSES) {
        expect(ALLOWED_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(ALLOWED_TRANSITIONS[status])).toBe(true);
      }
    });

    it("only references valid statuses as targets", () => {
      const validSet = new Set(COMPLIANCE_CASE_STATUSES);
      for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
        for (const target of targets) {
          expect(validSet.has(target as ComplianceCaseStatus)).toBe(true);
        }
      }
    });

    it("APPROVED is terminal (no outbound edges)", () => {
      expect(ALLOWED_TRANSITIONS.APPROVED).toHaveLength(0);
    });

    it("CLOSED is terminal (no outbound edges)", () => {
      expect(ALLOWED_TRANSITIONS.CLOSED).toHaveLength(0);
    });

    it("REJECTED allows re-application (→ OPEN only)", () => {
      expect(ALLOWED_TRANSITIONS.REJECTED).toEqual(["OPEN"]);
    });

    it("PENDING_PROVIDER can resolve directly to APPROVED or REJECTED", () => {
      expect(ALLOWED_TRANSITIONS.PENDING_PROVIDER).toContain("APPROVED");
      expect(ALLOWED_TRANSITIONS.PENDING_PROVIDER).toContain("REJECTED");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  VALID TRANSITIONS                             */
  /* ────────────────────────────────────────────── */

  describe("valid transitions", () => {
    it("OPEN → PENDING_USER succeeds", async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockDbRow("PENDING_USER")],
      });

      const result = await updateComplianceCaseStatus(
        "case-001",
        "PENDING_USER",
        "OPEN",
      );

      expect(result.status).toBe("PENDING_USER");
      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $2 AND status = $3"),
        expect.arrayContaining(["PENDING_USER", "case-001", "OPEN"]),
      );
    });

    it("PENDING_PROVIDER → APPROVED succeeds with tier promotion", async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockDbRow("APPROVED"), tier: "EXECUTE" }],
      });

      const result = await updateComplianceCaseStatus(
        "case-001",
        "APPROVED",
        "PENDING_PROVIDER",
        "EXECUTE",
      );

      expect(result.status).toBe("APPROVED");
      // $4 = tier
      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.stringContaining(", tier = $4"),
        expect.arrayContaining(["APPROVED", "case-001", "PENDING_PROVIDER", "EXECUTE"]),
      );
    });

    it("UNDER_REVIEW → REJECTED succeeds", async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockDbRow("REJECTED")],
      });

      const result = await updateComplianceCaseStatus(
        "case-001",
        "REJECTED",
        "UNDER_REVIEW",
      );

      expect(result.status).toBe("REJECTED");
    });

    it("REJECTED → OPEN (re-application) succeeds", async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockDbRow("OPEN")],
      });

      const result = await updateComplianceCaseStatus(
        "case-001",
        "OPEN",
        "REJECTED",
      );

      expect(result.status).toBe("OPEN");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  INVALID TRANSITIONS (matrix rejection)        */
  /* ────────────────────────────────────────────── */

  describe("invalid transitions (matrix rejection)", () => {
    it("OPEN → APPROVED is forbidden", async () => {
      await expect(
        updateComplianceCaseStatus("case-001", "APPROVED", "OPEN"),
      ).rejects.toThrow(StateTransitionConflictError);

      await expect(
        updateComplianceCaseStatus("case-001", "APPROVED", "OPEN"),
      ).rejects.toThrow("STATE_TRANSITION_DENIED");
    });

    it("REJECTED → APPROVED is forbidden (no bypass)", async () => {
      await expect(
        updateComplianceCaseStatus("case-001", "APPROVED", "REJECTED"),
      ).rejects.toThrow(StateTransitionConflictError);
    });

    it("APPROVED → anything is forbidden (terminal)", async () => {
      for (const target of COMPLIANCE_CASE_STATUSES) {
        if (target === "APPROVED") continue;
        await expect(
          updateComplianceCaseStatus("case-001", target, "APPROVED"),
        ).rejects.toThrow(StateTransitionConflictError);
      }
    });

    it("CLOSED → anything is forbidden (terminal)", async () => {
      for (const target of COMPLIANCE_CASE_STATUSES) {
        if (target === "CLOSED") continue;
        await expect(
          updateComplianceCaseStatus("case-001", target, "CLOSED"),
        ).rejects.toThrow(StateTransitionConflictError);
      }
    });

    it("error contains caseId, expectedStatus, and targetStatus", async () => {
      try {
        await updateComplianceCaseStatus("case-xyz", "APPROVED", "OPEN");
        throw new Error("Should not reach here");
      } catch (err) {
        expect(err).toBeInstanceOf(StateTransitionConflictError);
        const conflict = err as StateTransitionConflictError;
        expect(conflict.caseId).toBe("case-xyz");
        expect(conflict.expectedStatus).toBe("OPEN");
        expect(conflict.targetStatus).toBe("APPROVED");
      }
    });

    it("does not execute any DB query for invalid transitions", async () => {
      try {
        await updateComplianceCaseStatus("case-001", "APPROVED", "OPEN");
      } catch { /* expected */ }

      // No DB call should have been made
      expect(mockQueryFn).not.toHaveBeenCalled();
    });
  });

  /* ────────────────────────────────────────────── */
  /*  CONCURRENT CONFLICT (DB-level rejection)      */
  /* ────────────────────────────────────────────── */

  describe("concurrent conflict (DB-level rejection)", () => {
    it("throws StateTransitionConflictError when DB returns zero rows", async () => {
      // Simulate: the transition is valid per matrix, but another
      // process already moved the state before our UPDATE ran
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      try {
        await updateComplianceCaseStatus("case-001", "PENDING_USER", "OPEN");
        throw new Error("Should not reach here");
      } catch (err) {
        expect(err).toBeInstanceOf(StateTransitionConflictError);
        const conflict = err as StateTransitionConflictError;
        expect(conflict.message).toContain("STATE_TRANSITION_CONFLICT");
        expect(conflict.message).toContain("concurrent mutation detected");
        expect(conflict.caseId).toBe("case-001");
        expect(conflict.expectedStatus).toBe("OPEN");
        expect(conflict.targetStatus).toBe("PENDING_USER");
      }
    });

    it("DB client is cleaned up even on concurrent conflict", async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      try {
        await updateComplianceCaseStatus("case-001", "PENDING_USER", "OPEN");
      } catch { /* expected */ }

      expect(mockEndFn).toHaveBeenCalled();
    });
  });

  /* ────────────────────────────────────────────── */
  /*  RACE CONDITION SIMULATION                     */
  /* ────────────────────────────────────────────── */

  describe("race condition: two parallel transitions", () => {
    it("one succeeds and one fails when both target different statuses", async () => {
      // Simulate a race: two requests both read UNDER_REVIEW,
      // but the WHERE clause ensures only one UPDATE succeeds.
      //
      // Request A: DB returns the updated row (wins).
      // Request B: DB returns zero rows (loses — state already changed).

      // ── Request A (winner): UNDER_REVIEW → APPROVED ──
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockDbRow("APPROVED"), tier: "EXECUTE" }],
      });

      const winner = await updateComplianceCaseStatus(
        "case-001",
        "APPROVED",
        "UNDER_REVIEW",
        "EXECUTE",
      );
      expect(winner.status).toBe("APPROVED");

      // ── Request B (loser): UNDER_REVIEW → REJECTED ──
      // The DB now has status=APPROVED, so WHERE status='UNDER_REVIEW'
      // matches zero rows.
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      try {
        await updateComplianceCaseStatus(
          "case-001",
          "REJECTED",
          "UNDER_REVIEW",
        );
        throw new Error("Should not reach here");
      } catch (err) {
        expect(err).toBeInstanceOf(StateTransitionConflictError);
        const conflict = err as StateTransitionConflictError;
        expect(conflict.message).toContain("STATE_TRANSITION_CONFLICT");
        expect(conflict.message).toContain("concurrent mutation detected");
        expect(conflict.expectedStatus).toBe("UNDER_REVIEW");
        expect(conflict.targetStatus).toBe("REJECTED");
      }
    });

    it("both fail if both race on invalid transitions", async () => {
      // Both try invalid transitions from APPROVED (terminal)
      const [resultA, resultB] = await Promise.allSettled([
        updateComplianceCaseStatus("case-001", "OPEN", "APPROVED"),
        updateComplianceCaseStatus("case-001", "REJECTED", "APPROVED"),
      ]);

      // Both should fail at the matrix check — no DB calls needed
      expect(resultA.status).toBe("rejected");
      expect(resultB.status).toBe("rejected");
      expect(mockQueryFn).not.toHaveBeenCalled();
    });
  });
});
