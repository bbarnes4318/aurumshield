/* ================================================================
   TIER-1 SECURITY REMEDIATION — Source Invariant Tests
   ================================================================
   Validates the three security vectors via source-file string
   assertions (same pattern as idempotent-webhook.test.ts):

     Task 1: BOLA/IDOR — ownership checks in API routes
     Task 2: Webhook Fail-Closed — zero dev bypass
     Task 3: Server Action Hardening — requireSession/Admin + Zod

   These tests read the source files and assert the presence of
   required security patterns. No runtime mocking needed.
   ================================================================ */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* ── Source file paths ── */

const SRC = path.resolve(__dirname, "../..");

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

/* ── Preload all sources ── */

let sources: Record<string, string> = {};

beforeAll(() => {
  sources = {
    // Task 1: BOLA routes
    settlementStatus: readSource("app/api/settlement-status/[id]/route.ts"),
    certificateDownload: readSource("app/api/certificates/[id]/download/route.ts"),
    kycStatus: readSource("app/api/user/kyc-status/route.ts"),

    // Task 2: Webhook handlers
    diro: readSource("app/api/webhooks/diro/route.ts"),
    logistics: readSource("app/api/webhooks/logistics/route.ts"),
    refinery: readSource("app/api/webhooks/refinery/route.ts"),
    turnkey: readSource("app/api/webhooks/turnkey/route.ts"),
    verification: readSource("app/api/webhooks/verification/route.ts"),

    // Task 3: Server actions
    settlementActions: readSource("actions/settlement-actions.ts"),
    treasuryActions: readSource("actions/treasury-actions.ts"),
    banking: readSource("actions/banking.ts"),
    clearing: readSource("actions/clearing.ts"),
    notifications: readSource("actions/notifications.ts"),
    logistics_sa: readSource("actions/logistics.ts"),
    inventoryActions: readSource("actions/inventory-actions.ts"),
    producerQueries: readSource("actions/producer-queries.ts"),
    settlementQueries: readSource("actions/settlement-queries.ts"),
    treasuryQueries: readSource("actions/treasury-queries.ts"),
  };
});

/* ================================================================
   TASK 1: BOLA/IDOR — Resource Ownership Enforcement
   ================================================================ */

describe("Task 1: BOLA/IDOR Eradication", () => {
  it("settlement-status/[id] imports requireSession from authz", () => {
    expect(sources.settlementStatus).toContain("requireSession");
    expect(sources.settlementStatus).toContain("@/lib/authz");
  });

  it("settlement-status/[id] enforces resource ownership check", () => {
    // Must contain ownership assertion logic
    expect(sources.settlementStatus).toContain("callerOwnsResource");
    expect(sources.settlementStatus).toContain("buyerUserId");
    expect(sources.settlementStatus).toContain("sellerUserId");
    expect(sources.settlementStatus).toContain("status: 403");
  });

  it("certificates/[id]/download requires authentication", () => {
    expect(sources.certificateDownload).toContain("requireSession");
    expect(sources.certificateDownload).toContain("@/lib/authz");
    expect(sources.certificateDownload).toContain("Unauthorized");
  });

  it("user/kyc-status does NOT allow unauthenticated userId override", () => {
    expect(sources.kycStatus).toContain("requireSession");
    // Must enforce admin-only query param override
    expect(sources.kycStatus).toContain("ADMIN_ROLES");
    expect(sources.kycStatus).toContain("session.role");
    // Must NOT blindly use query param
    expect(sources.kycStatus).not.toContain(
      'request.nextUrl.searchParams.get("userId") || sessionUserId',
    );
  });
});

/* ================================================================
   TASK 2: Webhook Fail-Closed Signature Enforcement
   ================================================================ */

describe("Task 2: Webhook Fail-Closed (Zero Dev Bypass)", () => {
  const webhooks = [
    { name: "diro", key: "diro" },
    { name: "logistics", key: "logistics" },
    { name: "refinery", key: "refinery" },
    { name: "turnkey", key: "turnkey" },
    { name: "verification", key: "verification" },
  ] as const;

  for (const wh of webhooks) {
    describe(`${wh.name} webhook`, () => {
      it("does NOT contain 'skip' or 'skipped' development bypass", () => {
        const src = sources[wh.key];
        // Must NOT have the old skip-on-missing-secret pattern
        expect(src).not.toContain("signature verification skipped");
        expect(src).not.toContain("signature validation SKIPPED");
        expect(src).not.toContain("demo mode");
      });

      it("does NOT contain NODE_ENV === 'development' bypass", () => {
        const src = sources[wh.key];
        expect(src).not.toContain('NODE_ENV === "development"');
        expect(src).not.toContain("NODE_ENV === 'development'");
      });

      it("returns 500 when webhook secret is not configured", () => {
        const src = sources[wh.key];
        expect(src).toContain("not configured");
        expect(src).toContain("status: 500");
      });

      it("returns 401 on invalid signature", () => {
        const src = sources[wh.key];
        expect(src).toContain("status: 401");
      });
    });
  }
});

/* ================================================================
   TASK 3: Server Action Hardening — Session Auth + Zod
   ================================================================ */

describe("Task 3: Server Action Hardening", () => {
  /* ── Files requiring requireSession ── */
  const sessionFiles = [
    { name: "banking", key: "banking" },
    { name: "notifications", key: "notifications" },
    { name: "logistics", key: "logistics_sa" },
    { name: "inventory-actions", key: "inventoryActions" },
    { name: "producer-queries", key: "producerQueries" },
  ] as const;

  for (const sf of sessionFiles) {
    it(`${sf.name} imports and calls requireSession`, () => {
      const src = sources[sf.key];
      expect(src).toContain("requireSession");
      expect(src).toContain("await requireSession()");
    });
  }

  /* ── Files requiring requireProductionAuth (stricter than requireSession) ── */
  const productionAuthFiles = [
    { name: "settlement-actions", key: "settlementActions" },
  ] as const;

  for (const pf of productionAuthFiles) {
    it(`${pf.name} imports and calls requireProductionAuth`, () => {
      const src = sources[pf.key];
      expect(src).toContain("requireProductionAuth");
      expect(src).toContain("await requireProductionAuth()");
    });
  }

  /* ── Files requiring requireAdmin ── */
  const adminFiles = [
    { name: "treasury-actions", key: "treasuryActions" },
    { name: "clearing", key: "clearing" },
    { name: "settlement-queries", key: "settlementQueries" },
    { name: "treasury-queries", key: "treasuryQueries" },
  ] as const;

  for (const af of adminFiles) {
    it(`${af.name} imports and calls requireAdmin`, () => {
      const src = sources[af.key];
      expect(src).toContain("requireAdmin");
      expect(src).toContain("await requireAdmin()");
    });
  }

  /* ── Blanket Zod enforcement ── */
  const zodFiles = [
    { name: "settlement-actions", key: "settlementActions" },
    { name: "treasury-actions", key: "treasuryActions" },
    { name: "banking", key: "banking" },
    { name: "clearing", key: "clearing" },
    { name: "notifications", key: "notifications" },
    { name: "logistics", key: "logistics_sa" },
    { name: "inventory-actions", key: "inventoryActions" },
    { name: "producer-queries", key: "producerQueries" },
  ] as const;

  for (const zf of zodFiles) {
    it(`${zf.name} uses Zod schema validation`, () => {
      const src = sources[zf.key];
      expect(src).toContain("from \"zod\"");
      expect(src).toContain(".safeParse(");
    });
  }
});
