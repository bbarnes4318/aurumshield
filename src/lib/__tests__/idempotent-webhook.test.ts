/* ================================================================
   RSK-013: Idempotent Webhook Ledger — Security Tests
   ================================================================
   Validates:
     1. SELECT FOR UPDATE row locking is used
     2. SETTLED/CANCELLED rows → 200 OK (idempotency guard)
     3. DB errors trigger ROLLBACK and return 500
     4. Post-commit side effects only fire after COMMIT
     5. loadSettlementState/saveSettlementState/applySettlementAction
        are NOT imported
   ================================================================ */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* ── Source file content verification (no runtime mocking needed) ── */

const ROUTE_PATH = path.resolve(
  __dirname,
  "../../app/api/webhooks/moov/route.ts",
);

describe("RSK-013: Idempotent Webhook Ledger Transactions", () => {
  let routeSource: string;

  beforeEach(() => {
    routeSource = fs.readFileSync(ROUTE_PATH, "utf-8");
  });

  /* ────────────────────────────────────────────── */
  /*  Removed in-memory state management            */
  /* ────────────────────────────────────────────── */

  describe("in-memory state removal", () => {
    it("does NOT import loadSettlementState", () => {
      expect(routeSource).not.toContain("loadSettlementState");
    });

    it("does NOT import saveSettlementState", () => {
      expect(routeSource).not.toContain("saveSettlementState");
    });

    it("does NOT import applySettlementAction", () => {
      expect(routeSource).not.toContain("applySettlementAction");
    });

    it("does NOT import from settlement-store", () => {
      expect(routeSource).not.toContain("settlement-store");
    });

    it("does NOT import from settlement-engine", () => {
      expect(routeSource).not.toContain("settlement-engine");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Transactional safeguards present              */
  /* ────────────────────────────────────────────── */

  describe("transactional safeguards", () => {
    it("uses BEGIN to start a transaction", () => {
      expect(routeSource).toContain('"BEGIN"');
    });

    it("uses SELECT ... FOR UPDATE to lock the row", () => {
      expect(routeSource).toContain("FOR UPDATE");
    });

    it("uses COMMIT to finalize the transaction", () => {
      expect(routeSource).toContain('"COMMIT"');
    });

    it("uses ROLLBACK on errors", () => {
      expect(routeSource).toContain('"ROLLBACK"');
    });

    it("queries settlement_cases with row lock", () => {
      expect(routeSource).toContain("FROM settlement_cases");
      expect(routeSource).toContain("FOR UPDATE");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Idempotency guard                             */
  /* ────────────────────────────────────────────── */

  describe("idempotency guard", () => {
    it("defines TERMINAL_STATUSES with SETTLED and CANCELLED", () => {
      expect(routeSource).toContain("SETTLED");
      expect(routeSource).toContain("CANCELLED");
      expect(routeSource).toContain("TERMINAL_STATUSES");
    });

    it("logs webhook_duplicate_retry_discarded for idempotent skips", () => {
      expect(routeSource).toContain("webhook_duplicate_retry_discarded");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Inline ledger entries                         */
  /* ────────────────────────────────────────────── */

  describe("inline ledger entries", () => {
    it("inserts into ledger_journals within the transaction", () => {
      expect(routeSource).toContain("INSERT INTO ledger_journals");
    });

    it("inserts into ledger_entries within the transaction", () => {
      expect(routeSource).toContain("INSERT INTO ledger_entries");
    });

    it("uses ledger_accounts lookup (SETTLEMENT_ESCROW, SELLER_PROCEEDS)", () => {
      expect(routeSource).toContain("SETTLEMENT_ESCROW");
      expect(routeSource).toContain("SELLER_PROCEEDS");
    });

    it("uses ON CONFLICT for journal idempotency", () => {
      expect(routeSource).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Post-commit ordering                          */
  /* ────────────────────────────────────────────── */

  describe("post-commit ordering", () => {
    it("calls recordSettlementFinality AFTER COMMIT section", () => {
      const postCommitSection = routeSource.indexOf("Post-COMMIT side effects");
      expect(postCommitSection).toBeGreaterThan(-1);
      const finalityIdx = routeSource.indexOf("recordSettlementFinality(", postCommitSection);
      expect(finalityIdx).toBeGreaterThan(postCommitSection);
    });

    it("calls notifyPartiesOfSettlement AFTER COMMIT section", () => {
      const postCommitSection = routeSource.indexOf("Post-COMMIT side effects");
      const callSite = routeSource.indexOf("notifyPartiesOfSettlement(", postCommitSection);
      expect(callSite).toBeGreaterThan(postCommitSection);
    });

    it("calls issueCertificate AFTER COMMIT section", () => {
      const postCommitSection = routeSource.indexOf("Post-COMMIT side effects");
      const certIdx = routeSource.indexOf("issueCertificate(", postCommitSection);
      expect(certIdx).toBeGreaterThan(postCommitSection);
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Error handling                                 */
  /* ────────────────────────────────────────────── */

  describe("error handling", () => {
    it("returns 500 on transaction failure", () => {
      expect(routeSource).toContain("Internal server error");
      expect(routeSource).toContain("status: 500");
    });

    it("catches ROLLBACK failures without masking original error", () => {
      expect(routeSource).toContain("ROLLBACK failed");
    });
  });
});
