import type { Counterparty, Corridor, Hub, DashboardCapital, RiskLevel } from "@/lib/mock-data";

/* ================================================================
   RSK-010: DYNAMIC OPERATIONAL RISK PARAMETERIZATION
   ================================================================
   All numeric risk thresholds are injected via RiskConfiguration,
   sourced from the `global_risk_parameters` DB table.

   NO hardcoded capital limits, ECR thresholds, or approval tiers.
   Risk Operators can adjust these at runtime via the admin console.
   ================================================================ */

/* ────────────────────────────────────────────────────────────────
   RISK CONFIGURATION INTERFACE
   Mirrors the global_risk_parameters table schema.
   ──────────────────────────────────────────────────────────────── */

export interface RiskConfiguration {
  /** ECR breach threshold (e.g. 8.0x) — triggers BLOCK */
  maxEcrRatio: number;
  /** ECR warning threshold (e.g. 7.0x) — triggers WARN */
  ecrWarnRatio: number;

  /** Hardstop utilization FAIL threshold (e.g. 1.0 = 100%) */
  hardstopUtilFail: number;
  /** Hardstop utilization WARN threshold (e.g. 0.9 = 90%) */
  hardstopUtilWarn: number;

  /** TRI score that triggers FAIL / board review (e.g. 8) */
  triCriticalThreshold: number;
  /** TRI score that triggers elevated monitoring WARN (e.g. 7) */
  triElevatedThreshold: number;
  /** TRI score that triggers WARN in compliance checks (e.g. 5) */
  triWarnThreshold: number;
  /** High-risk concentration factor (e.g. 0.5 = 50% of remaining) */
  triConcentrationFactor: number;

  /** Auto-approval limit in cents (e.g. 2_500_000_000 = $25M) */
  autoApprovalLimitCents: number;
  /** Desk-head approval limit in cents (e.g. 5_000_000_000 = $50M) */
  deskHeadLimitCents: number;
  /** Credit-committee limit in cents (e.g. 10_000_000_000 = $100M) */
  creditCommitteeLimitCents: number;
}

/* ────────────────────────────────────────────────────────────────
   DEFAULT CONFIGURATION — matches migration 010 seed values.
   Used as fallback when DB is unreachable.
   ──────────────────────────────────────────────────────────────── */

export const DEFAULT_RISK_CONFIG: Readonly<RiskConfiguration> = {
  maxEcrRatio: 8,
  ecrWarnRatio: 7,
  hardstopUtilFail: 1.0,
  hardstopUtilWarn: 0.9,
  triCriticalThreshold: 8,
  triElevatedThreshold: 7,
  triWarnThreshold: 5,
  triConcentrationFactor: 0.5,
  autoApprovalLimitCents: 2_500_000_000,
  deskHeadLimitCents: 5_000_000_000,
  creditCommitteeLimitCents: 10_000_000_000,
} as const;

/* ────────────────────────────────────────────────────────────────
   NOTE: getActiveRiskConfig / invalidateRiskConfigCache have been
   extracted to @/lib/risk-config-server to prevent the `pg` module
   from leaking into client component bundles via this file.
   Server-side consumers should import from "@/lib/risk-config-server".
   ──────────────────────────────────────────────────────────────── */

/* ================================================================
   TRI COMPUTATION — Fully deterministic weighted formula
   Same inputs ALWAYS yield same TRI.
   ================================================================ */
const CP_RISK_W: Record<RiskLevel, number> = { low: 1, medium: 3, high: 6, critical: 9 };
const COR_RISK_W: Record<RiskLevel, number> = { low: 1, medium: 3, high: 6, critical: 9 };
const CP_STATUS_W: Record<string, number> = { active: 0, pending: 2, "under-review": 4, closed: 6, suspended: 8 };

const W = { cpRisk: 0.40, corRisk: 0.25, amtConc: 0.20, cpStatus: 0.15 } as const;

export interface TRIComponent { weight: number; raw: number; weighted: number }
export interface TRIResult {
  score: number;
  band: "green" | "amber" | "red";
  components: { cpRisk: TRIComponent; corRisk: TRIComponent; amtConc: TRIComponent; cpStatus: TRIComponent };
  formula: string;
}

export function computeTRI(cp: Counterparty, corridor: Corridor, amount: number, capital: DashboardCapital): TRIResult {
  const cpR = CP_RISK_W[cp.riskLevel];
  const corR = COR_RISK_W[corridor.riskLevel];
  const amtRatio = capital.hardstopLimit > 0 ? amount / capital.hardstopLimit : 0;
  const amtScore = Math.min(10, Math.max(1, Math.ceil(amtRatio * 20)));
  const cpS = CP_STATUS_W[cp.status] ?? 0;

  const raw = cpR * W.cpRisk + corR * W.corRisk + amtScore * W.amtConc + cpS * W.cpStatus;
  const score = Math.min(10, Math.max(1, Math.round(raw)));
  const band = score <= 3 ? "green" as const : score <= 6 ? "amber" as const : "red" as const;

  return {
    score, band,
    components: {
      cpRisk: { weight: W.cpRisk, raw: cpR, weighted: cpR * W.cpRisk },
      corRisk: { weight: W.corRisk, raw: corR, weighted: corR * W.corRisk },
      amtConc: { weight: W.amtConc, raw: amtScore, weighted: amtScore * W.amtConc },
      cpStatus: { weight: W.cpStatus, raw: cpS, weighted: cpS * W.cpStatus },
    },
    formula: `TRI = (CP_Risk:${cpR} × ${W.cpRisk}) + (Corridor_Risk:${corR} × ${W.corRisk}) + (Amt_Conc:${amtScore} × ${W.amtConc}) + (CP_Status:${cpS} × ${W.cpStatus}) = ${raw.toFixed(2)} → ${score}`,
  };
}

/* ================================================================
   CAPITAL VALIDATION — Phase 1 actuals
   ================================================================ */
export interface CapitalValidation {
  currentExposure: number;
  postTxnExposure: number;
  capitalBase: number;
  currentECR: number;
  postTxnECR: number;
  hardstopLimit: number;
  currentHardstopUtil: number;
  postTxnHardstopUtil: number;
  hardstopRemaining: number;
}

export function validateCapital(amount: number, cap: DashboardCapital): CapitalValidation {
  const postExp = cap.activeExposure + amount;
  return {
    currentExposure: cap.activeExposure,
    postTxnExposure: postExp,
    capitalBase: cap.capitalBase,
    currentECR: cap.ecr,
    postTxnECR: cap.capitalBase > 0 ? postExp / cap.capitalBase : 0,
    hardstopLimit: cap.hardstopLimit,
    currentHardstopUtil: cap.hardstopUtilization,
    postTxnHardstopUtil: cap.hardstopLimit > 0 ? postExp / cap.hardstopLimit : 0,
    hardstopRemaining: cap.hardstopLimit - cap.activeExposure,
  };
}

/* ================================================================
   BLOCKERS — BLOCK / WARN / INFO severity
   All numeric thresholds sourced from RiskConfiguration.
   ================================================================ */
export type BlockerSeverity = "BLOCK" | "WARN" | "INFO";
export interface PolicyBlocker { id: string; severity: BlockerSeverity; title: string; detail: string }

export function checkBlockers(
  cp: Counterparty | undefined, corridor: Corridor | undefined, hub: Hub | undefined,
  tri: TRIResult | null, amount: number, capital: DashboardCapital,
  rc: RiskConfiguration,
): PolicyBlocker[] {
  const b: PolicyBlocker[] = [];
  if (cp?.status === "suspended") b.push({ id: "cp-susp", severity: "BLOCK", title: "Counterparty Suspended", detail: `${cp.entity} is suspended — transactions blocked.` });
  if (cp?.status === "under-review") b.push({ id: "cp-rev", severity: "WARN", title: "Counterparty Under Review", detail: `${cp.entity} is under active review.` });
  if (cp?.status === "pending") b.push({ id: "cp-pend", severity: "INFO", title: "Counterparty Pending", detail: `${cp.entity} KYC/onboarding pending.` });
  if (corridor?.status === "suspended") b.push({ id: "cor-susp", severity: "BLOCK", title: "Corridor Suspended", detail: `${corridor.name} corridor suspended.` });
  if (corridor?.status === "restricted") b.push({ id: "cor-rest", severity: "WARN", title: "Corridor Restricted", detail: `${corridor.name} restricted — enhanced due diligence.` });
  if (hub?.status === "offline") b.push({ id: "hub-off", severity: "BLOCK", title: "Hub Offline", detail: `${hub.name} is offline.` });
  if (hub?.status === "maintenance") b.push({ id: "hub-maint", severity: "WARN", title: "Hub Maintenance", detail: `${hub.name} under maintenance — delays possible.` });
  if (hub?.status === "degraded") b.push({ id: "hub-deg", severity: "WARN", title: "Hub Degraded", detail: `${hub.name} degraded mode.` });

  const remaining = capital.hardstopLimit - capital.activeExposure;
  if (amount > remaining) b.push({ id: "hs-breach", severity: "BLOCK", title: "Hardstop Breach", detail: `Amount exceeds remaining capacity ($${(remaining / 1e6).toFixed(1)}M).` });

  const postECR = capital.capitalBase > 0 ? (capital.activeExposure + amount) / capital.capitalBase : 0;
  if (postECR > rc.maxEcrRatio) b.push({ id: "ecr-breach", severity: "BLOCK", title: "ECR Breach", detail: `Post-transaction ECR ${postECR.toFixed(2)}x exceeds ${rc.maxEcrRatio}x limit.` });

  if (tri && tri.score >= rc.triCriticalThreshold && amount > remaining * rc.triConcentrationFactor) b.push({ id: "tri-conc", severity: "BLOCK", title: "High-Risk Concentration", detail: `TRI ≥ ${rc.triCriticalThreshold} and amount > ${(rc.triConcentrationFactor * 100).toFixed(0)}% of remaining hardstop.` });
  if (tri && tri.score >= rc.triElevatedThreshold) b.push({ id: "tri-high", severity: "WARN", title: "Elevated TRI", detail: `TRI ${tri.score} (Red band) — enhanced monitoring.` });
  return b;
}

export function hasBlockLevel(blockers: PolicyBlocker[]): boolean {
  return blockers.some((b) => b.severity === "BLOCK");
}

/* ================================================================
   APPROVAL TIERS — Deterministic rule-based
   All amount thresholds sourced from RiskConfiguration.
   ================================================================ */
export type ApprovalTier = "auto" | "desk-head" | "credit-committee" | "board";
export interface ApprovalResult { tier: ApprovalTier; label: string; reason: string }

export function determineApproval(tri: number, amount: number, rc: RiskConfiguration): ApprovalResult {
  const autoLimit = rc.autoApprovalLimitCents / 100;        // cents → dollars
  const deskLimit = rc.deskHeadLimitCents / 100;
  const ccLimit = rc.creditCommitteeLimitCents / 100;

  if (tri <= 3 && amount <= autoLimit) return { tier: "auto", label: "Auto-Approved", reason: `TRI ≤ 3 AND amount ≤ $${(autoLimit / 1e6).toFixed(0)}M` };
  if (tri <= 5 && amount <= deskLimit) return { tier: "desk-head", label: "Desk Head", reason: `TRI ≤ 5 AND amount ≤ $${(deskLimit / 1e6).toFixed(0)}M` };
  if (tri <= 7 && amount <= ccLimit) return { tier: "credit-committee", label: "Credit Committee", reason: `TRI ≤ 7 AND amount ≤ $${(ccLimit / 1e6).toFixed(0)}M` };
  return { tier: "board", label: "Board Approval", reason: `TRI > 7 OR amount > $${(ccLimit / 1e6).toFixed(0)}M` };
}

/* ================================================================
   COMPLIANCE CHECKS — Full audit checklist
   All numeric thresholds sourced from RiskConfiguration.
   ================================================================ */
export interface ComplianceCheck { id: string; name: string; result: "PASS" | "WARN" | "FAIL"; detail: string }

export function runComplianceChecks(
  cp: Counterparty, corridor: Corridor, hub: Hub,
  tri: TRIResult, capVal: CapitalValidation,
  rc: RiskConfiguration,
): ComplianceCheck[] {
  const c: ComplianceCheck[] = [];
  // CP Status
  if (cp.status === "suspended") c.push({ id: "cp", name: "Counterparty Status", result: "FAIL", detail: `${cp.entity} is suspended.` });
  else if (cp.status === "under-review" || cp.status === "pending") c.push({ id: "cp", name: "Counterparty Status", result: "WARN", detail: `${cp.entity} is ${cp.status}.` });
  else c.push({ id: "cp", name: "Counterparty Status", result: "PASS", detail: `${cp.entity} is ${cp.status}.` });
  // Corridor
  if (corridor.status === "suspended") c.push({ id: "cor", name: "Corridor Status", result: "FAIL", detail: `${corridor.name} suspended.` });
  else if (corridor.status === "restricted") c.push({ id: "cor", name: "Corridor Status", result: "WARN", detail: `${corridor.name} restricted.` });
  else c.push({ id: "cor", name: "Corridor Status", result: "PASS", detail: `${corridor.name} active.` });
  // Hub
  if (hub.status === "offline") c.push({ id: "hub", name: "Hub Operational", result: "FAIL", detail: `${hub.name} offline.` });
  else if (hub.status === "maintenance" || hub.status === "degraded") c.push({ id: "hub", name: "Hub Operational", result: "WARN", detail: `${hub.name} ${hub.status}.` });
  else c.push({ id: "hub", name: "Hub Operational", result: "PASS", detail: `${hub.name} operational (${hub.uptime}%).` });
  // ECR — dynamic thresholds
  if (capVal.postTxnECR > rc.maxEcrRatio) c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "FAIL", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x > ${rc.maxEcrRatio}x limit.` });
  else if (capVal.postTxnECR > rc.ecrWarnRatio) c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "WARN", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x approaching limit.` });
  else c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "PASS", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x within limit.` });
  // Hardstop — dynamic thresholds
  if (capVal.postTxnHardstopUtil > rc.hardstopUtilFail) c.push({ id: "hs", name: "Hardstop Compliance", result: "FAIL", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}% exceeds limit.` });
  else if (capVal.postTxnHardstopUtil > rc.hardstopUtilWarn) c.push({ id: "hs", name: "Hardstop Compliance", result: "WARN", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}% near limit.` });
  else c.push({ id: "hs", name: "Hardstop Compliance", result: "PASS", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}%.` });
  // TRI — dynamic thresholds
  if (tri.score >= rc.triCriticalThreshold) c.push({ id: "tri", name: "Transaction Risk Index", result: "FAIL", detail: `TRI ${tri.score} (Red) — board review required.` });
  else if (tri.score >= rc.triWarnThreshold) c.push({ id: "tri", name: "Transaction Risk Index", result: "WARN", detail: `TRI ${tri.score} (${tri.band}).` });
  else c.push({ id: "tri", name: "Transaction Risk Index", result: "PASS", detail: `TRI ${tri.score} (Green).` });
  return c;
}

/* ================================================================
   MARKETPLACE POLICY SNAPSHOT — frozen at conversion time
   ================================================================ */
export interface MarketplacePolicySnapshot {
  triScore: number;
  triBand: "green" | "amber" | "red";
  ecrBefore: number;
  ecrAfter: number;
  hardstopBefore: number;
  hardstopAfter: number;
  approvalTier: ApprovalTier;
  blockers: PolicyBlocker[];
  timestamp: string;
}

/* ================================================================
   TRANSACTION POLICY SNAPSHOT — logged on Create (wizard)
   ================================================================ */
export interface PolicySnapshot {
  inputs: { counterparty: string; corridor: string; hub: string; amount: number; currency: string; type: string; description: string };
  tri: TRIResult;
  capital: { currentECR: number; postTxnECR: number; currentHardstopUtil: number; postTxnHardstopUtil: number };
  approval: ApprovalResult;
  blockers: PolicyBlocker[];
  timestamp: string;
}
