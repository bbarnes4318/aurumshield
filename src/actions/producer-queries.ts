"use server";

/* ================================================================
   PRODUCER DATA ACCESS LAYER — Live PostgreSQL Queries
   ================================================================
   Isolated server-side queries for the Producer Command Center
   and Settlement pages. Called from Server Components.

   All functions return serializable (JSON-safe) types.
   Database: inventory_listings + settlement_cases
   Adapter:  src/lib/db.ts — getPoolClient()
   ================================================================ */

import { getPoolClient } from "@/lib/db";

/* ----------------------------------------------------------------
   TYPES — Serializable Row Shapes
   ---------------------------------------------------------------- */

export type AssetForm = "RAW_DORE" | "GOOD_DELIVERY";

export type InventoryStatus =
  | "REFINERY_PROCESSING"
  | "VAULT_VERIFIED"
  | "IN_TRANSIT";

export interface LiveInventoryRow {
  id: string;
  form: AssetForm;
  weightOz: number;
  estimated: boolean;
  status: InventoryStatus;
}

export type ProducerSettlementStatus =
  | "IN_FLIGHT"
  | "BROADCASTED"
  | "SETTLED"
  | "PENDING";

export type PaymentRail = "FEDWIRE" | "USDT";

export interface LiveProducerSettlement {
  orderId: string;
  amount: number;
  rail: PaymentRail;
  railLabel: string;
  status: ProducerSettlementStatus;
}

export interface ProducerMetrics {
  vaultedGoodDeliveryOz: number;
  doreInRefineryOz: number;
  pendingCapital: number;
  ytdClearedCapital: number;
}

export interface LiveSettlementOrder {
  id: string;
  orderId: string;
  asset: string;
  quantity: number;
  totalWeightOz: number;
  fineness: string;
  lockedPricePerOz: number;
  totalNotional: number;
  offtakerEntity: string;
  offtakerLei: string;
  vaultLocation: string;
  status: string;
  escrowConfirmedAt: string;
  producerId: string;
  /** Funding route: 'fedwire' | 'stablecoin' */
  fundingRoute?: string;
  /** Producer's registered ERC-20 wallet for USDT payouts */
  producerWalletAddress?: string;
}

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
   getProducerInventory — Active inventory for a producer
   ================================================================ */

export async function getProducerInventory(
  producerId: string,
): Promise<LiveInventoryRow[]> {
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{
      id: string;
      form: string;
      total_weight_oz: string;
      actual_refined_weight_oz: string | null;
      estimated_weight_oz: string | null;
      refinery_status: string | null;
    }>(
      `SELECT
         id,
         COALESCE(form, 'GOOD_DELIVERY') AS form,
         COALESCE(total_weight_oz, 0) AS total_weight_oz,
         actual_refined_weight_oz,
         estimated_weight_oz,
         refinery_status
       FROM inventory_listings
       WHERE seller_id = $1
         AND status != 'DELISTED'
       ORDER BY created_at DESC
       LIMIT 100`,
      [producerId],
    );

    return rows.map((r) => {
      const isRawDore = r.form === "RAW_DORE";
      const isRefining =
        isRawDore && r.refinery_status !== "COMPLETED";

      // For RAW_DORE: use estimated_weight_oz while refining,
      // actual_refined_weight_oz when completed.
      // For GOOD_DELIVERY: use total_weight_oz.
      let weightOz: number;
      let estimated: boolean;

      if (isRawDore) {
        if (r.refinery_status === "COMPLETED" && r.actual_refined_weight_oz) {
          weightOz = safeNumber(r.actual_refined_weight_oz);
          estimated = false;
        } else {
          weightOz = safeNumber(r.estimated_weight_oz ?? r.total_weight_oz);
          estimated = true;
        }
      } else {
        weightOz = safeNumber(r.total_weight_oz);
        estimated = false;
      }

      let status: InventoryStatus;
      if (isRefining) {
        status = "REFINERY_PROCESSING";
      } else {
        status = "VAULT_VERIFIED";
      }

      return {
        id: r.id,
        form: (isRawDore ? "RAW_DORE" : "GOOD_DELIVERY") as AssetForm,
        weightOz,
        estimated,
        status,
      };
    });
  } finally {
    client.release();
  }
}

/* ================================================================
   getProducerSettlements — Settlement cases for capital radar
   ================================================================ */

export async function getProducerSettlements(
  producerId: string,
): Promise<LiveProducerSettlement[]> {
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{
      order_id: string;
      total_notional: string;
      funding_route: string | null;
      status: string;
    }>(
      `SELECT
         COALESCE(order_id, id) AS order_id,
         COALESCE(total_notional, 0) AS total_notional,
         funding_route,
         status
       FROM settlement_cases
       WHERE seller_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [producerId],
    );

    return rows.map((r) => {
      // Map settlement_cases.status → the simplified radar status
      const isFedwire = r.funding_route !== "stablecoin";
      const rail: PaymentRail = isFedwire ? "FEDWIRE" : "USDT";
      const railLabel = isFedwire
        ? "COLUMN (FEDWIRE)"
        : "TURNKEY MPC (USDT)";

      let status: ProducerSettlementStatus;
      switch (r.status) {
        case "TITLE_TRANSFERRED_AND_COMPLETED":
        case "SETTLED":
          status = "SETTLED";
          break;
        case "DVP_EXECUTED":
        case "PROCESSING_RAIL":
        case "AUTHORIZED":
          status = "BROADCASTED";
          break;
        case "FUNDS_CLEARED_READY_FOR_RELEASE":
        case "DVP_READY":
        case "ASSET_ALLOCATED":
        case "FUNDS_HELD":
          status = "IN_FLIGHT";
          break;
        default:
          status = "PENDING";
          break;
      }

      return {
        orderId: r.order_id,
        amount: safeNumber(r.total_notional),
        rail,
        railLabel,
        status,
      };
    });
  } finally {
    client.release();
  }
}

/* ================================================================
   getProducerMetrics — Aggregate metrics for the 4-block strip
   ================================================================ */

export async function getProducerMetrics(
  producerId: string,
): Promise<ProducerMetrics> {
  const client = await getPoolClient();

  try {
    // Query 1: Vaulted Good Delivery weight
    const { rows: gdRows } = await client.query<{
      total_oz: string;
    }>(
      `SELECT COALESCE(SUM(
         CASE WHEN actual_refined_weight_oz IS NOT NULL
              THEN actual_refined_weight_oz
              ELSE total_weight_oz
         END
       ), 0) AS total_oz
       FROM inventory_listings
       WHERE seller_id = $1
         AND form = 'GOOD_DELIVERY'
         AND status != 'DELISTED'`,
      [producerId],
    );

    // Query 2: Doré in Refinery (estimated weight)
    const { rows: doreRows } = await client.query<{
      total_oz: string;
    }>(
      `SELECT COALESCE(SUM(
         COALESCE(estimated_weight_oz, total_weight_oz)
       ), 0) AS total_oz
       FROM inventory_listings
       WHERE seller_id = $1
         AND form = 'RAW_DORE'
         AND COALESCE(refinery_status, 'PENDING') != 'COMPLETED'
         AND status != 'DELISTED'`,
      [producerId],
    );

    // Query 3: Pending capital (in-flight + broadcasted)
    const { rows: pendingRows } = await client.query<{
      total_usd: string;
    }>(
      `SELECT COALESCE(SUM(total_notional), 0) AS total_usd
       FROM settlement_cases
       WHERE seller_id = $1
         AND status IN (
           'FUNDS_CLEARED_READY_FOR_RELEASE',
           'DVP_READY',
           'ASSET_ALLOCATED',
           'FUNDS_HELD',
           'DVP_EXECUTED',
           'PROCESSING_RAIL',
           'AUTHORIZED'
         )`,
      [producerId],
    );

    // Query 4: YTD Cleared capital
    const { rows: clearedRows } = await client.query<{
      total_usd: string;
    }>(
      `SELECT COALESCE(SUM(total_notional), 0) AS total_usd
       FROM settlement_cases
       WHERE seller_id = $1
         AND status IN ('TITLE_TRANSFERRED_AND_COMPLETED', 'SETTLED')
         AND settled_at >= date_trunc('year', CURRENT_DATE)`,
      [producerId],
    );

    return {
      vaultedGoodDeliveryOz: safeNumber(gdRows[0]?.total_oz),
      doreInRefineryOz: safeNumber(doreRows[0]?.total_oz),
      pendingCapital: safeNumber(pendingRows[0]?.total_usd),
      ytdClearedCapital: safeNumber(clearedRows[0]?.total_usd),
    };
  } finally {
    client.release();
  }
}

/* ================================================================
   getSettlementCaseForOrder — Single order for Settlement page
   ================================================================
   Joins settlement_cases with inventory_listings to produce the
   full order summary needed by the Settlement Terminal UI.
   ================================================================ */

export async function getSettlementCaseForOrder(
  orderId: string,
): Promise<LiveSettlementOrder | null> {
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{
      id: string;
      order_id: string;
      listing_id: string;
      buyer_id: string;
      seller_id: string;
      status: string;
      total_notional: string;
      weight_oz: string;
      locked_price_per_oz: string;
      opened_at: string;
      funding_route: string | null;
      producer_wallet_address: string | null;
      // Joined from inventory_listings
      form: string;
      purity: string;
      vault_location: string;
      // Joined from organizations (buyer)
      buyer_org_name: string;
      buyer_lei: string;
    }>(
      `SELECT
         sc.id,
         COALESCE(sc.order_id, sc.id) AS order_id,
         sc.listing_id,
         sc.buyer_id,
         sc.seller_id,
         sc.status,
         COALESCE(sc.total_notional, 0) AS total_notional,
         COALESCE(sc.weight_oz, 0) AS weight_oz,
         COALESCE(sc.locked_price_per_oz, 0) AS locked_price_per_oz,
         COALESCE(sc.opened_at, sc.created_at) AS opened_at,
         COALESCE(il.form, 'GOOD_DELIVERY') AS form,
         COALESCE(il.purity, '0.9950') AS purity,
         COALESCE(il.vault_location, 'Zurich FTZ') AS vault_location,
         COALESCE(o.name, 'Unknown Entity') AS buyer_org_name,
         COALESCE(o.legal_entity_identifier, '') AS buyer_lei,
         sc.funding_route,
         sc.producer_wallet_address
       FROM settlement_cases sc
       LEFT JOIN inventory_listings il ON il.id = sc.listing_id
       LEFT JOIN organizations o ON o.id = sc.buyer_org_id
       WHERE sc.id = $1 OR sc.order_id = $1
       LIMIT 1`,
      [orderId],
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    const weightOz = safeNumber(r.weight_oz);
    const lockedPrice = safeNumber(r.locked_price_per_oz);
    const notional = safeNumber(r.total_notional);

    // Derive asset description from form + weight
    const isGD = r.form !== "RAW_DORE";
    const barCount = isGD ? Math.max(1, Math.round(weightOz / 400)) : 1;
    const asset = isGD
      ? `400 oz LBMA Good Delivery Bar`
      : `Raw Doré (Est. ${weightOz.toFixed(0)} oz)`;

    return {
      id: r.id,
      orderId: r.order_id,
      asset,
      quantity: barCount,
      totalWeightOz: weightOz,
      fineness: `≥${(safeNumber(r.purity) * 1000).toFixed(1)}`,
      lockedPricePerOz: lockedPrice,
      totalNotional: notional,
      offtakerEntity: r.buyer_org_name,
      offtakerLei: r.buyer_lei,
      vaultLocation: r.vault_location,
      status: r.status,
      escrowConfirmedAt: r.opened_at,
      producerId: r.seller_id,
      fundingRoute: r.funding_route ?? "fedwire",
      producerWalletAddress: r.producer_wallet_address ?? undefined,
    };
  } finally {
    client.release();
  }
}
