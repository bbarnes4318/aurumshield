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
  type RiskConfiguration,
  type TRIResult,
  type CapitalValidation,
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
  riskLevel: "low", country: "US", type: "institution",
  lastReview: "2026-01-01",
} as Counterparty;

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
});
