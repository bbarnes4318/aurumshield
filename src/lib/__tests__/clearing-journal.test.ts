/**
 * RSK-006: Immutable Double-Entry Clearing Ledger Tests
 *
 * Verifies:
 * 1. Balanced journal acceptance
 * 2. Unbalanced journal rejection
 * 3. Idempotent journal posting
 * 4. Empty journal rejection
 * 5. assertJournalBalanced standalone
 */

import { describe, it, expect } from "vitest";
import {
  postClearingJournal,
  assertJournalBalanced,
  UnbalancedJournalError,
} from "../settlement-engine";
import type { ClearingJournal, ClearingJournalEntry } from "../mock-data";

describe("RSK-006: Immutable Double-Entry Clearing Ledger", () => {
  const NOW = "2026-03-01T00:00:00Z";

  describe("postClearingJournal", () => {
    it("accepts a balanced journal (debit === credit)", () => {
      const journal = postClearingJournal(
        "stl-001",
        "idem-001",
        "Test settlement clearing",
        [
          {
            accountCode: "SETTLEMENT_ESCROW",
            direction: "DEBIT",
            amountCents: 205000,
            currency: "USD",
            memo: "Escrow release",
          },
          {
            accountCode: "SELLER_PROCEEDS",
            direction: "CREDIT",
            amountCents: 205000,
            currency: "USD",
            memo: "Seller payout",
          },
        ],
        NOW,
        "admin-001",
        [],
      );

      expect(journal.id).toBe("jnl-001");
      expect(journal.settlementCaseId).toBe("stl-001");
      expect(journal.idempotencyKey).toBe("idem-001");
      expect(journal.entries).toHaveLength(2);
      expect(journal.entries[0].direction).toBe("DEBIT");
      expect(journal.entries[1].direction).toBe("CREDIT");
      expect(journal.entries[0].amountCents).toBe(205000);
      expect(journal.entries[1].amountCents).toBe(205000);
    });

    it("accepts a 3-entry journal with fee split (debit = credit + fee)", () => {
      const journal = postClearingJournal(
        "stl-002",
        "idem-002",
        "Settlement with fee",
        [
          {
            accountCode: "SETTLEMENT_ESCROW",
            direction: "DEBIT",
            amountCents: 100000,
            currency: "USD",
          },
          {
            accountCode: "SELLER_PROCEEDS",
            direction: "CREDIT",
            amountCents: 99500,
            currency: "USD",
          },
          {
            accountCode: "PLATFORM_FEE",
            direction: "CREDIT",
            amountCents: 500,
            currency: "USD",
          },
        ],
        NOW,
        "admin-001",
        [],
      );

      expect(journal.entries).toHaveLength(3);
      // Sum check
      const debits = journal.entries
        .filter((e) => e.direction === "DEBIT")
        .reduce((s, e) => s + e.amountCents, 0);
      const credits = journal.entries
        .filter((e) => e.direction === "CREDIT")
        .reduce((s, e) => s + e.amountCents, 0);
      expect(debits).toBe(credits);
    });

    it("rejects an unbalanced journal (debit !== credit)", () => {
      expect(() =>
        postClearingJournal(
          "stl-003",
          "idem-003",
          "Bad journal",
          [
            {
              accountCode: "SETTLEMENT_ESCROW",
              direction: "DEBIT",
              amountCents: 100000,
              currency: "USD",
            },
            {
              accountCode: "SELLER_PROCEEDS",
              direction: "CREDIT",
              amountCents: 99000,
              currency: "USD",
            },
          ],
          NOW,
          "admin-001",
          [],
        ),
      ).toThrow(UnbalancedJournalError);

      try {
        postClearingJournal(
          "stl-003",
          "idem-003",
          "Bad journal",
          [
            {
              accountCode: "SETTLEMENT_ESCROW",
              direction: "DEBIT",
              amountCents: 100000,
              currency: "USD",
            },
            {
              accountCode: "SELLER_PROCEEDS",
              direction: "CREDIT",
              amountCents: 99000,
              currency: "USD",
            },
          ],
          NOW,
          "admin-001",
          [],
        );
      } catch (err) {
        expect(err).toBeInstanceOf(UnbalancedJournalError);
        const violation = err as InstanceType<typeof UnbalancedJournalError>;
        expect(violation.debitsCents).toBe(100000);
        expect(violation.creditsCents).toBe(99000);
        expect(violation.settlementCaseId).toBe("stl-003");
      }
    });

    it("rejects an empty journal (zero entries)", () => {
      expect(() =>
        postClearingJournal(
          "stl-004",
          "idem-004",
          "Empty journal",
          [],
          NOW,
          "admin-001",
          [],
        ),
      ).toThrow("EMPTY_JOURNAL");
    });

    it("returns existing journal for duplicate idempotency key", () => {
      const existingJournal: ClearingJournal = {
        id: "jnl-existing",
        settlementCaseId: "stl-001",
        idempotencyKey: "idem-duplicate",
        description: "Already posted",
        postedAt: NOW,
        createdBy: "admin-001",
        entries: [
          {
            id: "jle-1",
            journalId: "jnl-existing",
            accountCode: "SETTLEMENT_ESCROW",
            direction: "DEBIT",
            amountCents: 50000,
            currency: "USD",
          },
          {
            id: "jle-2",
            journalId: "jnl-existing",
            accountCode: "SELLER_PROCEEDS",
            direction: "CREDIT",
            amountCents: 50000,
            currency: "USD",
          },
        ],
      };

      // Post with same idempotency key — should return existing, not create new
      const result = postClearingJournal(
        "stl-001",
        "idem-duplicate",
        "Duplicate attempt",
        [
          {
            accountCode: "SETTLEMENT_ESCROW",
            direction: "DEBIT",
            amountCents: 99999,
            currency: "USD",
          },
          {
            accountCode: "SELLER_PROCEEDS",
            direction: "CREDIT",
            amountCents: 99999,
            currency: "USD",
          },
        ],
        NOW,
        "admin-001",
        [existingJournal],
      );

      expect(result.id).toBe("jnl-existing");
      expect(result.entries[0].amountCents).toBe(50000); // original, not 99999
    });

    it("generates sequential journal IDs", () => {
      const first = postClearingJournal(
        "stl-001",
        "idem-seq-1",
        "First",
        [
          { accountCode: "A", direction: "DEBIT", amountCents: 100, currency: "USD" },
          { accountCode: "B", direction: "CREDIT", amountCents: 100, currency: "USD" },
        ],
        NOW,
        "admin-001",
        [],
      );

      const second = postClearingJournal(
        "stl-002",
        "idem-seq-2",
        "Second",
        [
          { accountCode: "A", direction: "DEBIT", amountCents: 200, currency: "USD" },
          { accountCode: "B", direction: "CREDIT", amountCents: 200, currency: "USD" },
        ],
        NOW,
        "admin-001",
        [first],
      );

      expect(first.id).toBe("jnl-001");
      expect(second.id).toBe("jnl-002");
    });
  });

  describe("assertJournalBalanced", () => {
    it("passes for a balanced journal", () => {
      const journal: ClearingJournal = {
        id: "jnl-test",
        settlementCaseId: "stl-test",
        idempotencyKey: "idem-test",
        description: "Test",
        postedAt: NOW,
        createdBy: "test",
        entries: [
          { id: "e1", journalId: "jnl-test", accountCode: "A", direction: "DEBIT", amountCents: 500, currency: "USD" },
          { id: "e2", journalId: "jnl-test", accountCode: "B", direction: "CREDIT", amountCents: 500, currency: "USD" },
        ],
      };

      expect(() => assertJournalBalanced(journal)).not.toThrow();
    });

    it("throws UnbalancedJournalError for imbalanced journal", () => {
      const journal: ClearingJournal = {
        id: "jnl-bad",
        settlementCaseId: "stl-bad",
        idempotencyKey: "idem-bad",
        description: "Imbalanced",
        postedAt: NOW,
        createdBy: "test",
        entries: [
          { id: "e1", journalId: "jnl-bad", accountCode: "A", direction: "DEBIT", amountCents: 1000, currency: "USD" },
          { id: "e2", journalId: "jnl-bad", accountCode: "B", direction: "CREDIT", amountCents: 999, currency: "USD" },
        ],
      };

      expect(() => assertJournalBalanced(journal)).toThrow(UnbalancedJournalError);
    });

    it("handles multi-entry journals with mixed directions", () => {
      const journal: ClearingJournal = {
        id: "jnl-multi",
        settlementCaseId: "stl-multi",
        idempotencyKey: "idem-multi",
        description: "Multi-entry",
        postedAt: NOW,
        createdBy: "test",
        entries: [
          { id: "e1", journalId: "jnl-multi", accountCode: "ESCROW", direction: "DEBIT", amountCents: 10000, currency: "USD" },
          { id: "e2", journalId: "jnl-multi", accountCode: "SELLER", direction: "CREDIT", amountCents: 9500, currency: "USD" },
          { id: "e3", journalId: "jnl-multi", accountCode: "FEE", direction: "CREDIT", amountCents: 300, currency: "USD" },
          { id: "e4", journalId: "jnl-multi", accountCode: "TAX", direction: "CREDIT", amountCents: 200, currency: "USD" },
        ],
      };

      // 10000 DEBIT vs 10000 CREDIT (9500 + 300 + 200)
      expect(() => assertJournalBalanced(journal)).not.toThrow();
    });
  });
});
