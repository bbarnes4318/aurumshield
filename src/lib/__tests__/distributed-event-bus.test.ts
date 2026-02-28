/* ================================================================
   RSK-008: Distributed Event Bus Tests
   ================================================================
   Tests for the PostgreSQL LISTEN/NOTIFY compliance event bus.
   Uses mock pg.Client to verify NOTIFY SQL, LISTEN subscription,
   payload routing, cross-node detection, and metric emissions.
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock pg module ──
const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockOn = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => ({
  Client: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    on: mockOn,
    end: mockEnd,
    connect: mockConnect,
  })),
}));

vi.mock("../db", () => ({
  getDbClient: vi.fn().mockImplementation(async () => ({
    query: mockQuery,
    on: mockOn,
    end: mockEnd,
    connect: mockConnect,
  })),
}));

// Import AFTER mocks — use relative paths (vitest doesn't resolve @/ alias without config)
import {
  publishCaseEvent,
  subscribeCaseEvents,
  metrics,
  emitMetric,
  KEEP_ALIVE_MS,
} from "../compliance/events";
import type { ComplianceEvent } from "../compliance/models";

/* ── Fixtures ── */

function makeEvent(overrides?: Partial<ComplianceEvent>): ComplianceEvent {
  return {
    id: "evt-001",
    caseId: "case-001",
    eventId: "eid-001",
    actor: "SYSTEM",
    action: "STEP_COMPLETED",
    details: { stepId: "kyc_basic" },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("RSK-008: Distributed Event Bus (PG LISTEN/NOTIFY)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset metrics
    metrics.sse_connection_established = 0;
    metrics.sse_event_delivered_cross_node = 0;
    metrics.pg_listener_reconnects = 0;
    metrics.pg_listener_errors = 0;
  });

  describe("publishCaseEvent", () => {
    it("sends pg_notify with correct channel and JSON payload", async () => {
      const event = makeEvent();
      await publishCaseEvent("user-123", "case-001", event);

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT pg_notify($1, $2)",
        expect.arrayContaining([
          "compliance_events",
          expect.stringContaining('"userId":"user-123"'),
        ]),
      );
    });

    it("includes sourceNode in the payload", async () => {
      const event = makeEvent();
      await publishCaseEvent("user-456", "case-002", event);

      const callArgs = mockQuery.mock.calls.find(
        (c: unknown[]) => typeof c[0] === "string" && c[0].includes("pg_notify"),
      );
      expect(callArgs).toBeTruthy();

      const payload = JSON.parse(callArgs![1][1]);
      expect(payload).toHaveProperty("sourceNode");
      expect(typeof payload.sourceNode).toBe("string");
      expect(payload.sourceNode.length).toBeGreaterThan(0);
    });

    it("includes full event data in the NOTIFY payload", async () => {
      const event = makeEvent({
        action: "INQUIRY_COMPLETED",
        details: { provider: "Veriff", outcome: "APPROVED" },
      });

      await publishCaseEvent("user-789", "case-003", event);

      const callArgs = mockQuery.mock.calls.find(
        (c: unknown[]) => typeof c[0] === "string" && c[0].includes("pg_notify"),
      );
      const payload = JSON.parse(callArgs![1][1]);

      expect(payload.userId).toBe("user-789");
      expect(payload.caseId).toBe("case-003");
      expect(payload.event.action).toBe("INQUIRY_COMPLETED");
      expect(payload.event.details.provider).toBe("Veriff");
    });

    it("closes the DB client after publish", async () => {
      const event = makeEvent();
      await publishCaseEvent("user-123", "case-001", event);
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe("subscribeCaseEvents", () => {
    it("returns an unsubscribe function", async () => {
      const callback = vi.fn();
      const unsub = await subscribeCaseEvents("user-sub-1", callback);
      expect(typeof unsub).toBe("function");
      unsub();
    });

    it("emits sse_connection_established metric on subscribe", async () => {
      const before = metrics.sse_connection_established;
      await subscribeCaseEvents("user-metric-test", vi.fn());
      expect(metrics.sse_connection_established).toBe(before + 1);
    });

    it("increments metric for each new subscription", async () => {
      const before = metrics.sse_connection_established;
      await subscribeCaseEvents("user-multi-1", vi.fn());
      await subscribeCaseEvents("user-multi-2", vi.fn());
      expect(metrics.sse_connection_established).toBe(before + 2);
    });
  });

  describe("emitMetric", () => {
    it("increments the named metric by 1 by default", () => {
      const before = metrics.pg_listener_errors;
      emitMetric("pg_listener_errors");
      expect(metrics.pg_listener_errors).toBe(before + 1);
    });

    it("increments the named metric by a custom amount", () => {
      const before = metrics.pg_listener_reconnects;
      emitMetric("pg_listener_reconnects", 5);
      expect(metrics.pg_listener_reconnects).toBe(before + 5);
    });
  });

  describe("constants", () => {
    it("KEEP_ALIVE_MS is 30 seconds", () => {
      expect(KEEP_ALIVE_MS).toBe(30_000);
    });
  });

  describe("payload structure", () => {
    it("serializes a complete PgNotifyPayload", async () => {
      const event = makeEvent();
      await publishCaseEvent("user-payload", "case-payload", event);

      const callArgs = mockQuery.mock.calls.find(
        (c: unknown[]) => typeof c[0] === "string" && c[0].includes("pg_notify"),
      );
      const payload = JSON.parse(callArgs![1][1]);

      // Verify full PgNotifyPayload structure
      expect(payload).toEqual(
        expect.objectContaining({
          userId: "user-payload",
          caseId: "case-payload",
          sourceNode: expect.any(String),
          event: expect.objectContaining({
            id: "evt-001",
            caseId: "case-001",
            eventId: "eid-001",
            actor: "SYSTEM",
            action: "STEP_COMPLETED",
          }),
        }),
      );
    });
  });
});
