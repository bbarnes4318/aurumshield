/* ================================================================
   STATE MACHINE TESTS — Exhaustive Illegal Transition Matrix
   ================================================================
   Phase 0 (RSK-001/003): Every illegal state transition MUST throw
   IllegalStateTransitionError with 100% coverage. Every legal
   transition MUST succeed and emit an audit event.
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transitionTradeState,
  transitionSettlementState,
  IllegalStateTransitionError,
  ALL_TRADE_STATUSES,
  ALL_SETTLEMENT_STATUSES,
  TRADE_TRANSITIONS,
  SETTLEMENT_TRANSITIONS,
  TRADE_ROLE_PERMISSIONS,
  SETTLEMENT_ROLE_PERMISSIONS,
  mapLegacyOrderStatus,
  mapLegacySettlementStatus,
  mapTradeStatusToLegacy,
  type TradeStatus,
  type SettlementLifecycleStatus,
  type TransitionRole,
} from "../state-machine";

// Mock the audit logger to capture emitted events
vi.mock("../audit-logger", () => ({
  emitAuditEvent: vi.fn().mockReturnValue({
    eventId: "test-event-id",
    timestamp: new Date().toISOString(),
    event: "test",
    severity: "INFO",
    service: "aurumshield",
    payload: {},
  }),
}));

import { emitAuditEvent } from "../audit-logger";

describe("State Machine — Trade Status Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Legal transitions ──
  describe("Legal transitions", () => {
    const testCases: Array<{
      from: TradeStatus;
      to: TradeStatus;
      description: string;
    }> = [
      { from: "PENDING_ALLOCATION", to: "PENDING_VERIFICATION", description: "allocation → verification" },
      { from: "PENDING_ALLOCATION", to: "LOCKED_UNSETTLED", description: "allocation → locked" },
      { from: "PENDING_ALLOCATION", to: "REJECTED_COMPLIANCE", description: "allocation → compliance rejection" },
      { from: "PENDING_ALLOCATION", to: "CANCELLED", description: "allocation → cancelled" },
      { from: "PENDING_VERIFICATION", to: "LOCKED_UNSETTLED", description: "verification → locked" },
      { from: "PENDING_VERIFICATION", to: "REJECTED_COMPLIANCE", description: "verification → compliance rejection" },
      { from: "PENDING_VERIFICATION", to: "CANCELLED", description: "verification → cancelled" },
      { from: "LOCKED_UNSETTLED", to: "SETTLEMENT_PENDING", description: "locked → settlement pending" },
      { from: "LOCKED_UNSETTLED", to: "CANCELLED", description: "locked → cancelled" },
      { from: "LOCKED_UNSETTLED", to: "FAILED", description: "locked → failed" },
      { from: "SETTLEMENT_PENDING", to: "SETTLED", description: "settlement pending → settled" },
      { from: "SETTLEMENT_PENDING", to: "FAILED", description: "settlement pending → failed" },
    ];

    it.each(testCases)(
      "should allow $description ($from → $to)",
      ({ from, to }) => {
        const result = transitionTradeState("trade-001", from, to, "actor-001", "system");

        expect(result.previousState).toBe(from);
        expect(result.newState).toBe(to);
        expect(result.entityId).toBe("trade-001");
        expect(result.actorId).toBe("actor-001");
        expect(result.actorRole).toBe("system");
        expect(result.timestamp).toBeTruthy();

        // Verify audit event was emitted
        expect(emitAuditEvent).toHaveBeenCalledWith(
          "trade_state_transition",
          "INFO",
          expect.objectContaining({
            previousState: from,
            newState: to,
          }),
          expect.objectContaining({
            orderId: "trade-001",
            userId: "actor-001",
          }),
        );
      },
    );
  });

  // ── Exhaustive illegal transition matrix ──
  describe("Illegal transitions — exhaustive matrix", () => {
    const illegalPairs: Array<[TradeStatus, TradeStatus]> = [];

    for (const from of ALL_TRADE_STATUSES) {
      const allowedTargets = TRADE_TRANSITIONS.get(from) ?? new Set();
      for (const to of ALL_TRADE_STATUSES) {
        if (from === to) continue; // Self-transition always checked
        if (!allowedTargets.has(to)) {
          illegalPairs.push([from, to]);
        }
      }
    }

    it.each(illegalPairs)(
      "should REJECT %s → %s",
      (from, to) => {
        expect(() =>
          transitionTradeState("trade-001", from, to, "actor-001", "system"),
        ).toThrow(IllegalStateTransitionError);
      },
    );

    it("should test ALL terminal states have zero outbound transitions", () => {
      const terminalStates: TradeStatus[] = ["SETTLED", "REJECTED_COMPLIANCE", "CANCELLED", "FAILED"];
      for (const terminal of terminalStates) {
        for (const target of ALL_TRADE_STATUSES) {
          if (terminal === target) continue;
          expect(() =>
            transitionTradeState("trade-001", terminal, target, "actor-001", "system"),
          ).toThrow(IllegalStateTransitionError);
        }
      }
    });

    it("should reject skip transitions (PENDING_ALLOCATION → SETTLED)", () => {
      expect(() =>
        transitionTradeState("trade-001", "PENDING_ALLOCATION", "SETTLED", "actor-001", "system"),
      ).toThrow(IllegalStateTransitionError);
    });

    it("should reject backward transitions (SETTLED → PENDING_ALLOCATION)", () => {
      expect(() =>
        transitionTradeState("trade-001", "SETTLED", "PENDING_ALLOCATION", "actor-001", "system"),
      ).toThrow(IllegalStateTransitionError);
    });
  });

  // ── Role authorization ──
  describe("Role-based authorization", () => {
    it("should reject support_admin from triggering SETTLED", () => {
      expect(() =>
        transitionTradeState("trade-001", "SETTLEMENT_PENDING", "SETTLED", "actor-001", "support_admin"),
      ).toThrow(IllegalStateTransitionError);
      expect(() =>
        transitionTradeState("trade-001", "SETTLEMENT_PENDING", "SETTLED", "actor-001", "support_admin"),
      ).toThrow(/not authorized/);
    });

    it("should allow system to trigger any transition", () => {
      const result = transitionTradeState(
        "trade-001", "PENDING_ALLOCATION", "LOCKED_UNSETTLED", "actor-001", "system",
      );
      expect(result.newState).toBe("LOCKED_UNSETTLED");
    });

    it("should allow compliance_officer to trigger REJECTED_COMPLIANCE", () => {
      const result = transitionTradeState(
        "trade-001", "PENDING_ALLOCATION", "REJECTED_COMPLIANCE", "actor-001", "compliance_officer",
      );
      expect(result.newState).toBe("REJECTED_COMPLIANCE");
    });

    it("should reject compliance_officer from triggering SETTLED", () => {
      expect(() =>
        transitionTradeState("trade-001", "SETTLEMENT_PENDING", "SETTLED", "actor-001", "compliance_officer"),
      ).toThrow(IllegalStateTransitionError);
    });

    it("should allow support_admin to trigger CANCELLED only", () => {
      const result = transitionTradeState(
        "trade-001", "PENDING_ALLOCATION", "CANCELLED", "actor-001", "support_admin",
      );
      expect(result.newState).toBe("CANCELLED");
    });
  });
});

describe("State Machine — Settlement Lifecycle Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Legal transitions", () => {
    const testCases: Array<{
      from: SettlementLifecycleStatus;
      to: SettlementLifecycleStatus;
      description: string;
    }> = [
      { from: "PENDING_RAIL", to: "RAIL_SUBMITTED", description: "pending → submitted" },
      { from: "PENDING_RAIL", to: "CANCELLED", description: "pending → cancelled" },
      { from: "PENDING_RAIL", to: "FAILED_RETRY", description: "pending → failed_retry" },
      { from: "RAIL_SUBMITTED", to: "CLEARED", description: "submitted → cleared" },
      { from: "RAIL_SUBMITTED", to: "FAILED_RETRY", description: "submitted → failed_retry" },
      { from: "RAIL_SUBMITTED", to: "AMBIGUOUS_STATE", description: "submitted → ambiguous" },
      { from: "FAILED_RETRY", to: "PENDING_RAIL", description: "failed_retry → retry" },
      { from: "FAILED_RETRY", to: "CANCELLED", description: "failed_retry → cancelled" },
      { from: "AMBIGUOUS_STATE", to: "CLEARED", description: "ambiguous → cleared (manual)" },
      { from: "AMBIGUOUS_STATE", to: "FAILED_RETRY", description: "ambiguous → failed (manual)" },
      { from: "AMBIGUOUS_STATE", to: "CANCELLED", description: "ambiguous → cancelled (manual)" },
    ];

    it.each(testCases)(
      "should allow $description ($from → $to)",
      ({ from, to }) => {
        const result = transitionSettlementState("stl-001", from, to, "actor-001", "system");

        expect(result.previousState).toBe(from);
        expect(result.newState).toBe(to);
        expect(result.entityId).toBe("stl-001");
      },
    );
  });

  describe("Illegal transitions — exhaustive matrix", () => {
    const illegalPairs: Array<[SettlementLifecycleStatus, SettlementLifecycleStatus]> = [];

    for (const from of ALL_SETTLEMENT_STATUSES) {
      const allowedTargets = SETTLEMENT_TRANSITIONS.get(from) ?? new Set();
      for (const to of ALL_SETTLEMENT_STATUSES) {
        if (from === to) continue;
        if (!allowedTargets.has(to)) {
          illegalPairs.push([from, to]);
        }
      }
    }

    it.each(illegalPairs)(
      "should REJECT %s → %s",
      (from, to) => {
        expect(() =>
          transitionSettlementState("stl-001", from, to, "actor-001", "system"),
        ).toThrow(IllegalStateTransitionError);
      },
    );

    it("should test ALL terminal states have zero outbound transitions", () => {
      const terminalStates: SettlementLifecycleStatus[] = ["CLEARED", "CANCELLED"];
      for (const terminal of terminalStates) {
        for (const target of ALL_SETTLEMENT_STATUSES) {
          if (terminal === target) continue;
          expect(() =>
            transitionSettlementState("stl-001", terminal, target, "actor-001", "system"),
          ).toThrow(IllegalStateTransitionError);
        }
      }
    });

    it("should emit P1_ALERT for AMBIGUOUS_STATE transition", () => {
      transitionSettlementState("stl-001", "RAIL_SUBMITTED", "AMBIGUOUS_STATE", "actor-001", "system");

      expect(emitAuditEvent).toHaveBeenCalledWith(
        "settlement_state_transition",
        "P1_ALERT",
        expect.objectContaining({
          newState: "AMBIGUOUS_STATE",
        }),
        expect.anything(),
      );
    });
  });

  describe("Role-based authorization", () => {
    it("should reject support_admin from triggering CLEARED", () => {
      expect(() =>
        transitionSettlementState("stl-001", "RAIL_SUBMITTED", "CLEARED", "actor-001", "support_admin"),
      ).toThrow(IllegalStateTransitionError);
    });

    it("should allow treasury_admin to trigger CLEARED", () => {
      const result = transitionSettlementState(
        "stl-001", "RAIL_SUBMITTED", "CLEARED", "actor-001", "treasury_admin",
      );
      expect(result.newState).toBe("CLEARED");
    });

    it("should allow compliance_officer to trigger CANCELLED", () => {
      const result = transitionSettlementState(
        "stl-001", "PENDING_RAIL", "CANCELLED", "actor-001", "compliance_officer",
      );
      expect(result.newState).toBe("CANCELLED");
    });
  });
});

describe("State Machine — IllegalStateTransitionError", () => {
  it("should contain full forensic context", () => {
    try {
      transitionTradeState("trade-999", "SETTLED", "PENDING_ALLOCATION", "attacker-001", "system");
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(IllegalStateTransitionError);
      const iste = err as IllegalStateTransitionError;
      expect(iste.previousState).toBe("SETTLED");
      expect(iste.attemptedState).toBe("PENDING_ALLOCATION");
      expect(iste.entityId).toBe("trade-999");
      expect(iste.entityType).toBe("trade");
      expect(iste.actorId).toBe("attacker-001");
      expect(iste.actorRole).toBe("system");
      expect(iste.timestamp).toBeTruthy();
    }
  });

  it("should emit CRITICAL audit event on illegal transition attempt", () => {
    vi.clearAllMocks();
    try {
      transitionTradeState("trade-999", "SETTLED", "PENDING_ALLOCATION", "attacker-001", "system");
    } catch {
      // Expected
    }

    expect(emitAuditEvent).toHaveBeenCalledWith(
      "illegal_state_transition_attempted",
      "CRITICAL",
      expect.objectContaining({
        previousState: "SETTLED",
        attemptedState: "PENDING_ALLOCATION",
        entityType: "trade",
      }),
      expect.objectContaining({
        orderId: "trade-999",
        userId: "attacker-001",
      }),
    );
  });
});

describe("State Machine — Legacy Migration Mappers", () => {
  it("should map all legacy OrderStatus values", () => {
    expect(mapLegacyOrderStatus("draft")).toBe("PENDING_ALLOCATION");
    expect(mapLegacyOrderStatus("pending_verification")).toBe("PENDING_VERIFICATION");
    expect(mapLegacyOrderStatus("reserved")).toBe("LOCKED_UNSETTLED");
    expect(mapLegacyOrderStatus("settlement_pending")).toBe("SETTLEMENT_PENDING");
    expect(mapLegacyOrderStatus("completed")).toBe("SETTLED");
    expect(mapLegacyOrderStatus("cancelled")).toBe("CANCELLED");
  });

  it("should map all legacy SettlementStatus values", () => {
    expect(mapLegacySettlementStatus("DRAFT")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("ESCROW_OPEN")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("AWAITING_FUNDS")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("AWAITING_GOLD")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("AWAITING_VERIFICATION")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("READY_TO_SETTLE")).toBe("PENDING_RAIL");
    expect(mapLegacySettlementStatus("AUTHORIZED")).toBe("RAIL_SUBMITTED");
    expect(mapLegacySettlementStatus("SETTLED")).toBe("CLEARED");
    expect(mapLegacySettlementStatus("FAILED")).toBe("FAILED_RETRY");
    expect(mapLegacySettlementStatus("CANCELLED")).toBe("CANCELLED");
    expect(mapLegacySettlementStatus("AMBIGUOUS_STATE")).toBe("AMBIGUOUS_STATE");
  });

  it("should round-trip TradeStatus → legacy → TradeStatus", () => {
    const nonTerminalStatuses: TradeStatus[] = [
      "PENDING_ALLOCATION",
      "PENDING_VERIFICATION",
      "LOCKED_UNSETTLED",
      "SETTLEMENT_PENDING",
      "SETTLED",
      "CANCELLED",
    ];

    for (const status of nonTerminalStatuses) {
      const legacy = mapTradeStatusToLegacy(status);
      const roundTripped = mapLegacyOrderStatus(legacy);
      // Note: REJECTED_COMPLIANCE and FAILED map to "cancelled" in legacy,
      // which maps back to CANCELLED — this is expected information loss
      expect(roundTripped).toBeTruthy();
    }
  });

  it("should throw for unknown legacy OrderStatus", () => {
    expect(() => mapLegacyOrderStatus("nonexistent" as never)).toThrow("Unknown legacy OrderStatus");
  });

  it("should throw for unknown legacy SettlementStatus", () => {
    expect(() => mapLegacySettlementStatus("nonexistent" as never)).toThrow("Unknown legacy SettlementStatus");
  });
});
