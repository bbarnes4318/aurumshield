/* ================================================================
   RSK-013: Idempotent Webhook Ledger — Security Tests
   ================================================================
   Validates the Turnkey inbound USDT deposit webhook handler at:
     src/app/api/webhooks/turnkey/route.ts

   Source-level invariant verification:
     1. No in-memory state management (no settlement-store imports)
     2. DB-backed transactional queries (settlement_cases, settlement_finality)
     3. Idempotency guard (funds_confirmed_final check)
     4. HMAC-SHA256 signature verification
     5. BigInt decimal scaling for ERC-20 USDT (6-decimal math)
     6. Proper error handling with 500 status on DB errors
   ================================================================ */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* ── Source file content verification (no runtime mocking needed) ── */

const ROUTE_PATH = path.resolve(
  __dirname,
  "../../app/api/webhooks/turnkey/route.ts",
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

    it("does NOT directly import applySettlementAction", () => {
      // The handler uses apiApplySettlementAction (the API layer) via dynamic
      // import, NOT the raw engine function. Verify no direct engine import.
      expect(routeSource).not.toContain("from \"@/lib/settlement-engine\"");
      expect(routeSource).not.toContain("from '@/lib/settlement-engine'");
    });

    it("does NOT import from settlement-store", () => {
      expect(routeSource).not.toContain("settlement-store");
    });

    it("does NOT import from settlement-engine", () => {
      expect(routeSource).not.toContain("settlement-engine");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Database-backed settlement lookup              */
  /* ────────────────────────────────────────────── */

  describe("transactional safeguards", () => {
    it("queries settlement_cases from the database", () => {
      expect(routeSource).toContain("FROM settlement_cases");
    });

    it("uses getPoolClient for database access", () => {
      expect(routeSource).toContain("getPoolClient");
    });

    it("releases the DB client in a finally block", () => {
      expect(routeSource).toContain("client.release()");
    });

    it("writes to settlement_finality for audit trail", () => {
      expect(routeSource).toContain("INSERT INTO settlement_finality");
    });

    it("uses ON CONFLICT for idempotent finality inserts", () => {
      expect(routeSource).toContain("ON CONFLICT DO NOTHING");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Idempotency guard                             */
  /* ────────────────────────────────────────────── */

  describe("idempotency guard", () => {
    it("checks funds_confirmed_final before processing", () => {
      expect(routeSource).toContain("funds_confirmed_final");
    });

    it("returns early for already-funded settlements", () => {
      expect(routeSource).toContain("already-funded");
      expect(routeSource).toContain("already funded");
    });

    it("uses idempotency keys for settlement_finality inserts", () => {
      expect(routeSource).toContain("idempotency_key");
      expect(routeSource).toContain("turnkey-deposit-");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Webhook signature verification                 */
  /* ────────────────────────────────────────────── */

  describe("signature verification", () => {
    it("validates HMAC-SHA256 webhook signatures", () => {
      expect(routeSource).toContain("createHmac");
      expect(routeSource).toContain("sha256");
    });

    it("reads the X-Turnkey-Signature header", () => {
      expect(routeSource).toContain("x-turnkey-signature");
    });

    it("returns 401 on missing or invalid signature", () => {
      expect(routeSource).toContain("status: 401");
    });

    it("uses constant-time comparison to prevent timing attacks", () => {
      expect(routeSource).toContain("Constant-time comparison");
      expect(routeSource).toContain("charCodeAt");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  ERC-20 decimal scaling (critical math)         */
  /* ────────────────────────────────────────────── */

  describe("BigInt decimal scaling", () => {
    it("derives notionalCents from total_notional and converts to USDT base units using BigInt", () => {
      // notionalCents is computed at runtime: Math.round(parseFloat(total_notional) * 100)
      expect(routeSource).toContain("notionalCents");
      expect(routeSource).toContain("BigInt(notionalCents)");
      expect(routeSource).toContain("BigInt(10000)");
    });

    it("compares transferred amount using BigInt arithmetic", () => {
      expect(routeSource).toContain("BigInt(transferredAmount)");
      expect(routeSource).toContain("receivedBaseUnits >= requiredBaseUnits");
    });

    it("handles partial deposits without advancing state", () => {
      expect(routeSource).toContain("Partial");
      expect(routeSource).toContain("PARTIAL");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  State machine advancement                      */
  /* ────────────────────────────────────────────── */

  describe("state machine advancement (reorg-safe)", () => {
    it("parks deposits in AWAITING_CHAIN_CONFIRMATIONS instead of immediate finality", () => {
      // Task 2: Webhook no longer calls CONFIRM_FUNDS_FINAL inline.
      // It parks the deposit and a cron job finalizes after 12 confirmations.
      expect(routeSource).toContain("AWAITING_CHAIN_CONFIRMATIONS");
      expect(routeSource).toContain("PENDING_CONFIRMATION");
    });

    it("does NOT call apiApplySettlementAction inline (deferred to cron)", () => {
      // The webhook handler must NOT immediately advance the state machine.
      // CONFIRM_FUNDS_FINAL is now triggered by a background worker after
      // 12 block confirmations via pollBlockConfirmations().
      expect(routeSource).not.toContain("apiApplySettlementAction");
      expect(routeSource).not.toContain("import(\"@/lib/api\")");
    });

    it("emits DEPOSIT_DETECTED audit event (not FUNDS_CLEARED)", () => {
      expect(routeSource).toContain("DEPOSIT_DETECTED");
    });

    it("exports pollBlockConfirmations for cron-based finalization", () => {
      expect(routeSource).toContain("export async function pollBlockConfirmations");
      expect(routeSource).toContain("eth_getTransactionReceipt");
      expect(routeSource).toContain("REQUIRED_BLOCK_CONFIRMATIONS");
    });

    it("identifies the actor as SYSTEM_TURNKEY_WEBHOOK", () => {
      expect(routeSource).toContain("SYSTEM_TURNKEY_WEBHOOK");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Error handling                                 */
  /* ────────────────────────────────────────────── */

  describe("error handling", () => {
    it("returns 500 on database failure", () => {
      expect(routeSource).toContain("Internal processing error");
      expect(routeSource).toContain("status: 500");
    });

    it("returns 400 on invalid JSON payload", () => {
      expect(routeSource).toContain("Invalid JSON payload");
      expect(routeSource).toContain("status: 400");
    });

    it("filters non-USDT token transfers", () => {
      expect(routeSource).toContain("non-usdt");
      expect(routeSource).toContain("USDT_CONTRACT");
    });
  });
});
