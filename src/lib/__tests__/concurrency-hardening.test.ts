/* ================================================================
   CONCURRENCY HARDENING TESTS — Prompt 7
   ================================================================
   Validates that critical compliance mutation paths are protected
   against race conditions, duplicate mutations, and stale reads.

   Tests verify:
     1. Task completion idempotency (already-completed throws)
     2. Case disposition guard (non-READY status throws)
     3. Four-eyes enforcement (same reviewer blocked)
     4. Case assignment guard (terminal status throws)
     5. Webhook replay safety (duplicate delivery skipped)
     6. Freshness sweep guard (function exists with correct exports)
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Module mocks (must precede imports) ── */

vi.mock("server-only", () => ({}));

vi.mock("@/db/drizzle", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/compliance/audit-log", () => ({
  appendEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/compliance/evidence-hashing", () => ({
  generateEvidenceHash: vi.fn(() => "mock-hash-0x1234"),
}));

/* ── Import after mocks ── */
import { getDb } from "@/db/drizzle";

/* ── UUID helper ── */
function uuid(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}-0000-0000-000000000000`;
}

/**
 * Creates a mock Drizzle DB instance that supports:
 *   - db.select().from().where().limit() → resolves to selectRows
 *   - db.update().set().where() → resolves to { rowCount }
 *   - db.insert().values().returning() → resolves to insertRows
 *   - db.delete().where() → resolves
 *   - db.transaction(cb) → invokes cb(db) transparently
 *
 * For multi-step flows that need different results per query,
 * use selectSequence to return different rows on each .where() call.
 */
function createMockDb(opts: {
  selectRows?: unknown[];
  selectSequence?: unknown[][];
  insertRows?: unknown[];
  updateRowCount?: number;
}) {
  const {
    selectRows = [],
    selectSequence,
    insertRows = [{ id: uuid("gen", 1) }],
    updateRowCount = 1,
  } = opts;

  let selectCallIndex = 0;

  function getSelectRows() {
    if (selectSequence && selectCallIndex < selectSequence.length) {
      return selectSequence[selectCallIndex++];
    }
    return selectRows;
  }

  const makeWhereResult = () => ({
    limit: vi.fn().mockImplementation(() => Promise.resolve(getSelectRows())),
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockImplementation(() => Promise.resolve(getSelectRows())),
    }),
  });

  const db: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => makeWhereResult()),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => makeWhereResult()),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => Promise.resolve(getSelectRows())),
        }),
        limit: vi.fn().mockImplementation(() => Promise.resolve(getSelectRows())),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(insertRows),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: updateRowCount }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    transaction: vi.fn(),
  };

  // Transaction transparently invokes callback with same db
  db.transaction.mockImplementation(
    async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
  );

  return db;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Concurrency Hardening — Prompt 7", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TASK COMPLETION — Already completed task throws
  // ─────────────────────────────────────────────────────────────────────────────

  describe("completeTask() — idempotency", () => {
    it("should throw when task is already COMPLETED", async () => {
      const db = createMockDb({
        selectRows: [{
          id: uuid("task", 1),
          caseId: uuid("case", 1),
          taskType: "REVIEW_SANCTIONS_HIT",
          status: "COMPLETED",
          required: true,
          completedAt: new Date(),
        }],
      });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { completeTask } = await import("@/lib/compliance/case-service");

      await expect(
        completeTask(uuid("task", 1), uuid("user", 1), "notes"),
      ).rejects.toThrow(/ALREADY_COMPLETE|TaskAlreadyComplete/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CASE DISPOSITION — Non-READY status throws
  // ─────────────────────────────────────────────────────────────────────────────

  describe("dispositionCase() — status guard", () => {
    it("should throw when case is already APPROVED", async () => {
      const db = createMockDb({
        selectRows: [{
          id: uuid("case", 1),
          subjectId: uuid("subj", 1),
          caseType: "IDENTITY_VERIFICATION",
          status: "APPROVED",
          priority: 50,
          assignedReviewerId: uuid("user", 1),
        }],
      });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { dispositionCase } = await import("@/lib/compliance/manual-review-rules");

      await expect(
        dispositionCase(uuid("case", 1), uuid("user", 2), "APPROVED", "test"),
      ).rejects.toThrow(/NOT_READY|CaseNotReady/);
    });

    it("should throw when case is already REJECTED", async () => {
      const db = createMockDb({
        selectRows: [{
          id: uuid("case", 1),
          subjectId: uuid("subj", 1),
          caseType: "IDENTITY_VERIFICATION",
          status: "REJECTED",
          priority: 50,
          assignedReviewerId: uuid("user", 1),
        }],
      });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { dispositionCase } = await import("@/lib/compliance/manual-review-rules");

      await expect(
        dispositionCase(uuid("case", 1), uuid("user", 2), "REJECTED", "test"),
      ).rejects.toThrow(/NOT_READY|CaseNotReady/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FOUR-EYES — Same reviewer throws on high-priority
  // ─────────────────────────────────────────────────────────────────────────────

  describe("dispositionCase() — four-eyes enforcement", () => {
    it("should throw when same reviewer dispositions high-priority case", async () => {
      const reviewerId = uuid("user", 1);
      const caseData = {
        id: uuid("case", 1),
        subjectId: uuid("subj", 1),
        caseType: "IDENTITY_VERIFICATION",
        status: "READY_FOR_DISPOSITION",
        priority: 90,
        assignedReviewerId: reviewerId,
      };
      const subjectData = {
        id: uuid("subj", 1),
        legalName: "Test Corp",
        subjectType: "INDIVIDUAL",
        status: "ACTIVE",
        riskTier: "HIGH",
      };

      // First SELECT returns case, second returns subject
      const db = createMockDb({
        selectSequence: [[caseData], [subjectData]],
      });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { dispositionCase } = await import("@/lib/compliance/manual-review-rules");

      await expect(
        dispositionCase(uuid("case", 1), reviewerId, "APPROVED", "all clear"),
      ).rejects.toThrow(/DUAL_SIGNOFF|DualSignoff/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CASE ASSIGNMENT — Terminal status throws
  // ─────────────────────────────────────────────────────────────────────────────

  describe("assignCase() — conditional guard", () => {
    it("should throw when case status is terminal", async () => {
      const db = createMockDb({
        selectRows: [{
          id: uuid("case", 1),
          subjectId: uuid("subj", 1),
          caseType: "IDENTITY_VERIFICATION",
          status: "APPROVED",
          priority: 50,
          assignedReviewerId: null,
        }],
      });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { assignCase } = await import("@/lib/compliance/case-service");

      await expect(
        assignCase(uuid("case", 1), uuid("user", 2), uuid("user", 3)),
      ).rejects.toThrow(/NOT_REVIEWABLE|CaseNotReviewable/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. WEBHOOK REPLAY — Already-completed check skips update
  // ─────────────────────────────────────────────────────────────────────────────

  describe("iDenfy webhook — replay idempotency", () => {
    it("should return checkUpdated=false for already-completed check", async () => {
      const completedCheck = {
        id: uuid("check", 1),
        caseId: uuid("case", 1),
        checkType: "IDENTITY_DOCUMENT",
        status: "COMPLETED",
        normalizedVerdict: "PASS",
        completedAt: new Date(),
        resultCode: "DOC_VERIFIED",
      };

      const db = createMockDb({ selectRows: [completedCheck] });
      vi.mocked(getDb).mockResolvedValue(db as never);

      const { processIdenfyWebhook } = await import("@/lib/compliance/idenfy-webhook-handler");

      const mockPayload = {
        scanRef: "scan-001",
        clientId: uuid("subj", 1),
        status: {
          overall: "APPROVED" as const,
          suspicionReasons: [] as string[],
          denialReasons: [] as string[],
        },
        AML: [] as never[],
      };

      const result = await processIdenfyWebhook(
        JSON.stringify(mockPayload),
        null,
        mockPayload,
        uuid("user", 1),
      );

      expect(result.checkUpdated).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. FRESHNESS — Service exports with correct guard
  // ─────────────────────────────────────────────────────────────────────────────

  describe("check-freshness — conditional guard", () => {
    it("should export evaluateCheckFreshness function", async () => {
      const { evaluateCheckFreshness } = await import("@/lib/compliance/check-freshness-service");
      expect(evaluateCheckFreshness).toBeDefined();
      expect(typeof evaluateCheckFreshness).toBe("function");
    });
  });
});
