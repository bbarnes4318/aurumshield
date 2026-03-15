"use server";

/* ================================================================
   LIVE SETTLEMENT DATA ACCESS LAYER
   ================================================================
   Server Action for querying live settlement data from PostgreSQL.
   Returns serialized rows matching the SettlementCase shape
   expected by the Settlement Console UI.

   Database: settlement_cases (004_settlement_cases.sql + migrations)
   Adapter: src/lib/db.ts — getPoolClient()
   ================================================================ */

import { getPoolClient } from "@/lib/db";

/* ----------------------------------------------------------------
   TYPES — Serializable Settlement Row
   ----------------------------------------------------------------
   This is the strict subset of SettlementCase fields consumed by
   the settlement console page. All values are JSON-safe primitives
   (no BigInt, no Date objects, no undefined).
   ---------------------------------------------------------------- */

export type SettlementRail = "WIRE" | "RTGS";

export type SettlementStatus =
  | "DRAFT"
  | "ESCROW_OPEN"
  | "AWAITING_FUNDS"
  | "AWAITING_GOLD"
  | "AWAITING_VERIFICATION"
  | "READY_TO_SETTLE"
  | "AUTHORIZED"
  | "PROCESSING_RAIL"
  | "AMBIGUOUS_STATE"
  | "AWAITING_FUNDS_RELEASE"
  | "SETTLED"
  | "REVERSED"
  | "FAILED"
  | "CANCELLED"
  // DvP extended states (005/017 migrations)
  | "FUNDS_HELD"
  | "ASSET_ALLOCATED"
  | "DVP_READY"
  | "DVP_EXECUTED"
  | "FUNDS_CLEARED_READY_FOR_RELEASE"
  | "TITLE_TRANSFERRED_AND_COMPLETED";

export interface LiveSettlementRow {
  id: string;
  orderId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  rail: SettlementRail;
  weightOz: number;
  pricePerOzLocked: number;
  notionalUsd: number;
  status: SettlementStatus;
  openedAt: string;
  updatedAt: string;
  // Extended fields available from DB
  buyerOrgId: string;
  sellerOrgId: string;
  corridorId: string;
  hubId: string;
  vaultHubId: string;
  notionalCents: number;
  currency: string;
}

/* ================================================================
   getLiveSettlements — Primary Query
   ================================================================ */

export async function getLiveSettlements(): Promise<LiveSettlementRow[]> {
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{
      id: string;
      order_id: string;
      listing_id: string;
      buyer_id: string;
      seller_id: string;
      buyer_org_id: string;
      seller_org_id: string;
      corridor_id: string;
      settlement_hub_id: string;
      custody_hub_id: string;
      rail: string;
      weight_oz: string;
      price_per_oz_locked: string;
      total_notional: string;
      status: string;
      opened_at: string;
      updated_at: string;
      currency: string;
    }>(
      `SELECT
         id,
         order_id,
         listing_id,
         buyer_id,
         seller_id,
         COALESCE(buyer_org_id, '') AS buyer_org_id,
         COALESCE(seller_org_id, '') AS seller_org_id,
         COALESCE(corridor_id, '') AS corridor_id,
         COALESCE(settlement_hub_id, '') AS settlement_hub_id,
         COALESCE(custody_hub_id, '') AS custody_hub_id,
         COALESCE(rail, 'WIRE') AS rail,
         COALESCE(weight_oz, 0) AS weight_oz,
         COALESCE(locked_price_per_oz, 0) AS price_per_oz_locked,
         COALESCE(total_notional, 0) AS total_notional,
         status,
         COALESCE(opened_at, created_at) AS opened_at,
         COALESCE(updated_at, created_at) AS updated_at,
         COALESCE(currency, 'USD') AS currency
       FROM settlement_cases
       ORDER BY updated_at DESC
       LIMIT 500`,
    );

    // Map DB snake_case → camelCase with safe numeric casts
    return rows.map((r) => ({
      id: r.id,
      orderId: r.order_id ?? "",
      listingId: r.listing_id ?? "",
      buyerUserId: r.buyer_id ?? "",
      sellerUserId: r.seller_id ?? "",
      buyerOrgId: r.buyer_org_id,
      sellerOrgId: r.seller_org_id,
      corridorId: r.corridor_id,
      hubId: r.settlement_hub_id,
      vaultHubId: r.custody_hub_id,
      rail: (r.rail === "RTGS" ? "RTGS" : "WIRE") as SettlementRail,
      weightOz: safeNumber(r.weight_oz),
      pricePerOzLocked: safeNumber(r.price_per_oz_locked),
      notionalUsd: safeNumber(r.total_notional),
      status: r.status as SettlementStatus,
      openedAt: r.opened_at,
      updatedAt: r.updated_at,
      notionalCents: Math.round(safeNumber(r.total_notional) * 100),
      currency: r.currency,
    }));
  } finally {
    client.release();
  }
}

/* ----------------------------------------------------------------
   Utility: Safe numeric cast
   pg returns NUMERIC/DECIMAL as strings to prevent precision loss.
   We explicitly parse to JS Number here. Any NaN → 0.
   ---------------------------------------------------------------- */
function safeNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}
