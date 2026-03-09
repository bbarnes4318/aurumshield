/* ================================================================
   RETAIL ORDER CREATION — Client-Side Utility
   ================================================================
   Creates a retail order in the marketplace state (localStorage-backed)
   so it is visible to the existing order detail page at /orders/[id].

   IMPORTANT: This is a CLIENT-SIDE function (not "use server") because
   the marketplace state lives in localStorage. Server actions cannot
   access localStorage — they run in a Node.js environment where
   `typeof window === "undefined"`, causing loadMarketplaceState() to
   return fixture defaults and saveMarketplaceState() to no-op.

   The order detail page reads from useOrder() → getOrder() →
   loadMarketplaceState(), so the order MUST be written client-side.
   ================================================================ */

import {
  loadMarketplaceState,
  saveMarketplaceState,
} from "@/lib/marketplace-store";
import type { Order } from "@/lib/mock-data";

/* ---------- Types ---------- */

export interface CreateRetailOrderInput {
  /** Product identifier from the retail catalog */
  productId: string;
  /** Display name for the product */
  productName: string;
  /** Weight per unit in troy ounces */
  weightOzPerUnit: number;
  /** Number of units purchased */
  quantity: number;
  /** Price per unit in USD */
  pricePerUnit: number;
  /** Destination: vault storage or physical delivery */
  destination: "vault" | "ship";
  /** Shipping address (required if destination === "ship") */
  shippingAddress?: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  /** Total logistics fee in USD (from verifyAddressAndQuote) */
  logisticsFeeUsd: number;
  /** Grand total: subtotal + logistics fee */
  grandTotalUsd: number;
}

export interface CreateRetailOrderResult {
  success: true;
  orderId: string;
}

/* ---------- ID Generation ---------- */

function nextOrderId(orders: { id: string }[]): string {
  let max = 0;
  for (const item of orders) {
    const match = item.id.match(/^ord-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `ord-${String(max + 1).padStart(3, "0")}`;
}

/* ---------- Public Function ---------- */

/**
 * Create a retail order and persist it to the marketplace state.
 *
 * This runs CLIENT-SIDE to ensure localStorage is accessible.
 * The order is inserted with status "settlement_pending" since the
 * buyer has initiated a wire transfer.
 */
export function createRetailOrder(
  input: CreateRetailOrderInput,
): CreateRetailOrderResult {
  const state = loadMarketplaceState();

  const orderId = nextOrderId(state.orders);
  const now = new Date().toISOString();
  const totalWeightOz = input.weightOzPerUnit * input.quantity;

  const order: Order = {
    id: orderId,
    listingId: `retail-${input.productId}`,
    reservationId: `retail-res-${orderId}`,
    buyerUserId: "retail-buyer",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    weightOz: totalWeightOz,
    pricePerOz: input.pricePerUnit / input.weightOzPerUnit,
    notional: input.grandTotalUsd,
    status: "settlement_pending",
    createdAt: now,
    policySnapshot: {
      triScore: 1,
      triBand: "green",
      ecrBefore: 6.0,
      ecrAfter: 6.001,
      hardstopBefore: 0.75,
      hardstopAfter: 0.7501,
      approvalTier: "auto",
      blockers: [],
      timestamp: now,
    },
  };

  const nextState = {
    ...state,
    orders: [...state.orders, order],
  };

  saveMarketplaceState(nextState);

  console.log(
    `[AurumShield Retail] Order created: ${orderId} — ` +
      `${input.quantity}x ${input.productName} ` +
      `($${input.grandTotalUsd.toFixed(2)} incl. $${input.logisticsFeeUsd.toFixed(2)} freight)`,
  );

  return {
    success: true,
    orderId,
  };
}
