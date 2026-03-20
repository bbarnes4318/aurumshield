/* ================================================================
   RSK-010: Dynamic Operational Risk Parameterization Tests
   ================================================================
   Tests:
     1. Policy engine functions use injected RiskConfiguration
     2. Changing config values changes policy outcomes
     3. DEFAULT_RISK_CONFIG matches expected legacy values
     4. Cached config fetch (TTL, fallback)
   ================================================================ */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_RISK_CONFIG,
  checkBlockers,
  determineApproval,
  runComplianceChecks,
  evaluatePhysicalMetalRisk,
  applyPhysicalMetalTRIAdjustment,
  mergePhysicalMetalBlockers,
  mergePhysicalMetalChecks,
  type RiskConfiguration,
  type TRIResult,
  type CapitalValidation,
  type PolicyBlocker,
  type ComplianceCheck,
} from "../policy-engine";
import {
  invalidateRiskConfigCache,
  getActiveRiskConfig,
} from "../risk-config-server";
import type { Counterparty, Corridor, Hub, DashboardCapital } from "@/lib/mock-data";

/* ── Mock DB ── */
const mockQueryFn = vi.fn();
const mockEndFn = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  getDbClient: vi.fn().mockImplementation(async () => ({
    query: mockQueryFn,
    end: mockEndFn,
  })),
}));

/* ── Test Fixtures ── */

const mockCp: Counterparty = {
  id: "cp-1", entity: "Acme Corp", status: "active",
  riskLevel: "low", jurisdiction: "US", type: "asset-manager",
  lastReview: "2026-01-01", exposure: 10_000_000,
  analyst: "J. Smith", legalEntityId: "LEI-TEST001",
  incorporationDate: "2020-01-01", primaryContact: "Jane Doe",
  email: "jane@acme.com",
};

const mockCorridor: Corridor = {
  id: "cor-1", name: "US → CH", sourceCountry: "US",
  destinationCountry: "CH", status: "active", riskLevel: "low",
} as Corridor;

const mockHub: Hub = {
  id: "hub-1", name: "Brinks ZH", status: "operational", uptime: 99.9,
} as Hub;

const mockCapital: DashboardCapital = {
  capitalBase: 100_000_000,
  activeExposure: 50_000_000,
  hardstopLimit: 200_000_000,
  hardstopUtilization: 0.25,
  ecr: 0.5,
} as DashboardCapital;

const mockTri: TRIResult = {
  score: 2, band: "green",
  components: {
    cpRisk: { weight: 0.4, raw: 1, weighted: 0.4 },
    corRisk: { weight: 0.25, raw: 1, weighted: 0.25 },
    amtConc: { weight: 0.2, raw: 1, weighted: 0.2 },
    cpStatus: { weight: 0.15, raw: 0, weighted: 0 },
  },
  formula: "TRI = 2",
};

const mockCapVal: CapitalValidation = {
  currentExposure: 50_000_000,
  postTxnExposure: 60_000_000,
  capitalBase: 100_000_000,
  currentECR: 0.5,
  postTxnECR: 0.6,
  hardstopLimit: 200_000_000,
  currentHardstopUtil: 0.25,
  postTxnHardstopUtil: 0.3,
  hardstopRemaining: 150_000_000,
};

describe("RSK-010: Dynamic Operational Risk Parameterization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateRiskConfigCache();
  });

  /* ────────────────────────────────────────────── */
  /*  DEFAULT_RISK_CONFIG                           */
  /* ────────────────────────────────────────────── */

  describe("DEFAULT_RISK_CONFIG", () => {
    it("matches previously hardcoded values", () => {
      expect(DEFAULT_RISK_CONFIG.maxEcrRatio).toBe(8);
      expect(DEFAULT_RISK_CONFIG.ecrWarnRatio).toBe(7);
      expect(DEFAULT_RISK_CONFIG.hardstopUtilFail).toBe(1.0);
      expect(DEFAULT_RISK_CONFIG.hardstopUtilWarn).toBe(0.9);
      expect(DEFAULT_RISK_CONFIG.triCriticalThreshold).toBe(8);
      expect(DEFAULT_RISK_CONFIG.triElevatedThreshold).toBe(7);
      expect(DEFAULT_RISK_CONFIG.triWarnThreshold).toBe(5);
      expect(DEFAULT_RISK_CONFIG.triConcentrationFactor).toBe(0.5);
      expect(DEFAULT_RISK_CONFIG.autoApprovalLimitCents).toBe(2_500_000_000);
      expect(DEFAULT_RISK_CONFIG.deskHeadLimitCents).toBe(5_000_000_000);
      expect(DEFAULT_RISK_CONFIG.creditCommitteeLimitCents).toBe(10_000_000_000);
    });
  });

  /* ────────────────────────────────────────────── */
  /*  checkBlockers — dynamic thresholds            */
  /* ────────────────────────────────────────────── */

  describe("checkBlockers with dynamic config", () => {
    it("ECR breach uses config threshold", () => {
      // With default config (maxEcrRatio=8), ECR 0.6x is fine
      const blockers = checkBlockers(mockCp, mockCorridor, mockHub, mockTri, 10_000_000, mockCapital, DEFAULT_RISK_CONFIG);
      expect(blockers.find((b) => b.id === "ecr-breach")).toBeUndefined();

      // With tightened config (maxEcrRatio=0.5), ECR 0.6x triggers BLOCK
      const tightConfig: RiskConfiguration = { ...DEFAULT_RISK_CONFIG, maxEcrRatio: 0.5 };
      const blockers2 = checkBlockers(mockCp, mockCorridor, mockHub, mockTri, 10_000_000, mockCapital, tightConfig);
      expect(blockers2.find((b) => b.id === "ecr-breach")).toBeDefined();
      expect(blockers2.find((b) => b.id === "ecr-breach")?.severity).toBe("BLOCK");
    });

    it("TRI elevated threshold uses config", () => {
      const normalTri: TRIResult = { ...mockTri, score: 6 };

      // Default: triElevatedThreshold=7, score 6 → no warn
      const blockers = checkBlockers(mockCp, mockCorridor, mockHub, normalTri, 1_000_000, mockCapital, DEFAULT_RISK_CONFIG);
      expect(blockers.find((b) => b.id === "tri-high")).toBeUndefined();

      // Tightened: triElevatedThreshold=5, score 6 → WARN
      const tightConfig: RiskConfiguration = { ...DEFAULT_RISK_CONFIG, triElevatedThreshold: 5 };
      const blockers2 = checkBlockers(mockCp, mockCorridor, mockHub, normalTri, 1_000_000, mockCapital, tightConfig);
      expect(blockers2.find((b) => b.id === "tri-high")).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────── */
  /*  determineApproval — dynamic limits            */
  /* ────────────────────────────────────────────── */

  describe("determineApproval with dynamic config", () => {
    it("auto-approval uses config limit (default $25M)", () => {
      // $20M, TRI 2 → auto (under $25M limit)
      const result = determineApproval(2, 20_000_000, DEFAULT_RISK_CONFIG);
      expect(result.tier).toBe("auto");
    });

    it("raising auto-approval limit changes tier", () => {
      // $30M, TRI 2 → desk-head with default ($25M limit)
      const result1 = determineApproval(2, 30_000_000, DEFAULT_RISK_CONFIG);
      expect(result1.tier).toBe("desk-head");

      // Same amount with raised limit → auto
      const raisedConfig: RiskConfiguration = {
        ...DEFAULT_RISK_CONFIG,
        autoApprovalLimitCents: 5_000_000_000, // $50M
      };
      const result2 = determineApproval(2, 30_000_000, raisedConfig);
      expect(result2.tier).toBe("auto");
    });

    it("credit-committee limit governs escalation", () => {
      // $80M, TRI 6 → credit-committee (under $100M)
      const result = determineApproval(6, 80_000_000, DEFAULT_RISK_CONFIG);
      expect(result.tier).toBe("credit-committee");

      // Lower CC limit to $50M → board
      const tightConfig: RiskConfiguration = {
        ...DEFAULT_RISK_CONFIG,
        creditCommitteeLimitCents: 5_000_000_000, // $50M
      };
      const result2 = determineApproval(6, 80_000_000, tightConfig);
      expect(result2.tier).toBe("board");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  runComplianceChecks — dynamic thresholds      */
  /* ────────────────────────────────────────────── */

  describe("runComplianceChecks with dynamic config", () => {
    it("ECR check uses config thresholds", () => {
      const checks = runComplianceChecks(mockCp, mockCorridor, mockHub, mockTri, mockCapVal, DEFAULT_RISK_CONFIG);
      const ecrCheck = checks.find((c) => c.id === "ecr");
      expect(ecrCheck).toBeDefined();
      expect(ecrCheck?.result).toBe("PASS"); // 0.6x < 7x warn

      // Lower warn threshold to trigger WARN
      const tightConfig: RiskConfiguration = { ...DEFAULT_RISK_CONFIG, ecrWarnRatio: 0.5 };
      const checks2 = runComplianceChecks(mockCp, mockCorridor, mockHub, mockTri, mockCapVal, tightConfig);
      const ecrCheck2 = checks2.find((c) => c.id === "ecr");
      expect(ecrCheck2?.result).toBe("WARN");
    });

    it("hardstop check uses config thresholds", () => {
      const highUtilCapVal: CapitalValidation = { ...mockCapVal, postTxnHardstopUtil: 0.95 };

      // Default: warn at 0.9 → WARN
      const checks = runComplianceChecks(mockCp, mockCorridor, mockHub, mockTri, highUtilCapVal, DEFAULT_RISK_CONFIG);
      expect(checks.find((c) => c.id === "hs")?.result).toBe("WARN");

      // Raise warn to 0.99 → PASS
      const relaxedConfig: RiskConfiguration = { ...DEFAULT_RISK_CONFIG, hardstopUtilWarn: 0.99 };
      const checks2 = runComplianceChecks(mockCp, mockCorridor, mockHub, mockTri, highUtilCapVal, relaxedConfig);
      expect(checks2.find((c) => c.id === "hs")?.result).toBe("PASS");
    });

    it("TRI check uses config thresholds", () => {
      const highTri: TRIResult = { ...mockTri, score: 6 };

      // Default: triWarnThreshold=5 → WARN (score 6 ≥ 5)
      const checks = runComplianceChecks(mockCp, mockCorridor, mockHub, highTri, mockCapVal, DEFAULT_RISK_CONFIG);
      expect(checks.find((c) => c.id === "tri")?.result).toBe("WARN");

      // Raise warn to 7 → PASS
      const relaxedConfig: RiskConfiguration = { ...DEFAULT_RISK_CONFIG, triWarnThreshold: 7 };
      const checks2 = runComplianceChecks(mockCp, mockCorridor, mockHub, highTri, mockCapVal, relaxedConfig);
      expect(checks2.find((c) => c.id === "tri")?.result).toBe("PASS");
    });
  });

  /* ────────────────────────────────────────────── */
  /*  getActiveRiskConfig — caching + fallback      */
  /* ────────────────────────────────────────────── */

  describe("getActiveRiskConfig", () => {
    it("fetches from DB and caches result", async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          max_ecr_ratio: "10.00",
          ecr_warn_ratio: "9.00",
          hardstop_util_fail: "1.000",
          hardstop_util_warn: "0.950",
          tri_critical_threshold: 9,
          tri_elevated_threshold: 8,
          tri_warn_threshold: 6,
          tri_concentration_factor: "0.600",
          auto_approval_limit_cents: "5000000000",
          desk_head_limit_cents: "10000000000",
          credit_committee_limit_cents: "20000000000",
        }],
      });

      const config = await getActiveRiskConfig();
      expect(config.maxEcrRatio).toBe(10);
      expect(config.ecrWarnRatio).toBe(9);
      expect(config.triCriticalThreshold).toBe(9);
      expect(config.autoApprovalLimitCents).toBe(5_000_000_000);
      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      // Second call should use cache — no new DB query
      const config2 = await getActiveRiskConfig();
      expect(config2).toEqual(config);
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });

    it("falls back to DEFAULT_RISK_CONFIG on empty result", async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const config = await getActiveRiskConfig();
      expect(config).toEqual(DEFAULT_RISK_CONFIG);
    });

    it("falls back on DB error", async () => {
      mockQueryFn.mockRejectedValueOnce(new Error("Connection refused"));

      const config = await getActiveRiskConfig();
      expect(config).toEqual(DEFAULT_RISK_CONFIG);
    });

    it("invalidateRiskConfigCache forces re-fetch", async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      await getActiveRiskConfig();
      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      invalidateRiskConfigCache();

      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      await getActiveRiskConfig();
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  /* ────────────────────────────────────────────── */
  /*  Part 1027: Physical Metal Risk Rules          */
  /* ────────────────────────────────────────────── */

  describe("Part 1027: Physical Metal Risk Rules", () => {
    /* ── Product Risk Classification ── */

    describe("Product Risk Classification", () => {
      it("LBMA Good Delivery → standard risk (1.0×), no manual review", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 500_000,
        });
        expect(result.productRiskWeight).toBe(1.0);
        expect(result.requiresManualReview).toBe(false);
        expect(result.blockers.find((b) => b.id === "pm-asset-review")).toBeUndefined();
        expect(result.complianceChecks.find((c) => c.id === "pm-asset")?.result).toBe("PASS");
      });

      it("SCRAP → high-risk (3.0×), forces manual review BLOCK", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "SCRAP",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 500_000,
        });
        expect(result.productRiskWeight).toBe(3.0);
        expect(result.requiresManualReview).toBe(true);
        const blocker = result.blockers.find((b) => b.id === "pm-asset-review");
        expect(blocker).toBeDefined();
        expect(blocker?.severity).toBe("BLOCK");
        expect(result.complianceChecks.find((c) => c.id === "pm-asset")?.result).toBe("FAIL");
      });

      it("UNREFINED_DORE → high-risk (3.0×), forces manual review BLOCK", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "UNREFINED_DORE",
          deliveryMethod: "DIGITAL_TITLE_TRANSFER",
          settlementRail: "WIRE",
          amountUsd: 100_000,
        });
        expect(result.productRiskWeight).toBe(3.0);
        expect(result.requiresManualReview).toBe(true);
        expect(result.blockers.find((b) => b.id === "pm-asset-review")?.severity).toBe("BLOCK");
      });

      it("UNKNOWN → high-risk (3.0×), forces manual review", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "UNKNOWN",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 50_000,
        });
        expect(result.productRiskWeight).toBe(3.0);
        expect(result.requiresManualReview).toBe(true);
      });
    });

    /* ── Physical Delivery TRI Escalation ── */

    describe("Physical Delivery TRI Escalation", () => {
      it("PHYSICAL_LOADOUT → +2 TRI escalation", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "PHYSICAL_LOADOUT",
          settlementRail: "WIRE",
          amountUsd: 500_000,
        });
        expect(result.deliveryEscalation).toBe(2);
        expect(result.triAdjustment).toBe(2);
        expect(result.blockers.find((b) => b.id === "pm-loadout")?.severity).toBe("WARN");
        expect(result.complianceChecks.find((c) => c.id === "pm-delivery")?.result).toBe("WARN");
      });

      it("DIGITAL_TITLE_TRANSFER → no TRI escalation", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "DIGITAL_TITLE_TRANSFER",
          settlementRail: "WIRE",
          amountUsd: 500_000,
        });
        expect(result.deliveryEscalation).toBe(0);
        expect(result.triAdjustment).toBe(0);
        expect(result.blockers.find((b) => b.id === "pm-loadout")).toBeUndefined();
        expect(result.complianceChecks.find((c) => c.id === "pm-delivery")?.result).toBe("PASS");
      });

      it("VAULT_TO_VAULT → no TRI escalation", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 500_000,
        });
        expect(result.deliveryEscalation).toBe(0);
        expect(result.triAdjustment).toBe(0);
      });
    });

    /* ── Form 8300 Detection ── */

    describe("Form 8300 Detection", () => {
      it("Cashier's check > $10K → FORM_8300_REQUIRED BLOCK", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "CASHIERS_CHECK",
          amountUsd: 15_000,
        });
        expect(result.form8300Required).toBe(true);
        const blocker = result.blockers.find((b) => b.id === "form-8300-required");
        expect(blocker).toBeDefined();
        expect(blocker?.severity).toBe("BLOCK");
        expect(result.complianceChecks.find((c) => c.id === "pm-form8300")?.result).toBe("FAIL");
      });

      it("Money order > $10K → FORM_8300_REQUIRED BLOCK", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "MONEY_ORDER",
          amountUsd: 11_000,
        });
        expect(result.form8300Required).toBe(true);
        expect(result.blockers.find((b) => b.id === "form-8300-required")?.severity).toBe("BLOCK");
      });

      it("Cash $9K → no Form 8300 (below threshold)", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "CASH",
          amountUsd: 9_000,
        });
        expect(result.form8300Required).toBe(false);
        expect(result.blockers.find((b) => b.id === "form-8300-required")).toBeUndefined();
        expect(result.complianceChecks.find((c) => c.id === "pm-form8300")?.result).toBe("PASS");
      });

      it("Cash exactly $10K → no Form 8300 (threshold is >$10K)", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "CASH",
          amountUsd: 10_000,
        });
        expect(result.form8300Required).toBe(false);
      });

      it("Wire $15K → no Form 8300 (non-cash rail)", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 15_000,
        });
        expect(result.form8300Required).toBe(false);
        expect(result.blockers.find((b) => b.id === "form-8300-required")).toBeUndefined();
        expect(result.complianceChecks.find((c) => c.id === "pm-form8300")?.result).toBe("PASS");
      });

      it("Stablecoin $50K → no Form 8300 (non-cash rail)", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "STABLECOIN",
          amountUsd: 50_000,
        });
        expect(result.form8300Required).toBe(false);
      });

      it("Bank draft > $10K → FORM_8300_REQUIRED", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "BANK_DRAFT",
          amountUsd: 25_000,
        });
        expect(result.form8300Required).toBe(true);
        expect(result.blockers.find((b) => b.id === "form-8300-required")?.severity).toBe("BLOCK");
      });

      it("Traveler's check > $10K → FORM_8300_REQUIRED", () => {
        const result = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "TRAVELERS_CHECK",
          amountUsd: 12_500,
        });
        expect(result.form8300Required).toBe(true);
      });
    });

    /* ── TRI Adjustment ── */

    describe("applyPhysicalMetalTRIAdjustment", () => {
      it("applies +2 adjustment and recalculates band", () => {
        const baseTri: TRIResult = { ...mockTri, score: 5, band: "amber" };
        const adjusted = applyPhysicalMetalTRIAdjustment(baseTri, 2);
        expect(adjusted.score).toBe(7);
        expect(adjusted.band).toBe("red");
        expect(adjusted.formula).toContain("+2 (Physical Metal)");
      });

      it("clamps at maximum 10", () => {
        const baseTri: TRIResult = { ...mockTri, score: 9, band: "red" };
        const adjusted = applyPhysicalMetalTRIAdjustment(baseTri, 2);
        expect(adjusted.score).toBe(10);
        expect(adjusted.band).toBe("red");
      });

      it("returns original TRI when adjustment is 0", () => {
        const result = applyPhysicalMetalTRIAdjustment(mockTri, 0);
        expect(result).toBe(mockTri); // exact same reference, not a copy
      });

      it("clamps at minimum 1", () => {
        const baseTri: TRIResult = { ...mockTri, score: 1, band: "green" };
        const adjusted = applyPhysicalMetalTRIAdjustment(baseTri, -5);
        expect(adjusted.score).toBe(1);
        expect(adjusted.band).toBe("green");
      });
    });

    /* ── Composition Helpers ── */

    describe("mergePhysicalMetalBlockers / mergePhysicalMetalChecks", () => {
      it("appends PM blockers to base blockers without mutation", () => {
        const baseBlockers: PolicyBlocker[] = [
          { id: "cp-susp", severity: "BLOCK", title: "Test", detail: "Test" },
        ];
        const pmResult = evaluatePhysicalMetalRisk({
          assetClass: "SCRAP",
          deliveryMethod: "PHYSICAL_LOADOUT",
          settlementRail: "CASH",
          amountUsd: 50_000,
        });
        const merged = mergePhysicalMetalBlockers(baseBlockers, pmResult);
        // Base should be untouched
        expect(baseBlockers).toHaveLength(1);
        // Merged should contain base + PM blockers
        expect(merged.length).toBeGreaterThan(1);
        expect(merged[0].id).toBe("cp-susp");
        // Should have all PM blocker IDs
        expect(merged.find((b) => b.id === "pm-asset-review")).toBeDefined();
        expect(merged.find((b) => b.id === "pm-loadout")).toBeDefined();
        expect(merged.find((b) => b.id === "form-8300-required")).toBeDefined();
      });

      it("appends PM compliance checks to base checks without mutation", () => {
        const baseChecks: ComplianceCheck[] = [
          { id: "cp", name: "Test", result: "PASS", detail: "Test" },
        ];
        const pmResult = evaluatePhysicalMetalRisk({
          assetClass: "LBMA_GOOD_DELIVERY",
          deliveryMethod: "VAULT_TO_VAULT",
          settlementRail: "WIRE",
          amountUsd: 5_000,
        });
        const merged = mergePhysicalMetalChecks(baseChecks, pmResult);
        expect(baseChecks).toHaveLength(1);
        expect(merged.length).toBeGreaterThan(1);
        expect(merged.find((c) => c.id === "pm-asset")).toBeDefined();
        expect(merged.find((c) => c.id === "pm-delivery")).toBeDefined();
        expect(merged.find((c) => c.id === "pm-form8300")).toBeDefined();
      });
    });
  });
});

