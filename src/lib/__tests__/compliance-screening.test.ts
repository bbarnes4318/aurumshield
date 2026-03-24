/* ================================================================
   AML/PEP Screening Engine — Fail-Closed Security Tests
   ================================================================
   Validates:
     1. CLEARED: Yente returns score < 0.80 → { status: 'CLEARED' }
     2. REJECTED: Yente returns score ≥ 0.80 → { status: 'REJECTED' }
     3. Fail-closed on timeout: AbortController fires → COMPLIANCE_OFFLINE
     4. Fail-closed on network error: fetch rejects → COMPLIANCE_OFFLINE
     5. Fail-closed on HTTP error: Yente returns 500 → COMPLIANCE_OFFLINE
     6. Jurisdiction passthrough: country array populated when provided
     7. No-results scenario: empty results → CLEARED

   INVARIANT: screenCounterpartyEntity NEVER returns CLEARED when
   the fetch fails. Every test below enforces this.
   ================================================================ */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mock audit-logger so emitAuditEvent doesn't hit crypto ── */
vi.mock("@/lib/audit-logger", () => ({
  emitAuditEvent: vi.fn().mockReturnValue({
    eventId: "mock-event-id",
    timestamp: new Date().toISOString(),
    event: "MOCK",
    severity: "INFO",
    service: "aurumshield",
    payload: {},
  }),
}));

/* ── Mock global fetch ── */
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ── Mock authz so requireProductionAuth doesn't throw in test ── */
vi.mock("@/lib/authz", () => ({
  requireProductionAuth: vi.fn().mockResolvedValue({
    userId: "test-user",
    role: "compliance",
    kycStatus: "APPROVED",
    orgId: null,
    email: "test@aurumshield.io",
    leiCode: "TEST00MOCK00LEI00001",
    authSource: "clerk",
  }),
  requireSession: vi.fn().mockResolvedValue({
    userId: "test-user",
    role: "compliance",
    kycStatus: "APPROVED",
    orgId: null,
    email: "test@aurumshield.io",
    leiCode: "TEST00MOCK00LEI00001",
    authSource: "clerk",
  }),
}));

/* ── Import AFTER mocks ── */
import { screenCounterpartyEntity } from "@/actions/compliance-screening-actions";
import { emitAuditEvent } from "@/lib/audit-logger";

/* ── Helpers ── */

/** Build a mock Yente /match/default response */
function yenteResponse(results: Array<{ id: string; caption: string; score: number }>) {
  return {
    responses: {
      q1: {
        query: {},
        results: results.map((r) => ({
          id: r.id,
          caption: r.caption,
          schema: "LegalEntity",
          properties: {},
          datasets: ["default"],
          referents: [],
          score: r.score,
        })),
        total: { value: results.length, relation: "eq" },
      },
    },
  };
}

function mockFetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function mockFetchError(status: number, statusText: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: async () => ({ error: statusText }),
  });
}

describe("AML/PEP Screening Engine — screenCounterpartyEntity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ────────────────────────────────────────────── */
  /*  CLEARED scenarios                             */
  /* ────────────────────────────────────────────── */

  describe("CLEARED results", () => {
    it("returns CLEARED when top match score is below 0.80", async () => {
      mockFetchOk(yenteResponse([
        { id: "NK-001", caption: "Some Entity LLC", score: 0.65 },
      ]));

      const result = await screenCounterpartyEntity("Acme Corp");

      expect(result.status).toBe("CLEARED");
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(emitAuditEvent).toHaveBeenCalledWith(
        "AML_SCREENING_CLEARED",
        "INFO",
        expect.objectContaining({ legalName: "Acme Corp" }),
      );
    });

    it("returns CLEARED when Yente returns zero results", async () => {
      mockFetchOk(yenteResponse([]));

      const result = await screenCounterpartyEntity("Clean Entity AG");

      expect(result.status).toBe("CLEARED");
    });

    it("returns CLEARED when score is exactly 0.79 (boundary)", async () => {
      mockFetchOk(yenteResponse([
        { id: "NK-002", caption: "Almost Match", score: 0.79 },
      ]));

      const result = await screenCounterpartyEntity("Almost Match LLC");

      expect(result.status).toBe("CLEARED");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  REJECTED scenarios                            */
  /* ────────────────────────────────────────────── */

  describe("REJECTED results", () => {
    it("returns REJECTED when top match score >= 0.80", async () => {
      mockFetchOk(yenteResponse([
        { id: "NK-SanctionedEntity", caption: "Sanctioned Corp", score: 0.92 },
        { id: "NK-002", caption: "Similar Name", score: 0.45 },
      ]));

      const result = await screenCounterpartyEntity("Sanctioned Corp");

      expect(result.status).toBe("REJECTED");
      if (result.status === "REJECTED") {
        expect(result.reason).toBe("AML_WATCHLIST_MATCH");
        expect(result.matchId).toBe("NK-SanctionedEntity");
        expect(result.matchScore).toBe(0.92);
        expect(result.matchName).toBe("Sanctioned Corp");
      }

      expect(emitAuditEvent).toHaveBeenCalledWith(
        "AML_SCREENING_REJECTED",
        "CRITICAL",
        expect.objectContaining({
          matchId: "NK-SanctionedEntity",
          matchScore: 0.92,
        }),
      );
    });

    it("returns REJECTED at exactly 0.80 threshold (boundary)", async () => {
      mockFetchOk(yenteResponse([
        { id: "NK-BOUNDARY", caption: "Threshold Entity", score: 0.80 },
      ]));

      const result = await screenCounterpartyEntity("Threshold Entity");

      expect(result.status).toBe("REJECTED");
      if (result.status === "REJECTED") {
        expect(result.matchScore).toBe(0.80);
      }
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Fail-Closed enforcement                       */
  /* ────────────────────────────────────────────── */

  describe("fail-closed enforcement (the core security invariant)", () => {
    it("throws COMPLIANCE_OFFLINE on network error (fetch rejects)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        screenCounterpartyEntity("Any Entity"),
      ).rejects.toThrow("COMPLIANCE_OFFLINE");

      expect(emitAuditEvent).toHaveBeenCalledWith(
        "AML_SCREENING_OFFLINE",
        "P1_ALERT",
        expect.objectContaining({ error: "ECONNREFUSED" }),
      );
    });

    it("throws COMPLIANCE_OFFLINE on AbortController timeout", async () => {
      // Simulate a fetch that never resolves until abort fires
      mockFetch.mockImplementationOnce(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            if (init.signal.aborted) {
              reject(new DOMException("The operation was aborted.", "AbortError"));
              return;
            }
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted.", "AbortError")),
            );
          }),
      );

      const promise = screenCounterpartyEntity("Slow Entity");

      // IMPORTANT: Attach the rejection handler BEFORE advancing timers.
      // If we advance timers first, the promise rejects during advancement,
      // and Node flags it as PromiseRejectionHandledWarning because the
      // .rejects.toThrow() handler isn't attached until after advanceTimersByTimeAsync returns.
      const assertion = expect(promise).rejects.toThrow("COMPLIANCE_OFFLINE");

      // Now advance timers past the 3000ms timeout to fire the AbortController.
      // The rejection handler is already attached, so Node won't warn.
      await vi.advanceTimersByTimeAsync(3_100);

      await assertion;
    });

    it("throws COMPLIANCE_OFFLINE when Yente returns HTTP 500", async () => {
      mockFetchError(500, "Internal Server Error");

      await expect(
        screenCounterpartyEntity("Server Error Entity"),
      ).rejects.toThrow("COMPLIANCE_OFFLINE");

      expect(emitAuditEvent).toHaveBeenCalledWith(
        "AML_SCREENING_ERROR",
        "CRITICAL",
        expect.objectContaining({ httpStatus: 500 }),
      );
    });

    it("throws COMPLIANCE_OFFLINE when Yente returns HTTP 503", async () => {
      mockFetchError(503, "Service Unavailable");

      await expect(
        screenCounterpartyEntity("Unavailable Entity"),
      ).rejects.toThrow("COMPLIANCE_OFFLINE");
    });

    it("NEVER returns CLEARED on fetch failure (double-check invariant)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("DNS resolution failed"));

      try {
        const result = await screenCounterpartyEntity("Any Entity");
        // If we get here, the function returned instead of throwing — FAIL
        expect(result.status).not.toBe("CLEARED");
        // Force test failure — should never reach this
        expect.unreachable("screenCounterpartyEntity should have thrown");
      } catch (err) {
        // Expected path: it threw COMPLIANCE_OFFLINE
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain("COMPLIANCE_OFFLINE");
      }
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Jurisdiction passthrough                      */
  /* ────────────────────────────────────────────── */

  describe("jurisdiction handling", () => {
    it("includes country in the Yente payload when jurisdiction is provided", async () => {
      mockFetchOk(yenteResponse([]));

      await screenCounterpartyEntity("Swiss Corp AG", "Switzerland");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/match/default"),
        expect.objectContaining({
          body: expect.stringContaining('"country":["Switzerland"]'),
        }),
      );
    });

    it("omits country from the Yente payload when jurisdiction is undefined", async () => {
      mockFetchOk(yenteResponse([]));

      await screenCounterpartyEntity("No Jurisdiction LLC");

      const callBody = mockFetch.mock.calls[0][1].body;
      const parsed = JSON.parse(callBody);
      expect(parsed.queries.q1.properties.country).toBeUndefined();
    });
  });
});
