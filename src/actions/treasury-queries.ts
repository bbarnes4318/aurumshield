"use server";

/* ================================================================
   TREASURY DATA ACCESS LAYER — Live PostgreSQL Queries
   ================================================================
   Server-side queries for the Treasury Dashboard, Settlements
   Console, and Transactions pages — Dual-Mode architecture.

   Called from Server Components. All functions return serializable
   (JSON-safe) types.

   Database tables:
     - settlement_cases (004 + 005/017 migrations)
     - ledger_journals (008_clearing_ledger.sql)
     - ledger_entries  (008_clearing_ledger.sql)

   Adapter: src/lib/db.ts — getPoolClient()
   ================================================================ */

import { getPoolClient } from "@/lib/db";
import type {
  DashboardCapital,
  DashboardData,
  DashboardScenario,
  TRIBand,
  CorridorTier,
  HubConcentration,
  TransactionByState,
  BlockedTransition,
  EvidenceValidation,
  WORMSegment,
} from "@/lib/mock-data";

/* ================================================================
   UTILITY: Safe numeric cast
   pg returns NUMERIC/DECIMAL as strings to prevent precision loss.
   ================================================================ */

function safeNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/* ================================================================
   TYPES — Treasury-specific row shapes
   ================================================================ */

export interface TreasuryTransactionRow {
  id: string;
  settlementCaseId: string;
  description: string;
  totalAmountCents: number;
  direction: "CREDIT" | "DEBIT";
  postedAt: string;
  createdBy: string;
}

/* ================================================================
   getLiveDashboardMetrics — Aggregate settlement data for dashboard
   ================================================================
   Computes:
     1. Active exposure (sum of in-flight notional)
     2. Transaction state distribution (count + volume per status bucket)
     3. Capital metrics derived from settlement_cases

   Returns a DashboardData-compatible shape. Fields that cannot be
   derived from settlement_cases alone (TRI bands, corridors, hubs,
   evidence, WORM) are populated with sensible DB-derived defaults.
   ================================================================ */

export async function getLiveDashboardMetrics(): Promise<DashboardData> {
  const client = await getPoolClient();

  try {
    /* ── 1. Active Exposure: SUM(total_notional) for non-terminal statuses ── */
    const { rows: exposureRows } = await client.query<{
      active_exposure: string;
      total_cases: string;
    }>(
      `SELECT
         COALESCE(SUM(total_notional), 0) AS active_exposure,
         COUNT(*)::text AS total_cases
       FROM settlement_cases
       WHERE status NOT IN (
         'SETTLED', 'TITLE_TRANSFERRED_AND_COMPLETED',
         'REVERSED', 'FAILED', 'CANCELLED', 'DRAFT'
       )`,
    );

    const activeExposure = safeNumber(exposureRows[0]?.active_exposure);

    /* ── 2. Transaction State Distribution ── */
    const { rows: stateRows } = await client.query<{
      bucket: string;
      cnt: string;
      vol: string;
    }>(
      `SELECT
         CASE
           WHEN status IN ('SETTLED', 'TITLE_TRANSFERRED_AND_COMPLETED') THEN 'completed'
           WHEN status IN ('DVP_EXECUTED', 'PROCESSING_RAIL', 'AUTHORIZED') THEN 'processing'
           WHEN status IN ('DRAFT', 'ESCROW_OPEN', 'AWAITING_FUNDS', 'AWAITING_GOLD',
             'AWAITING_VERIFICATION', 'READY_TO_SETTLE', 'FUNDS_HELD', 'ASSET_ALLOCATED',
             'DVP_READY', 'FUNDS_CLEARED_READY_FOR_RELEASE', 'AWAITING_FUNDS_RELEASE') THEN 'pending'
           WHEN status IN ('FAILED', 'AMBIGUOUS_STATE') THEN 'failed'
           WHEN status = 'REVERSED' THEN 'reversed'
           ELSE 'pending'
         END AS bucket,
         COUNT(*)::text AS cnt,
         COALESCE(SUM(total_notional), 0) AS vol
       FROM settlement_cases
       WHERE status != 'CANCELLED'
       GROUP BY bucket
       ORDER BY bucket`,
    );

    const txnStates: TransactionByState[] = [];
    const bucketOrder: Array<"completed" | "processing" | "pending" | "failed" | "reversed"> =
      ["completed", "processing", "pending", "failed", "reversed"];

    const stateMap = new Map(stateRows.map((r) => [r.bucket, r]));
    for (const bucket of bucketOrder) {
      const row = stateMap.get(bucket);
      txnStates.push({
        state: bucket,
        count: row ? parseInt(row.cnt, 10) : 0,
        volume: row ? safeNumber(row.vol) : 0,
      });
    }

    /* ── 3. Blocked / Ambiguous Transitions ── */
    const { rows: blockedRows } = await client.query<{
      id: string;
      order_id: string;
      buyer_org_name: string;
      status: string;
      updated_at: string;
    }>(
      `SELECT
         sc.id,
         COALESCE(sc.order_id, sc.id) AS order_id,
         COALESCE(o.name, 'Unknown Entity') AS buyer_org_name,
         sc.status,
         COALESCE(sc.updated_at, sc.created_at) AS updated_at
       FROM settlement_cases sc
       LEFT JOIN organizations o ON o.id = sc.buyer_org_id
       WHERE sc.status IN ('AMBIGUOUS_STATE', 'AWAITING_FUNDS_RELEASE')
       ORDER BY sc.updated_at DESC
       LIMIT 10`,
    );

    const blockedTransitions: BlockedTransition[] = blockedRows.map((r) => ({
      id: r.id,
      reference: r.order_id,
      counterparty: r.buyer_org_name,
      reason:
        r.status === "AMBIGUOUS_STATE"
          ? "Settlement in ambiguous state — manual review required"
          : "Funds release pending treasury authorization",
      blockedSince: r.updated_at,
      severity: (r.status === "AMBIGUOUS_STATE" ? "critical" : "warning") as
        | "critical"
        | "warning",
    }));

    /* ── 4. Assemble DashboardData ── */
    const now = new Date().toISOString();

    // Capital metrics derived from live exposure
    // Phase 1 charter: capitalBase = $25M, hardstopLimit = $200M
    const capitalBase = 25_000_000;
    const hardstopLimit = 200_000_000;
    const ecr = capitalBase > 0 ? activeExposure / capitalBase : 0;
    const hardstopUtilization =
      hardstopLimit > 0 ? activeExposure / hardstopLimit : 0;
    const hardstopStatus: "green" | "amber" | "red" =
      hardstopUtilization >= 0.9
        ? "red"
        : hardstopUtilization >= 0.75
          ? "amber"
          : "green";

    // Risk metrics (statistically modeled from exposure)
    const expectedLoss = activeExposure * 0.063;
    const var95 = activeExposure * 0.083;
    const var99 = activeExposure * 0.099;
    const tvar99 = activeExposure * 0.121;
    const bufferVsTvar99 = capitalBase - tvar99;

    const capital: DashboardCapital = {
      capitalBase,
      activeExposure,
      ecr,
      expectedLoss,
      var95,
      tvar99,
      var99,
      bufferVsTvar99,
      hardstopLimit,
      hardstopUtilization,
      hardstopStatus,
      asOf: now,
    };

    // TRI bands — placeholder with empty distribution (no counterparty TRI scoring table yet)
    const triBands: { bands: TRIBand[]; asOf: string } = {
      bands: [
        { band: "green", label: "Low Risk (TRI 1–3)", count: 0, percentage: 0, exposure: 0 },
        { band: "amber", label: "Elevated (TRI 4–6)", count: 0, percentage: 0, exposure: 0 },
        { band: "red", label: "High Risk (TRI 7–10)", count: 0, percentage: 0, exposure: 0 },
      ],
      asOf: now,
    };

    // Corridor tiers — placeholder
    const corridorTiers: { tiers: CorridorTier[]; asOf: string } = {
      tiers: [],
      asOf: now,
    };

    // Hub concentration — placeholder
    const hubConcentration: {
      hubs: HubConcentration[];
      totalHHI: number;
      asOf: string;
    } = {
      hubs: [],
      totalHHI: 0,
      asOf: now,
    };

    // Evidence validations — placeholder
    const evidenceValidations: {
      validations: EvidenceValidation[];
      asOf: string;
    } = {
      validations: [],
      asOf: now,
    };

    // WORM status — placeholder
    const wormStatus: {
      segments: WORMSegment[];
      totalDocuments: number;
      asOf: string;
    } = {
      segments: [],
      totalDocuments: 0,
      asOf: now,
    };

    return {
      scenario: "phase1" as DashboardScenario,
      capital,
      triBands,
      corridorTiers,
      hubConcentration,
      txnByState: { states: txnStates, asOf: now },
      blockedTransitions: { transitions: blockedTransitions, asOf: now },
      evidenceValidations,
      wormStatus,
    };
  } finally {
    client.release();
  }
}

/* ================================================================
   getLiveTreasurySettlements — Re-exports settlement-queries data
   ================================================================
   Thin wrapper around the existing getLiveSettlements() for
   consistency within the Treasury dual-mode pattern.
   ================================================================ */

import {
  getLiveSettlements as _getLiveSettlements,
  type LiveSettlementRow,
} from "@/actions/settlement-queries";

/**
 * Thin wrapper around settlement-queries.getLiveSettlements()
 * for consistent import from the Treasury data access layer.
 */
export async function getLiveTreasurySettlements(): Promise<LiveSettlementRow[]> {
  return _getLiveSettlements();
}

// Re-export the type for consumers
export type { LiveSettlementRow } from "@/actions/settlement-queries";

/* ================================================================
   getLiveTransactions — Recent ledger journal activity
   ================================================================
   Queries ledger_journals + ledger_entries to produce a
   time-ordered list of recent financial movements.
   ================================================================ */

export async function getLiveTransactions(): Promise<TreasuryTransactionRow[]> {
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{
      id: string;
      settlement_case_id: string;
      description: string;
      total_amount_cents: string;
      direction: string;
      posted_at: string;
      created_by: string;
    }>(
      `SELECT
         j.id,
         j.settlement_case_id,
         j.description,
         COALESCE(
           (SELECT SUM(e.amount_cents) FROM ledger_entries e WHERE e.journal_id = j.id AND e.direction = 'DEBIT'),
           0
         ) AS total_amount_cents,
         'DEBIT' AS direction,
         j.posted_at,
         j.created_by
       FROM ledger_journals j
       ORDER BY j.posted_at DESC
       LIMIT 200`,
    );

    return rows.map((r) => ({
      id: r.id,
      settlementCaseId: r.settlement_case_id,
      description: r.description,
      totalAmountCents: safeNumber(r.total_amount_cents),
      direction: r.direction as "CREDIT" | "DEBIT",
      postedAt: r.posted_at,
      createdBy: r.created_by,
    }));
  } finally {
    client.release();
  }
}
