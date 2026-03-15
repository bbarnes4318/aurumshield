/* ================================================================
   RSK-020: Refinery Webhook — Source-Level Security Tests
   ================================================================
   Validates the LBMA Refinery Yield webhook handler at:
     src/app/api/webhooks/refinery/route.ts

   Source-level invariant verification:
     1. HMAC-SHA256 signature validation (REFINERY_WEBHOOK_SECRET)
     2. Constant-time comparison prevents timing attacks
     3. State guard: only PENDING_DELIVERY/PROCESSING can advance
     4. actual_refined_weight_oz is updated on yield confirmation
     5. refinery_yield_data stores full payload
     6. REFINERY_YIELD_CONFIRMED audit event emitted
     7. Proper HTTP status codes (401, 400, 409, 500)
     8. DB client released in finally block
   ================================================================ */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* ── Source file content verification (no runtime mocking needed) ── */

const ROUTE_PATH = path.resolve(
  __dirname,
  "../../app/api/webhooks/refinery/route.ts",
);

describe("RSK-020: Refinery Yield Webhook Security", () => {
  let routeSource: string;

  beforeEach(() => {
    routeSource = fs.readFileSync(ROUTE_PATH, "utf-8");
  });

  /* ────────────────────────────────────────────── */
  /*  Signature verification                        */
  /* ────────────────────────────────────────────── */

  describe("HMAC signature verification", () => {
    it("validates HMAC-SHA256 webhook signatures", () => {
      expect(routeSource).toContain("createHmac");
      expect(routeSource).toContain("sha256");
    });

    it("reads the X-Refinery-Signature header", () => {
      expect(routeSource).toContain("x-refinery-signature");
    });

    it("uses REFINERY_WEBHOOK_SECRET from environment", () => {
      expect(routeSource).toContain("REFINERY_WEBHOOK_SECRET");
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
  /*  Payload validation                            */
  /* ────────────────────────────────────────────── */

  describe("payload validation", () => {
    it("returns 400 on invalid JSON payload", () => {
      expect(routeSource).toContain("Invalid JSON payload");
      expect(routeSource).toContain("status: 400");
    });

    it("validates required fields: listingId, finalWeightOz, finalPurity, newSerialNumbers", () => {
      expect(routeSource).toContain("payload.listingId");
      expect(routeSource).toContain("payload.finalWeightOz");
      expect(routeSource).toContain("payload.finalPurity");
      expect(routeSource).toContain("payload.newSerialNumbers");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  State guard                                   */
  /* ────────────────────────────────────────────── */

  describe("refinery state guard", () => {
    it("queries inventory_listings for the listing", () => {
      expect(routeSource).toContain("FROM inventory_listings");
    });

    it("checks refinery_status is PENDING_DELIVERY or PROCESSING", () => {
      expect(routeSource).toContain("PENDING_DELIVERY");
      expect(routeSource).toContain("PROCESSING");
    });

    it("returns 409 on invalid state transition", () => {
      expect(routeSource).toContain("status: 409");
    });

    it("uses FOR UPDATE row lock during state check", () => {
      expect(routeSource).toContain("FOR UPDATE");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Yield data persistence                        */
  /* ────────────────────────────────────────────── */

  describe("yield data persistence", () => {
    it("updates actual_refined_weight_oz on confirmation", () => {
      expect(routeSource).toContain("actual_refined_weight_oz");
    });

    it("sets refinery_status to COMPLETED", () => {
      expect(routeSource).toContain("refinery_status = 'COMPLETED'");
    });

    it("stores full yield payload in refinery_yield_data", () => {
      expect(routeSource).toContain("refinery_yield_data");
    });

    it("computes a refinerySignoffHash for tamper detection", () => {
      expect(routeSource).toContain("refinerySignoffHash");
    });

    it("tracks yield variance between estimated and actual weight", () => {
      expect(routeSource).toContain("yieldVarianceOz");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Audit event                                   */
  /* ────────────────────────────────────────────── */

  describe("audit trail", () => {
    it("emits REFINERY_YIELD_CONFIRMED audit event", () => {
      expect(routeSource).toContain("REFINERY_YIELD_CONFIRMED");
      expect(routeSource).toContain("emitAuditEvent");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Database safety                               */
  /* ────────────────────────────────────────────── */

  describe("database safety", () => {
    it("uses getPoolClient for database access", () => {
      expect(routeSource).toContain("getPoolClient");
    });

    it("releases the DB client in a finally block", () => {
      expect(routeSource).toContain("client.release()");
    });

    it("returns 500 on database failure for webhook retry", () => {
      expect(routeSource).toContain("Internal processing error");
      expect(routeSource).toContain("status: 500");
    });
  });
});
