import type { Counterparty, Corridor, Hub, DashboardCapital, RiskLevel } from "@/lib/mock-data";

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
   ================================================================ */
export type BlockerSeverity = "BLOCK" | "WARN" | "INFO";
export interface PolicyBlocker { id: string; severity: BlockerSeverity; title: string; detail: string }

export function checkBlockers(
  cp: Counterparty | undefined, corridor: Corridor | undefined, hub: Hub | undefined,
  tri: TRIResult | null, amount: number, capital: DashboardCapital
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
  if (postECR > 8) b.push({ id: "ecr-breach", severity: "BLOCK", title: "ECR Breach", detail: `Post-transaction ECR ${postECR.toFixed(2)}x exceeds 8.0x limit.` });

  if (tri && tri.score >= 8 && amount > remaining * 0.5) b.push({ id: "tri-conc", severity: "BLOCK", title: "High-Risk Concentration", detail: `TRI ≥ 8 and amount > 50% of remaining hardstop.` });
  if (tri && tri.score >= 7) b.push({ id: "tri-high", severity: "WARN", title: "Elevated TRI", detail: `TRI ${tri.score} (Red band) — enhanced monitoring.` });
  return b;
}

export function hasBlockLevel(blockers: PolicyBlocker[]): boolean {
  return blockers.some((b) => b.severity === "BLOCK");
}

/* ================================================================
   APPROVAL TIERS — Deterministic rule-based
   ================================================================ */
export type ApprovalTier = "auto" | "desk-head" | "credit-committee" | "board";
export interface ApprovalResult { tier: ApprovalTier; label: string; reason: string }

export function determineApproval(tri: number, amount: number): ApprovalResult {
  if (tri <= 3 && amount <= 25_000_000) return { tier: "auto", label: "Auto-Approved", reason: "TRI ≤ 3 AND amount ≤ $25M" };
  if (tri <= 5 && amount <= 50_000_000) return { tier: "desk-head", label: "Desk Head", reason: "TRI ≤ 5 AND amount ≤ $50M" };
  if (tri <= 7 && amount <= 100_000_000) return { tier: "credit-committee", label: "Credit Committee", reason: "TRI ≤ 7 AND amount ≤ $100M" };
  return { tier: "board", label: "Board Approval", reason: "TRI > 7 OR amount > $100M" };
}

/* ================================================================
   COMPLIANCE CHECKS — Full audit checklist
   ================================================================ */
export interface ComplianceCheck { id: string; name: string; result: "PASS" | "WARN" | "FAIL"; detail: string }

export function runComplianceChecks(cp: Counterparty, corridor: Corridor, hub: Hub, tri: TRIResult, capVal: CapitalValidation): ComplianceCheck[] {
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
  // ECR
  if (capVal.postTxnECR > 8) c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "FAIL", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x > 8.0x limit.` });
  else if (capVal.postTxnECR > 7) c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "WARN", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x approaching limit.` });
  else c.push({ id: "ecr", name: "Capital Adequacy (ECR)", result: "PASS", detail: `Post-txn ECR ${capVal.postTxnECR.toFixed(2)}x within limit.` });
  // Hardstop
  if (capVal.postTxnHardstopUtil > 1) c.push({ id: "hs", name: "Hardstop Compliance", result: "FAIL", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}% exceeds limit.` });
  else if (capVal.postTxnHardstopUtil > 0.9) c.push({ id: "hs", name: "Hardstop Compliance", result: "WARN", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}% near limit.` });
  else c.push({ id: "hs", name: "Hardstop Compliance", result: "PASS", detail: `Post-txn utilization ${(capVal.postTxnHardstopUtil * 100).toFixed(1)}%.` });
  // TRI
  if (tri.score >= 8) c.push({ id: "tri", name: "Transaction Risk Index", result: "FAIL", detail: `TRI ${tri.score} (Red) — board review required.` });
  else if (tri.score >= 5) c.push({ id: "tri", name: "Transaction Risk Index", result: "WARN", detail: `TRI ${tri.score} (${tri.band}).` });
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
